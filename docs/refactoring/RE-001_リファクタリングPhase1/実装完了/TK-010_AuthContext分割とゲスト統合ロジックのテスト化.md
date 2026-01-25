# P1-TK-010 AuthContext を分割し、ゲスト統合ロジックをテスト可能にする

このチケットは、`AuthContext.tsx` に同居しているゲスト統合/互換吸収/secondary app 管理などをモジュール分割し、回帰を防ぎやすくします。

## ゴール

- `AuthContext.tsx` の責務が「認証状態のオーケストレーション」寄りになる
- ゲスト統合の分岐（backend merge / client-side copy / 期限切れ等）がユニットテストで固定できる

## 対象

- 主要対象: [src/app/auth/AuthContext.tsx](../../../src/app/auth/AuthContext.tsx)
- Cloud Functions 呼び出し: [functions/src/index.ts](../../../functions/src/index.ts)
- 新規（案）: `src/app/auth/guestMerge/*`（純粋ロジック/補助関数）
- 統合テスト: [src/app/firebase/guestMerge.integration.test.ts](../../../src/app/firebase/guestMerge.integration.test.ts)

## 実装状況

Status: ✅ 完了

## 受け入れ条件

- [x] `AuthContext.tsx` からゲスト統合の純粋ロジックが `src/app/auth/guestMerge/*` に切り出されている
- [x] 切り出したロジックにユニットテストがある（成功/失敗/期限切れ/権限不足などの網羅ケース）
- [x] backend merge の統合テストがエミュレータで実行できる
- [x] 既存のログイン（popup/redirect）と統合フローが既存の動作を維持している

## 作業内容

### 0) 決定事項

- テストケースは「実運用網羅」（backend merge 成功/失敗、client-side copy 成功/失敗、期限切れ、重複データ、権限不足など）で固定する
- backend merge の純粋化範囲は「payload 生成/response 正規化 + 失敗理由の分類（retry 可否/ユーザー通知文言）」まで含める
- 純粋関数は Firebase SDK 依存を排除し、入力 → 出力が決まるロジックのみを対象とする
- SDK/外部依存を含む統合テストは本チケットで実施する（旧 TK-026 を統合）

### 1) 切り出し対象を決める

- 例: データ正規化（`normalizeMigratingDocData`）
- 例: backend merge のリクエスト生成/結果ハンドリング

#### 切り出し候補（`AuthContext.tsx` 内）

- データ正規化系（純粋）
  - `toIsoStringMaybe`
  - `normalizeString` / `normalizeStringArray` / `normalizeNumber`
  - `normalizeMigratingDocData`
- ゲスト統合の分岐・判断（純粋）
  - backend merge 使用可否の判定（環境フラグ・backend status を入力にした判断）
  - prepare/preview/execute の入出力整形
  - 失敗理由の分類（retry 可否・ユーザー通知文言の決定）
- カウント/表示データの組み立て（純粋）
  - `counts` の集計、fallback 用の表示テキスト/メタデータ生成
- それ以外の副作用を含む処理（AuthContext 側に残す）
  - Firebase Auth / Firestore 操作
  - toast/ダイアログ通知
  - secondary app の生成/破棄

### 2) 純粋関数化 + テスト

- Firebase SDK に依存しない形で「入力 → 出力」を定義
- Vitest で分岐を固定

### 3) AuthContext 側を薄くする

- UI への通知（toast/ダイアログ）と状態管理に寄せる

### 4) 統合テスト（旧 TK-026）

#### シナリオ定義

- backend merge: 成功
- backend merge: 期限切れ（`deadline-exceeded`）
- backend merge: 権限不足（異なるユーザーでの preview）
- backend merge: 不正シークレット（`permission-denied`）

#### 実行環境

- 自動テスト: Firebase Emulator Suite（auth/firestore/functions）
- 手動検証: ステージング
  - 実運用に近い SDK 挙動・権限・ネットワーク差分の確認用

#### 実行手順

- `npm run test:guest-merge`
  - functions の build を含む
  - macOS で Java 環境が必要な場合は `npm run test:guest-merge:mac`

#### 手動検証（ステージング）

1. `VITE_ENABLE_BACKEND_GUEST_MERGE=false` にして client-side copy を強制
2. 匿名ユーザーでデータ作成（tags/books/records）
3. Google ログインで統合
4. 期待結果:

- 既存データが重複せずに統合される
- 失敗時は UI で復旧導線が表示される

5. `VITE_ENABLE_BACKEND_GUEST_MERGE=true` に戻し、backend merge 側を通常運用

## 非ゴール

- ゲスト統合仕様の変更
- Functions の大幅改修

## 注意

- `VITE_ENABLE_BACKEND_GUEST_MERGE` の dev/prod デフォルト方針（`TK-001`）と整合させる
