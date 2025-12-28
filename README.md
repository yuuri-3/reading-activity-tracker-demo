# Reading Activity Tracker

This is a code bundle for Reading Activity Tracker v3. The original project is available at https://www.figma.com/design/vUJNw84ODX81ThpaFig1Sz/Reading-Activity-Tracker-v3.

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

## Firebase Hosting（本番ホスティング）

GitHub Pages から Firebase Hosting に移行して、リポジトリを Private 化してもデプロイできる構成です。

### 1) Firebase プロジェクトを用意

- 既存の Firebase プロジェクトを使うか、新規作成します。
- Hosting を有効化します。

### 2) ローカルから手動デプロイ（最短で動作確認）

- `npm ci`
- `npm run build`
- `firebase login`
- `firebase init hosting`（すでに設定済みならスキップ）
- `.firebaserc` の `YOUR_FIREBASE_PROJECT_ID` を自分のプロジェクト ID に置き換え
- `firebase deploy --only hosting`

このリポジトリは SPA なので、Hosting 側は [firebase.json](firebase.json) の rewrite 設定で `/** -> /index.html` にしています。

### 3) GitHub Actions で自動デプロイ

このリポジトリには [deploy-firebase-hosting.yml](.github/workflows/deploy-firebase-hosting.yml) を用意しています。

必要な GitHub 設定:

- Actions Variables: `VITE_FIREBASE_*`（既存の Pages 用と同じで OK）
- Actions Secrets: `FIREBASE_SERVICE_ACCOUNT`

`FIREBASE_SERVICE_ACCOUNT` は Firebase プロジェクトのサービスアカウント JSON をそのまま貼り付けます。

### 4) GitHub Pages を止める

GitHub Pages は使用しません。
