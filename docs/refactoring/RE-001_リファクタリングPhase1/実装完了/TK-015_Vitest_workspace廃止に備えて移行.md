# P2-TK-015 Vitest workspace（`vitest.workspace.ts`）deprecated への移行（旧 TK-016 統合）

このチケットは、`vitest.workspace.ts`（Vitest workspace）が deprecated で将来的に削除予定な点に備え、設定と運用を「将来も壊れにくい形」に寄せます。

補足（前提）:

- すでに CI の品質ゲートは `npm run test-storybook`（Storybook test runner）を正としている
- そのため現状の `vitest.workspace.ts` は、主に `vitest --project=storybook` の“補助ルート”を維持するために存在している（=無くしても成立し得る）

## ゴール

- deprecated な workspace 設定に依存しない構成になっている
- `npm run test-storybook`（Storybook test runner）が継続して動く
- `vitest --project=storybook`（Vitest browser mode）を廃止し、二重管理を解消できている

## 対象

- 削除対象: `vitest.workspace.ts`
- Vite 設定（案）: [vite.config.ts](../../../vite.config.ts)
- Storybook: `.storybook/*`
- scripts: [package.json](../../../package.json)

## 実装状況

Status: ✅ 完了

## 受け入れ条件

- [x] 方針 A（`vitest --project=storybook` 廃止）が確定している
- [x] `vitest.workspace.ts` が削除されている
- [x] `vitest --project=storybook` の scripts/設定が整理されている
- [x] `npm run test`（通常の Vitest）が影響を受けない
- [x] `npm run test-storybook` が動作する
- [x] lockfile（`package-lock.json`）が `package.json` と整合している

## 作業内容

### 0) 決定事項

- 方針 A: `vitest --project=storybook`（Vitest browser mode）を廃止し、Storybook の UI テストは `npm run test-storybook`（Storybook test runner）に一本化する

### 1) 実施（設定/ファイル整理）

- `vitest.workspace.ts` を削除
- `@storybook/addon-vitest` を外し、Vitest storybook project 用の設定を削除
- `package.json` から `test-storybook:vitest*` を削除

### 2) 検証

- `npm run test` が通ること
- `npm run storybook`（別ターミナル）を起動した状態で `npm run test-storybook` が通ること

### 3) 仕上げ（差分の整合）

- `package-lock.json` を更新し、`package.json` と整合させる

## 非ゴール

- テスト基盤の総入れ替え

## 注意

- Storybook/Vitest のバージョン制約が絡むため、最小差分で進める
- 既に `npm run test-storybook` が正の前提なので、不要な二重管理（workspace + test runner）を増やさない
