# P1-TK-010 AuthContext を分割し、ゲスト統合ロジックをテスト可能にする

このチケットは、`AuthContext.tsx` に同居しているゲスト統合/互換吸収/secondary app 管理などをモジュール分割し、回帰を防ぎやすくします。

## ゴール

- `AuthContext.tsx` の責務が「認証状態のオーケストレーション」寄りになる
- ゲスト統合の分岐（backend merge / client-side copy / 期限切れ等）がユニットテストで固定できる

## 対象

- 主要対象: [src/app/auth/AuthContext.tsx](../../../src/app/auth/AuthContext.tsx)
- Cloud Functions 呼び出し: [functions/src/index.ts](../../../functions/src/index.ts)
- 新規（案）: `src/app/auth/guestMerge/*`（純粋ロジック/補助関数）

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] `AuthContext.tsx` からゲスト統合の「純粋ロジック」が切り出されている
- [ ] 切り出したロジックにユニットテストがある（成功/失敗/期限切れなど）
- [ ] 既存のログイン（popup/redirect）と統合フローが壊れない

## 作業内容

### 1) 切り出し対象を決める

- 例: データ正規化（`normalizeMigratingDocData`）
- 例: backend merge のリクエスト生成/結果ハンドリング

### 2) 純粋関数化 + テスト

- Firebase SDK に依存しない形で「入力 → 出力」を定義
- Vitest で分岐を固定

### 3) AuthContext 側を薄くする

- UI への通知（toast/ダイアログ）と状態管理に寄せる

## 非ゴール

- ゲスト統合仕様の変更
- Functions の大幅改修

## 注意

- `VITE_ENABLE_BACKEND_GUEST_MERGE` の dev/prod デフォルト方針（`TK-001`）と整合させる
