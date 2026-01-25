import { normalizeCallableErrorCode } from "../../firebase/functionsError";

export type GuestMergeCounts = {
  tags: number;
  books: number;
  records: number;
};

export type PrepareGuestMergeResult = {
  requestId: string;
  secret: string;
  expiresAt: string;
};

export type GuestMergeBackendStatus =
  | "available"
  | "missing"
  | "temporary"
  | "error";

export type GuestMergeStrategy = "backend" | "client";

export type GuestMergeFailureKind =
  | "expired"
  | "permission"
  | "retryable"
  | "unknown";

export function isBackendGuestMergeEnabled(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") return value === "true";
  return false;
}

export function decideGuestMergeStrategy(params: {
  flagEnabled: boolean;
  backendStatus: GuestMergeBackendStatus;
}): GuestMergeStrategy {
  if (params.flagEnabled && params.backendStatus === "available") {
    return "backend";
  }
  return "client";
}

export function normalizePrepareGuestMergeResult(
  raw: unknown,
): PrepareGuestMergeResult {
  const data = (raw ?? {}) as Record<string, unknown>;
  const requestId = typeof data.requestId === "string" ? data.requestId : "";
  const secret = typeof data.secret === "string" ? data.secret : "";
  const expiresAt = typeof data.expiresAt === "string" ? data.expiresAt : "";

  if (!requestId || !secret) {
    throw new Error("統合準備に失敗しました");
  }

  return { requestId, secret, expiresAt };
}

function normalizeCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export function normalizePreviewGuestMergeCounts(
  raw: unknown,
): GuestMergeCounts {
  const data = (raw ?? {}) as Record<string, unknown>;
  const counts = (data.counts ?? {}) as Record<string, unknown>;
  return {
    tags: normalizeCount(counts.tags),
    books: normalizeCount(counts.books),
    records: normalizeCount(counts.records),
  };
}

export function classifyGuestMergeError(code?: string): GuestMergeFailureKind {
  if (!code) return "unknown";
  const normalized = normalizeCallableErrorCode(code);

  if (normalized === "deadline-exceeded") return "expired";
  if (normalized === "permission-denied") return "permission";
  if (normalized === "unavailable" || normalized === "resource-exhausted") {
    return "retryable";
  }
  return "unknown";
}

export function formatGuestMergeExecuteErrorMessage(code?: string): string {
  const kind = classifyGuestMergeError(code);

  if (kind === "expired") {
    return "統合の有効期限が切れました。もう一度やり直してください。";
  }
  if (kind === "permission") {
    return "統合の権限が確認できませんでした。もう一度お試しください。";
  }
  if (kind === "retryable") {
    return "統合に失敗しました。時間をおいて再試行してください。";
  }

  return code
    ? `統合に失敗しました（${code}）。もう一度お試しください。`
    : "統合に失敗しました。もう一度お試しください。";
}
