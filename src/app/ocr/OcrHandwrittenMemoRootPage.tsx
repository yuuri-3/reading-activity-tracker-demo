import { Button } from "../components/ui/button";

export type OcrHandwrittenMemoRootPageProps = {
  onExit: () => void;
};

export function OcrHandwrittenMemoRootPage({
  onExit,
}: OcrHandwrittenMemoRootPageProps) {
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
        </div>

        <div className="mt-8 rounded-lg border border-border bg-background/60 p-4 text-sm">
          <div className="font-medium">デバッグ情報</div>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              この画面は `VITE_ENABLE_OCR_HANDWRITTEN_MEMO === \"true\"`
              のときのみ有効です。
            </li>
            <li>ローカル状態キー: yomzoy:ocrHandwrittenMemoState:v1</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
