# P1-TK-021 Storybook の外部依存をモック化して安定稼働（完全 A）

このチケットは、Storybook の Story 表示/操作テストが外部サービス（Firebase 等）に依存せず、PR でも Secrets なしで安定して完走できる状態（= 完全 A）を目指します。

## ゴール

- Storybook の主要 Story が外部サービスに依存せず動作する
- `test-storybook`（Storybook test runner）が PR で安定して完走する（Secrets 不要）

## 対象（例）

- Storybook decorators / Provider: `.storybook/preview.ts`
- Story 用の Provider/Mock: `src/app/stories/**`
- 外部 I/O（Firestore/Auth/Functions/Storage 等）に触れる箇所（Story から到達する範囲）

## 関連

- 元チケット: [TK-003 CI に typecheck + test-storybook を追加](./実装完了/TK-003_CIにtypecheckとtest-storybook追加.md)

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] PR の品質ゲート実行で Secrets が不要
- [ ] Story の実行中にネットワーク/外部サービス依存で落ちない（原則モック/スタブで完結）
- [ ] flaky になりやすい要因（タイマー/アニメーション/非同期初期化）の抑制方針が決まっている

## 作業内容（概要）

- Story 一覧から「外部依存に触れる/触れそう」な Story を棚卸し
- 依存の注入点を整備（例: adapter/port を介して Story ではモック実装を差し込めるようにする）
- 必要なら Storybook 側 decorator で共通モックを提供
- `test-storybook` の安定化（タイムアウト、待機条件、不要な再描画/非決定要素の排除）

## 非ゴール

- 本物の Firebase/Functions と接続しての E2E 保証（別チケットで扱う）
