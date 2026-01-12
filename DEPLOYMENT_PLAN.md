# DEPLOYMENT_PLAN

## 概要

本リポジトリは **Firebase Hosting** と **Cloud Functions** を、同じ導線で本番（live）へデプロイします。

- トリガー: `main` への push（GitHub Actions）
- 対象: 本番のみ（live）
- 認証: サービスアカウント（`secrets.FIREBASE_SERVICE_ACCOUNT`）

## CI デプロイフロー（本番）

Workflow: `.github/workflows/deploy-firebase-hosting.yml`

1. 依存関係インストール（root）
2. フロントエンドビルド（`npm run build`）
3. 依存関係インストール（Functions: `npm ci --prefix functions`）
4. Functions ビルド（`npm run --prefix functions build`）
5. **Functions → Hosting** の順でデプロイ

Functions を先にデプロイする理由:
「新しいフロントが、古い Functions に依存して壊れる」状態を避けるためです。

## GitHub Actions の設定

### Secrets

- `FIREBASE_SERVICE_ACCOUNT`: Firebase サービスアカウントの JSON

### Variables

- `VITE_FIREBASE_PROJECT_ID`（Firebase の project ID としても使用）
- その他、フロントのビルドに必要な `VITE_FIREBASE_*` 変数（workflow に記載）

## 失敗時の扱い

- workflow が失敗した場合、リリースは **失敗扱い** とします。
- 途中までデプロイされる可能性はあります（例: Functions はデプロイ済みだが Hosting が未完了）。
  - ただし「新しいフロント + 古い Functions」を避けるため、Functions を先にデプロイする設計としています。

## つまずきポイント（運用メモ）

### GitHub Actions の式/環境変数

- `runner.temp` のようなコンテキストは、記述場所によっては式評価エラーになります。
- `GOOGLE_APPLICATION_CREDENTIALS` は `$RUNNER_TEMP` と `$GITHUB_ENV` を使って設定するのが安全です。

### Cloud Functions デプロイの IAM（`iam.serviceaccounts.actAs`）

Functions（特に 2nd Gen）のデプロイでは、Cloud Build / Cloud Run などの内部処理で service account への `actAs` が必要になることがあります。

- 症状: `Caller is missing permission 'iam.serviceaccounts.actAs'` の 403
- 対応: 対象 service account（例: Default compute service account）に対して、デプロイ実行者（GitHub Actions のサービスアカウント）へ `roles/iam.serviceAccountUser` を付与

## ロールバック（切り戻し）

基本方針: **正常だったリビジョンを再デプロイ** します。

1. `main` 上で問題のコミットを `git revert` などで取り消す
2. `main` に push
3. GitHub Actions が revert 後の状態を再デプロイ

緊急対応で Hosting / Functions だけを戻したい場合は、ローカルで Firebase CLI を使用します。

- Hosting のみ: `firebase deploy --only hosting`
- Functions のみ: `firebase deploy --only functions`

## Firestore Rules（運用）

Firestore Rules はリポジトリで管理します。

- 参照設定: [firebase.json](firebase.json)
- Rules: [firestore.rules](firestore.rules)
- Indexes: [firestore.indexes.json](firestore.indexes.json)

### 反映（Rules を変更したときだけ）

- `firebase deploy --only firestore:rules`

### ロールバック

- 問題のコミットを revert して、同じコマンドで再デプロイする
