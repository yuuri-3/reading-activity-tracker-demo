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
  - [ ] 本番（live）のデプロイ導線で、Hosting と Functions が同一ジョブ/同一リリース単位でデプロイされる
  - [ ] GitHub Actions からの Firebase 認証はサービスアカウントを利用する（既存の Hosting デプロイと同等の方式）
  - [ ] デプロイに失敗した場合は「全体を失敗扱い」とし、リリースは完了しない（片方だけ成功しても成功扱いにしない）
- [ ] 本番で Functions が未デプロイ/旧版の場合に、フロント側が安全側（機能 OFF / 明確な案内）になる
- [ ] 安全側の要件（ゲスト統合フォールバック仕様）
  - [ ] 「ゲスト統合」機能のみを無効化し、統合せずに通常利用は継続できる
  - [ ] 未デプロイ/旧版相当のエラー（例: `not-found` / `unimplemented`）の場合、バックエンド統合処理は実行せず「端末内（フロント側）移行」にフォールバックする + 案内する
  - [ ] 一時的な障害（例: `unavailable` / timeout）の場合、ユーザーに再試行導線を提示する（即座に恒久 OFF にはしない）
  - [ ] 案内は「トースト + 詳細導線」等で表示し、加えて統合ボタン付近にも短い補足（利用できない理由/再試行）を表示できる
- [ ] 旧版検知の要件（事前チェック）
  - [ ] 統合画面を開いたタイミングで、Functions の利用可否を事前に確認する（ヘルスチェック/機能判定）
  - [ ] 事前チェックで「未デプロイ/旧版相当」と判断できる場合は、バックエンド統合は実行可能状態にせず「端末内（フロント側）移行」へフォールバックする + 案内を表示する
  - [ ] 事前チェックで一時的な障害と判断できる場合は、再試行導線を提示する
- [ ] `DEPLOYMENT_PLAN.md` と手順が矛盾しない
  - [ ] `DEPLOYMENT_PLAN.md` が存在しない場合は新規作成し、本チケットの運用方針と一致する
  - [ ] Functions/Hosting のデプロイ順序・失敗時の扱い（どこまでデプロイされるか）が明記されている
  - [ ] ロールバック（切り戻し）手順が明記されている（例: 直前の正常なリリースへ戻す方法 / 失敗時の再実行方法）

## 作業内容

### 1) 運用方針を確定する

- 案 A: CI で Hosting + Functions を同時デプロイ
- 採用: 案 A（CI で Hosting + Functions を同時デプロイ / 本番 live のみ）
- 案 B: Functions は手動デプロイに固定し、フロントはフラグで守る（本番デフォルトを false に寄せる等）

### 2) 方針に沿って CI/手順書を整備する

- GitHub Actions の手順を更新
  - Hosting と同じ導線で Functions もデプロイする（本番 live のみ）
  - サービスアカウント（Secrets）を利用して認証する
  - Functions のビルド手順（例: functions 配下の install/build）を含める
- `DEPLOYMENT_PLAN.md` に「いつ/どうやって Functions をデプロイするか」を明記
  - 本番 live のみを対象とする
  - 使用する認証方式（サービスアカウント）と、Secrets の取り扱い（権限最小化/ローテーション方針）を明記する

## 非ゴール

- Functions のロジック改修（ゲスト統合自体の仕様変更）

## 注意

- Firebase の権限/シークレット（必要なら）を GitHub Actions 側に安全に設定すること
