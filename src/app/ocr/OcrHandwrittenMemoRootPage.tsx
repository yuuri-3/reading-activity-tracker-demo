import { useEffect, useMemo, useRef, useState } from "react";

import { Dialog } from "../components/Dialog";
import { Button } from "../components/ui/button";
import { NeumorphicTextarea } from "../components/NeumorphicTextarea";

import {
  acceptOcrHandwrittenMemoConsent,
  getOcrHandwrittenMemoPrivacyPolicyUrl,
  isOcrHandwrittenMemoConsentAccepted,
} from "./ocrHandwrittenMemoConsent";
import { ocrHandwrittenMemoLocalState } from "./ocrHandwrittenMemoLocalState";
import {
  callOcrHandwrittenMemo,
  type OcrHandwrittenMemoResult,
} from "./api/ocrHandwrittenMemo";

export type OcrHandwrittenMemoRootPageProps = {
  onExit: () => void;
};

export function OcrHandwrittenMemoRootPage({
  onExit,
}: OcrHandwrittenMemoRootPageProps) {
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [pendingOcrStart, setPendingOcrStart] = useState(false);
  const [localStateSnapshot, setLocalStateSnapshot] = useState(() =>
    ocrHandwrittenMemoLocalState.load(),
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [lastOcrSourceId, setLastOcrSourceId] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<{
    code?: string;
    reason?: string;
    requestId?: string;
  } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [ocrFailedSourceId, setOcrFailedSourceId] = useState<string | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const privacyPolicyUrl = useMemo(
    () => getOcrHandwrittenMemoPrivacyPolicyUrl(),
    [],
  );

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];

  const hasSelectedImage = !!selectedFile;
  const shouldShowReplaceNotice =
    !!ocrText && !!selectedFileId && selectedFileId !== lastOcrSourceId;
  const isOcrDisabled =
    !hasSelectedImage ||
    isRunning ||
    (ocrFailedSourceId !== null && ocrFailedSourceId === selectedFileId);

  useEffect(() => {
    return () => {
      if (selectedFileUrl) {
        URL.revokeObjectURL(selectedFileUrl);
      }
    };
  }, [selectedFileUrl]);

  const buildFileId = (file: File) =>
    `${file.name}-${file.size}-${file.lastModified}`;

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorMessage(
        "対応していない画像形式です。JPEG または PNG を選んでください。",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(
        "画像サイズが大きすぎます（10MB まで）。別の画像を選んでください。",
      );
      return;
    }

    setErrorMessage(null);
    setErrorDetail(null);
    setOcrFailedSourceId(null);

    const nextUrl = URL.createObjectURL(file);
    setSelectedFile((prev) => {
      if (prev && selectedFileUrl) {
        URL.revokeObjectURL(selectedFileUrl);
      }
      return file;
    });
    setSelectedFileUrl(nextUrl);
    setSelectedFileId(buildFileId(file));
  };

  const readAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const base64 = result.includes(",") ? result.split(",")[1] : "";
        if (!base64) {
          reject(new Error("empty-base64"));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("file-read-failed"));
      reader.readAsDataURL(file);
    });

  const toOcrErrorMessage = (error: {
    code?: string;
    reason?: string;
    message: string;
  }) => {
    if (error.reason === "payload-too-large") {
      return "画像サイズが大きすぎます（10MB まで）。別の画像を選んでください。";
    }

    if (
      error.reason === "app-check-required" ||
      error.reason === "app-check-invalid" ||
      error.code === "permission-denied"
    ) {
      return "アプリチェックの設定が必要です。";
    }

    if (error.message && error.message.trim()) {
      return error.message;
    }

    return "読み取りに失敗しました。画像を選び直してください。";
  };

  const runOcr = async () => {
    if (!selectedFile) return;

    setIsRunning(true);
    setErrorMessage(null);
    setErrorDetail(null);

    try {
      const base64 = await readAsBase64(selectedFile);
      const res = await callOcrHandwrittenMemo({
        mimeType: selectedFile.type,
        base64,
      });

      if (res.ok) {
        setOcrText(res.data.text);
        setLastOcrSourceId(selectedFileId ?? null);
        setOcrFailedSourceId(null);
      } else {
        const err = res as Extract<OcrHandwrittenMemoResult, { ok: false }>;
        setErrorMessage(toOcrErrorMessage(err.error));
        setErrorDetail({
          code: err.error.code,
          reason: err.error.reason,
          requestId: err.error.requestId,
        });
        if (import.meta.env.DEV) {
          console.error("OCR failed", err.error);
        }
        setOcrFailedSourceId(selectedFileId ?? null);
      }
    } catch {
      setErrorMessage("読み取りに失敗しました。画像を選び直してください。");
      setErrorDetail(null);
      setOcrFailedSourceId(selectedFileId ?? null);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStartOcr = () => {
    if (isOcrDisabled) return;

    if (isOcrHandwrittenMemoConsentAccepted()) {
      void runOcr();
      return;
    }
    setPendingOcrStart(true);
    setConsentDialogOpen(true);
  };

  return (
    <div className="min-h-screen w-full px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-foreground">
          OCR（手書きメモ）
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          アルバムの画像を選択して文字を読み取り、結果を編集できます。
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Button variant="outline" onClick={onExit}>
            戻る
          </Button>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-background/60 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isRunning}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  handleFileChange(file);
                  event.currentTarget.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isRunning}
                onClick={() => fileInputRef.current?.click()}
              >
                {hasSelectedImage ? "画像を選び直す" : "画像を選択"}
              </Button>
              <Button
                type="button"
                onClick={handleStartOcr}
                disabled={isOcrDisabled}
              >
                OCRを実行
              </Button>
            </div>

            {!hasSelectedImage ? (
              <p className="text-xs text-muted-foreground">
                画像を選択してください
              </p>
            ) : null}

            {isRunning ? (
              <p className="text-xs text-muted-foreground">
                読み取り中です。しばらくお待ちください…
              </p>
            ) : null}

            {shouldShowReplaceNotice ? (
              <p className="text-xs text-muted-foreground">
                新しい画像を選択しました。OCR
                を実行するとテキストが置き換わります。
              </p>
            ) : null}

            {errorMessage ? (
              <div className="space-y-1">
                <p className="text-xs text-destructive">{errorMessage}</p>
                {errorDetail?.requestId ||
                errorDetail?.code ||
                errorDetail?.reason ? (
                  <p className="text-[11px] text-muted-foreground">
                    {errorDetail?.requestId
                      ? `ID: ${errorDetail.requestId}`
                      : null}
                    {errorDetail?.code ? ` / code: ${errorDetail.code}` : null}
                    {errorDetail?.reason
                      ? ` / reason: ${errorDetail.reason}`
                      : null}
                  </p>
                ) : null}
              </div>
            ) : null}

            {selectedFileUrl ? (
              <div className="overflow-hidden rounded-[12px] border border-border bg-background">
                <img
                  src={selectedFileUrl}
                  alt="選択した画像のプレビュー"
                  className="h-auto w-full object-contain"
                />
              </div>
            ) : null}

            <div>
              <p className="text-sm font-medium text-foreground">
                読み取り結果
              </p>
              <NeumorphicTextarea
                className="mt-2"
                placeholder="OCR結果がここに表示されます"
                value={ocrText}
                onChange={(event) => setOcrText(event.target.value)}
                rows={6}
                autoResize
                disabled={isRunning}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-background/60 p-4 text-sm">
          <div className="font-medium">デバッグ情報</div>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>この画面は `VITE_FEATURE_OCR === "1"` のときのみ有効です。</li>
            <li>ローカル状態キー: yomzoy:ocrHandwrittenMemoState:v1</li>
            <li>
              consentAccepted: {String(localStateSnapshot.consentAccepted)}
            </li>
          </ul>
        </div>
      </div>

      <Dialog
        open={consentDialogOpen}
        onOpenChange={(open) => {
          if (open) return;
          setConsentDialogOpen(false);
          setPendingOcrStart(false);
        }}
        title="注意"
        cancelLabel="キャンセル"
        confirmLabel="続行"
        onCancel={() => {
          setConsentDialogOpen(false);
          setPendingOcrStart(false);
        }}
        onConfirm={() => {
          const next = acceptOcrHandwrittenMemoConsent();
          setLocalStateSnapshot(next);
          setConsentDialogOpen(false);
          if (pendingOcrStart) {
            setPendingOcrStart(false);
            void runOcr();
          }
        }}
      >
        <div className="flex flex-col gap-3 text-sm leading-6 text-foreground">
          <p>
            画像は外部サービスに送信して文字認識します（画像は保存しません）。個人情報が写り込まないようご注意ください。
          </p>
          <a
            href={privacyPolicyUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="w-fit text-primary underline underline-offset-4"
          >
            プライバシーポリシー
          </a>
        </div>
      </Dialog>
    </div>
  );
}
