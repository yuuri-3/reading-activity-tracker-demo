# Yomzoy

This is a code bundle for Yomzoy. The original project is available at https://www.figma.com/design/vUJNw84ODX81ThpaFig1Sz/Reading-Activity-Tracker-v3.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Storybook

Run `npm run storybook` to start Storybook.

Run `npm run build-storybook` to build a static Storybook.

## Firebase

このアプリは Firebase（Google ログイン + Firestore）を使います。

- 必要な設定値（`VITE_FIREBASE_*`）は `.env.example` を参照してください。
- 本番（CI）でデプロイする場合は、GitHub の Actions Variables に同じ `VITE_FIREBASE_*` を登録します。

### ローカル起動（`.env.local`）

1. `.env.example` をコピーして `.env.local` を作成
   - `cp .env.example .env.local`
2. `.env.local` に Firebase の Web 設定値（`VITE_FIREBASE_*`）を設定
   - Firebase Console → Project settings → Your apps → Web app の設定を参照
3. 必要に応じて機能フラグを設定
   - 例: `VITE_ENABLE_OCR_HANDWRITTEN_MEMO=true`

※ `VITE_*` はフロントに埋め込まれる値のため、サービスアカウントなどのシークレットは入れないでください。

## Firebase Hosting（本番ホスティング）

本番ホスティングは Firebase Hosting を使います。

### 1 Firebase プロジェクトを用意

- 既存の Firebase プロジェクトを使うか、新規作成します。
- Hosting を有効化します。

### 2 ローカルから手動デプロイ（最短で動作確認）

- `npm ci`
- `npm run build`
- `firebase login`
- `firebase init hosting`（すでに設定済みならスキップ）
- `.firebaserc` の `YOUR_FIREBASE_PROJECT_ID` を自分のプロジェクト ID に置き換え
- `firebase deploy --only hosting`

このリポジトリは SPA なので、Hosting 側は [firebase.json](firebase.json) の rewrite 設定で `/** -> /index.html` にしています。

### 3 GitHub Actions で自動デプロイ

このリポジトリには [deploy-firebase-hosting.yml](.github/workflows/deploy-firebase-hosting.yml) を用意しています。

必要な GitHub 設定:

`FIREBASE_SERVICE_ACCOUNT` は Firebase プロジェクトのサービスアカウント JSON をそのまま貼り付けます。

#### 注意: firebase-tools は固定バージョン

CI では `firebase-tools` を固定バージョンで実行します（`@latest` にすると、ツール側の更新で急に必要権限/API が増えてデプロイが落ちることがあるため）。

- 固定値は [deploy-firebase-hosting.yml](.github/workflows/deploy-firebase-hosting.yml) の `FIREBASE_TOOLS_VERSION`

## Cloudflare Tunnel（プレビュー公開）

Cloudflare Tunnel でプレビューを公開するために必要なコマンドは以下の 2 つです（別ターミナルで併行実行）。

```
cloudflared tunnel run my-preview
npm run build && npm run preview -- --host --port 4173
```
