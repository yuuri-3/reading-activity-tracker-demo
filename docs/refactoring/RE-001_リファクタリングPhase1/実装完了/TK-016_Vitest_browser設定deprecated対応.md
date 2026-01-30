# P2-TK-016 Vitest browser 設定の deprecated 対応（instances 形式へ）

このチケットの内容は [TK-015](./TK-015_Vitest_workspace廃止に備えて移行.md) に統合しました（workspace deprecated 対応と同じ変更箇所で、同時に行うのが最小差分のため）。

## ゴール

- deprecated 警告が減り、将来の Vitest 更新で壊れにくい
- `npm run test-storybook` が継続して動く

## 対象

- 旧対象: `vitest.workspace.ts`（TK-015 の対応で削除済み）

## 実装状況

Status: ✅ TK-015 に統合済み

## 受け入れ条件

- [x] [TK-015](./TK-015_Vitest_workspace廃止に備えて移行.md) 側で対応されている

## 作業内容

- 作業は [TK-015](./TK-015_Vitest_workspace廃止に備えて移行.md) に集約

## 非ゴール

- browser provider の変更（Playwright のまま）
