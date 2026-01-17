# P1-TK-009 AppContext の責務分割（データ層/UI 状態）と購読範囲の整理

このチケットは、肥大化した `AppContext.tsx` を段階的に分割し、変更影響範囲とレンダリング負荷を下げます。

## ゴール

- `AppContext` が「DB アクセス + ドメインロジック + UI 状態」を抱えすぎない
- Timer/Search/Guest notice 等の UI 寄り状態の購読範囲が限定される
- Firestore の購読/CRUD の責務が整理される

## 対象

- 主要対象: [src/app/context/AppContext.tsx](../../../src/app/context/AppContext.tsx)
- 参照されるページ/コンポーネント（広範囲）
- 新規（案）: `src/app/repositories/*`（Firestore 購読/CRUD）
- 新規（案）: `src/app/context/*`（用途別 Context）

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] `AppContext.tsx` の責務が 1 段階でも分離されている（最小 1 モジュール）
- [ ] 変更後も既存の主要機能（books/records/tags/timer）が動作する
- [ ] Context value が過剰に揺れないように、必要箇所で安定化（`useMemo` 等）が入る

## 作業内容

### 1) 分割方針を決める（段階的）

- まず「Firestore 購読 + CRUD」を `repositories` に寄せる
- 次に「UI 状態（Timer/Search/Guest）」を用途別 Context に分離

### 2) 小さく移す

- いきなり大改修せず、移しやすい機能（例: Tags CRUD）から切り出す

### 3) 影響確認

- 既存の画面（Book/Record/Tag/Timer）を最小限確認
- `npm run test-storybook` を回して回帰を拾う

## 非ゴール

- Zustand/Redux 等の state 管理ライブラリ導入
- 大規模なドメインモデル刷新

## 注意

- `TK-006`（Timer tick）の対策と依存があるため、順序を揃える（例: 先に value 安定化 → 分離）
