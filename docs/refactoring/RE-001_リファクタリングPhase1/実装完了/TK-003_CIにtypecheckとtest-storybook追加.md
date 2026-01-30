# P0-TK-003 CI に typecheck + test-storybook を追加

このチケットは、現状 build→deploy のみの CI に「最低限の品質ゲート」を追加し、回帰を早期検知できるようにします。

## ゴール

- main 反映前（= deploy 前）に `npm run typecheck` と `npm run test-storybook` が通ること
- Storybook story tests（Storybook test runner）を品質ゲートとして運用できる状態にする

## 背景（非エンジニア向け）

このチケットで追加する `test-storybook` は、アプリの「UI 部品カタログ（Storybook）」に登録されている各部品（ボタン、ダイアログ、ページなど）が、最低限ちゃんと表示・動作するかを自動で確認するための品質ゲートです。

- 目的: UI の回帰（表示が崩れる、画面が真っ白になる、操作でエラーが出る等）をデプロイ前に検知して止める
- 実行内容（方針）: Storybook test runner により各 Story をブラウザ（Playwright/Chromium）で起動し、レンダリング・操作を行う
  - ロジック/設定など UI 以外のテストはこれまで通り Vitest（`npm run test`）で運用し、UI の Story テストのみ Storybook test runner に分離する（一般的なプロジェクト構成に寄せる）
  - そのため CI では Chromium（ブラウザ）を用意する必要があります（例: `npx playwright install --with-deps chromium`）

## 「何をチェックするか」はどうやって決まる？

Storybook のテストは、基本的に「どの Story に、どんな操作・期待値を定義するか」でチェック項目が決まります。

### チェック項目の決まり方（仕組み）

- 最低限の共通チェック（スモーク）
  - 各 Story がブラウザ上でレンダリングでき、実行中に例外で落ちないこと
  - これだけでも「画面が真っ白になる」「レンダリング時にクラッシュする」系の回帰を拾えます
- 追加のチェック（重要なものだけ厚くする）
  - Story 側で `play` を定義し、ユーザー操作（入力、クリック等）を再現する
  - さらに必要な場合は `expect` で「この文言が出る」「このボタンが押せる」などの期待値（アサーション）を追加する

※ Storybook 全体の共通設定（decorators/parameters 等）は `.storybook/preview.ts` に集約され、テストでもそれを前提に動作します。

### チェック項目の決め方（運用）

チェックを増やすほど品質は上がりますが、実行時間・メンテコストも増えます。初期運用としては次の方針が現実的です。

- まずは「全 Story が落ちずに表示できる」を品質ゲートにする（広く浅く）
- ユーザー影響が大きい/壊れやすい箇所だけ、`play` + `expect` で操作と期待値を追加する（重要箇所を深く）
- 追加対象の判断基準例
  - 直近で不具合が出た画面・コンポーネント
  - 新規開発・仕様変更が多い画面
  - 認証/保存/削除など、失敗すると影響が大きい導線

## 対象

- GitHub Actions: `.github/workflows/deploy-firebase-hosting.yml`
- GitHub Actions（新規追加想定）: `.github/workflows/ci-quality-gates.yml`
- scripts: [package.json](../../../package.json)
- Storybook 設定: [.storybook/main.ts](../../../.storybook/main.ts), [.storybook/preview.ts](../../../.storybook/preview.ts)
- Storybook test runner 設定（新規追加想定）: `.storybook/test-runner.ts`

## 実装状況

Status: ✅ 実装完了

## 受け入れ条件

達成チェック:

- [x] CI 上で `npm ci` → `npm run typecheck` → `npm run test-storybook` が動く
- [x] 品質ゲートに落ちた変更は原則デプロイされない（PR の必須チェックとして運用する）
- [x] 直 push / ブランチ保護の一時解除があり得る運用の場合、デプロイ用ワークフロー側にも `typecheck` を入れ「型エラー等の明確な事故」はデプロイ手前で確実に止まる
- [x] PR でも `typecheck` と `test-storybook` が実行され、早期に回帰検知できる
- [x] ブランチ保護で品質ゲートを必須チェックにし、管理者のみ緊急時に一時的な override を許可する
- [x] `npm run test-storybook` が Storybook test runner として実行される（Vitest の `--project=storybook` ではない）
- [x] Storybook test runner に必要な Playwright Chromium の導入が CI に含まれている
- [x] PR の品質ゲートは Secrets を必須にせず完走できる（外部サービス依存はモック/スタブで回避）
- [x] 外部連携（本物の Firebase/Functions 等）まで含めた保証は本チケットの範囲外であることが明記されている

