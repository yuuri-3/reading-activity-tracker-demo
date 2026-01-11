# P2-RE_001-TK_016 Vitest browser 設定の deprecated 対応（instances 形式へ）

このチケットは、Vitest browser 設定で deprecated になっている項目（例: `browser.name`）を新形式へ移行し、将来の破綻を防ぎます。

## ゴール

- deprecated 警告が減り、将来の Vitest 更新で壊れにくい
- `npm run test-storybook` が継続して動く

## 対象

- [vitest.workspace.ts](../../../vitest.workspace.ts)

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] deprecated の指摘箇所が新形式へ置き換わっている
- [ ] `npm run test-storybook` が通る

## 作業内容

- `browser` 設定を instances 形式へ移行（Vitest の推奨に合わせる）
- CI で動くことを前提に headless/Playwright 設定を維持

## 非ゴール

- browser provider の変更（Playwright のまま）
