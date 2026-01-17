import { httpsCallable } from "firebase/functions";

import { getFirebaseFunctions } from "../../firebase/firebase";
import {
  classifyCallableError,
  getCallableErrorCode,
  normalizeCallableErrorCode,
  type CallableErrorClass,
} from "../../firebase/functionsError";
import { isOcrHandwrittenMemoEnabled } from "../env";

export type OcrHandwrittenMemoInput = {
  mimeType: string;
  base64: string; // pure base64 (no data URL)
};

export type OcrHandwrittenMemoData = {
  requestId: string;
  text: string;
};

export type OcrHandwrittenMemoError = {
  code?: string;
  class: CallableErrorClass;
  message: string;
  reason?: string;
  retryAfterSeconds?: number;
};

export type OcrHandwrittenMemoResult =
  | { ok: true; data: OcrHandwrittenMemoData }
  | { ok: false; error: OcrHandwrittenMemoError };

type CallableResponse<T> = { data: T };

type HttpsCallableLike = <TReq, TRes>(
  functions: unknown,
  name: string,
) => (data: TReq) => Promise<CallableResponse<TRes>>;

type OcrApiDeps = {
  isEnabled?: () => boolean;
  getFunctions?: () => unknown;
  httpsCallable?: HttpsCallableLike;
};

function pickReason(details: unknown): string | undefined {
  if (!details || typeof details !== "object") return undefined;
  const raw = (details as any).reason;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function pickRetryAfterSeconds(details: unknown): number | undefined {
  if (!details || typeof details !== "object") return undefined;
  const raw = (details as any).retryAfterSeconds;
  const n =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function buildMessage(code?: string, reason?: string): string {
  const c = code ? normalizeCallableErrorCode(code) : undefined;

  // Prefer reason-specific hints when we can.
  if (reason === "payload-too-large") {
    return "画像サイズが大きすぎます。別の画像でお試しください。";
  }

  if (c === "unauthenticated") {
    return "ログインが必要です。";
  }

  if (c === "permission-denied") {
    return "権限がありません。";
  }

  if (c === "invalid-argument") {
    return "入力が不正です。";
  }

  if (c === "resource-exhausted") {
    return "アクセスが集中しています。しばらく待ってからお試しください。";
  }

  if (c === "deadline-exceeded" || c === "unavailable") {
    return "一時的な通信エラーが発生しました。もう一度お試しください。";
  }

  if (c === "not-found" || c === "unimplemented") {
    return "機能が利用できません。アプリの更新が必要な可能性があります。";
  }

  if (c === "internal") {
    return "サーバー側でエラーが発生しました。時間をおいてお試しください。";
  }

  return c ? `OCRに失敗しました（${c}）。` : "OCRに失敗しました。";
}

function normalizeOcrCallableError(err: unknown): OcrHandwrittenMemoError {
  const rawCode = getCallableErrorCode(err);
  const code = rawCode ? normalizeCallableErrorCode(rawCode) : undefined;
  const cls = classifyCallableError(rawCode);

  const asAny = err as any;
  const details = asAny?.details;
  const reason = pickReason(details);
  const retryAfterSeconds = pickRetryAfterSeconds(details);

  return {
    code,
    class: cls,
    message: buildMessage(rawCode, reason),
    reason,
    retryAfterSeconds,
  };
}

export async function callOcrHandwrittenMemo(
  input: OcrHandwrittenMemoInput,
  deps: OcrApiDeps = {},
): Promise<OcrHandwrittenMemoResult> {
  const isEnabled = deps.isEnabled ?? isOcrHandwrittenMemoEnabled;
  if (!isEnabled()) {
    return {
      ok: false,
      error: {
        class: "other",
        message: "OCR機能は現在無効です。",
        reason: "disabled",
      },
    };
  }

  try {
    const getFunctions = deps.getFunctions ?? getFirebaseFunctions;
    const functions = getFunctions();

    const callableFactory = (deps.httpsCallable ??
      (httpsCallable as unknown as HttpsCallableLike)) as HttpsCallableLike;
    const callable = callableFactory<
      OcrHandwrittenMemoInput,
      OcrHandwrittenMemoData
    >(functions, "ocrHandwrittenMemo");

    const res = await callable(input);
    const data = (res.data ?? {}) as Partial<OcrHandwrittenMemoData>;
    const requestId = typeof data.requestId === "string" ? data.requestId : "";
    const text = typeof data.text === "string" ? data.text : "";

    if (!requestId || !text) {
      return {
        ok: false,
        error: {
          class: "other",
          message: "OCRの結果が不正です。もう一度お試しください。",
          reason: "invalid-response",
        },
      };
    }

    return { ok: true, data: { requestId, text } };
  } catch (err) {
    return { ok: false, error: normalizeOcrCallableError(err) };
  }
}
