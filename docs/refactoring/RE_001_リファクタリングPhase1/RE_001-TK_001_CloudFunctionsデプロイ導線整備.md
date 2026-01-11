# P0-RE_001-TK_001 Cloud Functions のデプロイ導線整備

このチケットは、Cloud Functions を使う機能（ゲスト統合）が増えたのに、デプロイ導線が Hosting のみに寄っている状態を解消します。

## ゴール

- 「フロントだけ更新されたが Functions が古い」状態を防ぐ
- 本番でゲスト統合が失敗しないリリース手順を確立する

## 対象

- GitHub Actions: `.github/workflows/deploy-firebase-hosting.yml`
- Firebase: `firebase.json` / Functions デプロイ設定
- Functions: [functions/src/index.ts](../../../functions/src/index.ts)
- フラグ: `VITE_ENABLE_BACKEND_GUEST_MERGE`（CI env / ビルド時設定）

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

達成チェック:

- [ ] Hosting のデプロイと同じ導線で Functions もデプロイできる（または、明確に「手動デプロイ運用」に固定される）
- [ ] 本番で Functions が未デプロイ/旧版の場合に、フロント側が安全側（機能 OFF / 明確な案内）になる
- [ ] `DEPLOYMENT_PLAN.md` と手順が矛盾しない

## 作業内容

### 1) 運用方針を確定する

- 案 A: CI で Hosting + Functions を同時デプロイ
- 案 B: Functions は手動デプロイに固定し、フロントはフラグで守る（本番デフォルトを false に寄せる等）

### 2) 方針に沿って CI/手順書を整備する

- GitHub Actions の手順を更新
- `DEPLOYMENT_PLAN.md` に「いつ/どうやって Functions をデプロイするか」を明記

## 非ゴール

- Functions のロジック改修（ゲスト統合自体の仕様変更）

## 注意

- Firebase の権限/シークレット（必要なら）を GitHub Actions 側に安全に設定すること
