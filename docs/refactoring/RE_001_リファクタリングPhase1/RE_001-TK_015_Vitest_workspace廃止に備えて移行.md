# P2-RE_001-TK_015 Vitest workspace（`vitest.workspace.ts`）deprecated への移行

このチケットは、`vitest.workspace.ts` が deprecated で将来的に削除予定な点に備え、設定を安定側へ寄せます。

## ゴール

- deprecated な workspace 設定に依存しない構成になっている
- Storybook story tests（browser mode）が継続して動く

## 対象

- 現状: [vitest.workspace.ts](../../../vitest.workspace.ts)
- Vite 設定（案）: [vite.config.ts](../../../vite.config.ts)
- Storybook: `.storybook/*`

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] `vitest.workspace.ts` 依存を減らす/廃止できる
- [ ] `npm run test-storybook` が動作する
- [ ] `npm run test`（通常の Vitest）も影響を受けない

## 作業内容

- Storybook 用プロジェクト設定を `vite.config.ts` 側の `test.projects` 等へ移行する方針を検討
- 可能なら `vitest.workspace.ts` を廃止し、設定の所在を一本化

## 非ゴール

- テスト基盤の総入れ替え

## 注意

- Storybook/Vitest のバージョン制約が絡むため、最小差分で進める
