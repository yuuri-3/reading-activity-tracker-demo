# ホーム画面追加時の表示画像（iPhone / Android）設定

この Web アプリを iPhone / Android で「ホーム画面に追加」したときに表示される画像（アプリアイコン）を任意の画像にするには、以下の 2 つを揃えるのが最短です。

- Android / Chrome 系: Web App Manifest（`public/manifest.webmanifest`）の `icons`
- iOS / Safari: `apple-touch-icon`（`public/icons/apple-touch-icon.png`）

## 1) 置くべき画像ファイル

次のファイルを `public/` 配下に配置してください（ファイル名は固定にしています）。

- `public/icons/apple-touch-icon.png`（180x180 PNG）: iOS のホーム画面アイコン
- `public/icons/icon-192.png`（192x192 PNG）: Android のホーム画面アイコン
- `public/icons/icon-512.png`（512x512 PNG）: Android のホーム画面アイコン（高解像度）
- （任意）`public/icons/icon-192-maskable.png`（192x192 PNG）: Android のマスク対応
- （任意）`public/icons/icon-512-maskable.png`（512x512 PNG）: Android のマスク対応

### マスク対応（maskable）について

Android の端末/ランチャーは角丸・円形などに切り抜くことがあります。
`purpose: "maskable"` を用意しておくと、切り抜かれても欠けにくい安全領域を確保できます。

ただし、アイコンのデザインが「円形/角丸に切り抜かれても問題ない」前提で作られている場合は必須ではありません。

## 2) どこで参照されているか

- `index.html` で以下を参照しています
  - `manifest.webmanifest`
  - `icons/apple-touch-icon.png`
- `public/manifest.webmanifest` で Android 用の `icons/*` を参照しています

## 3) 動作確認

- ローカル: `npm run dev`
  - Chrome: DevTools → Application → Manifest でアイコン/マニフェストを確認
- iPhone:
  - Safari で開く → 共有 →「ホーム画面に追加」
- Android:
  - Chrome で開く → メニュー →「ホーム画面に追加」

### 反映されない時の注意

- 端末側がアイコンをキャッシュします。画像を差し替えたら、
  - いったんホーム画面から削除 → 追加し直し
  - 可能ならサイトデータ/キャッシュを削除
    を試してください。

## （任意）起動時のスプラッシュ画像も変えたい場合

iOS の起動スプラッシュ（起動直後の画面）は `apple-touch-startup-image` を複数サイズで用意する必要があります。
要件が固まったら、対応端末範囲（iPhone のみ / iPad 含む）を決めてから追加するのがおすすめです。
