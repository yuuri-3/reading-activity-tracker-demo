import { useMemo, useState } from "react";

import { Dialog } from "../components/Dialog";
import { Button } from "../components/ui/button";

import {
  acceptOcrHandwrittenMemoConsent,
  getOcrHandwrittenMemoPrivacyPolicyUrl,
  isOcrHandwrittenMemoConsentAccepted,
} from "./ocrHandwrittenMemoConsent";
import { ocrHandwrittenMemoLocalState } from "./ocrHandwrittenMemoLocalState";

export type OcrHandwrittenMemoRootPageProps = {
  onExit: () => void;
};

export function OcrHandwrittenMemoRootPage({
  onExit,
}: OcrHandwrittenMemoRootPageProps) {
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [localStateSnapshot, setLocalStateSnapshot] = useState(() =>
    ocrHandwrittenMemoLocalState.load(),
  );
  const [flowStarted, setFlowStarted] = useState(false);

  const privacyPolicyUrl = useMemo(
    () => getOcrHandwrittenMemoPrivacyPolicyUrl(),
    [],
  );

  const handleStartOcrFlow = () => {
    if (isOcrHandwrittenMemoConsentAccepted()) {
      setFlowStarted(true);
      return;
    }
    setConsentDialogOpen(true);
  };

  return (
    <div className="min-h-screen w-full px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-foreground">
          OCR（手書きメモ）
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          現在は土台のみ実装済みです。以降のチケットで、アルバム選択→OCR→編集→保存を追加します。
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Button variant="outline" onClick={onExit}>
            戻る
          </Button>

          <Button onClick={handleStartOcrFlow}>OCRを開始</Button>
        </div>

        {flowStarted ? (
          <div className="mt-4 rounded-lg border border-border bg-background/60 p-4 text-sm">
            <div className="font-medium">OCRフロー（仮）</div>
            <p className="mt-2 text-muted-foreground">
              次のチケットで「アルバム選択→OCR→編集→保存」がここに追加されます。
            </p>
          </div>
        ) : null}

        <div className="mt-8 rounded-lg border border-border bg-background/60 p-4 text-sm">
          <div className="font-medium">デバッグ情報</div>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              この画面は `VITE_ENABLE_OCR_HANDWRITTEN_MEMO === \"true\"`
              のときのみ有効です。
            </li>
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
        }}
        title="注意"
        cancelLabel="キャンセル"
        confirmLabel="続行"
        onCancel={() => {
          setConsentDialogOpen(false);
        }}
        onConfirm={() => {
          const next = acceptOcrHandwrittenMemoConsent();
          setLocalStateSnapshot(next);
          setConsentDialogOpen(false);
          setFlowStarted(true);
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