## 作業内容

### 0) ワークフロー方針（PR でも回す）

#### 推奨方針（まずは運用性重視、必要なら強化）

- まずは「品質ゲート（typecheck/test-storybook）」をデプロイ用ワークフローとは分離し、PR と `push: main` で回す
  - ブランチ保護で必須チェックにし、通常運用では「通らないとマージできない」状態にする（= 早期検知）
- ただし次のいずれかが現実的に起こり得る場合は、デプロイ用ワークフロー側にも **最低限 `typecheck`** を入れて二重化する
  - `main` への直 push があり得る
  - 管理者 override を含め、ブランチ保護を一時的に外す可能性がある
  - 目的: 「型エラー等の明確な事故」だけはデプロイ手前で確実に止める

※ `test-storybook` はブラウザ起動を伴い不安定要因になりやすいため、初期は PR 品質ゲート中心で段階導入する（安定してきたらデプロイ側へ統合も検討）。

上記方針に基づく具体案:

- 品質ゲート: `.github/workflows/ci-quality-gates.yml` を `pull_request` と `push: main` で起動
- デプロイ: 従来通り `push: main` のみ（デプロイ事故を防ぐ）

### 1) CI にテストステップを追加

- `npm run typecheck`
- `npm run test-storybook`
- （運用上必要なら）デプロイ用ワークフローにも `npm run typecheck` を追加する

実装:

- 品質ゲート: `.github/workflows/ci-quality-gates.yml`
- デプロイ: `.github/workflows/deploy-firebase-hosting.yml`（`typecheck` を追加）

### 2) Playwright Chromium を CI で用意

- 例: `npx playwright install --with-deps chromium`（CI 内）

### 3) Storybook test runner へ移行（スクリプト/設定）

- 依存追加（最小）
  - `@storybook/test-runner`
- `package.json` の `test-storybook` を Storybook test runner の実行に変更
  - 例: `test-storybook --url http://127.0.0.1:6006`
- 必要に応じて `.storybook/test-runner.ts` を追加し、タイムアウトや安定化の設定を行う

※ 既存の Vitest browser mode（`vitest --project=storybook`）向け設定は、移行後に不要になれば別チケットで整理する（このチケットでは「CI にゲートを追加して運用できる状態」を優先）。

→ 整理チケット: [TK-023 `test-storybook` 移行後の Vitest（storybook project）設定整理](実装完了/TK-023_test-storybook移行後のVitest設定整理.md)

### 4) Storybook を CI で起動してからテストを実行

- CI 上で Storybook を起動し、起動完了を待ってから `npm run test-storybook` を実行する
  - 追加パッケージを増やさない場合は、bash でポート待ち（`curl` ループ等）を行う

### 5) 実行時間の最適化（必要なら）

- キャッシュ方針（npm cache / Playwright cache）を検討

### 6) CI の環境変数方針（VITE\_\*）

- 方針（最低限 A）: PR でも安定して回すため、Storybook の UI テストは外部サービスに依存しない（モック/スタブで完結させる）
  - 例: Firebase へ実接続しない／ネットワークに依存しない形で Story を組む
- ただし移行途上で `import.meta.env` 参照が原因で落ちる場合に限り、テスト実行に必要な `VITE_*` は「ダミー値」で渡せるようにする
  - 目的は“外部連携の検証”ではなく、“UI が落ちずに表示・操作できる”ことの回帰検知
  - Secrets を必須にしない（PR でも回すため）

## Further Consideration（別チケットで対応）

- 完全 A（主要 Story を外部依存なしで安定稼働）に向けたモック/依存注入の整理
  - チケット: [TK-021 Storybook の外部依存をモック化して安定稼働（完全 A）](TK-021_Storybook外部依存をモック化して安定稼働（完全A）.md)
- 外部連携まで含めた保証（E2E / エミュレータ / ステージング検証など）の方針決定と導入
  - チケット: [TK-022 外部連携まで含めた保証（E2E/エミュレータ/ステージング）の方針決定と導入](TK-022_E2E保証（エミュレータ・ステージング含む）の方針決定と導入.md)

## 非ゴール

- ESLint/Prettier の導入（別チケット）

## 注意

- 初回は CI 実行時間が伸びる可能性あり（Playwright/Chromium のセットアップのため）
