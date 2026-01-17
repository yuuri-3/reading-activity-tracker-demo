# P2-TK-018 React の key 重複 warning を修正する（Storybook で検知済み）

このチケットは、Storybook 実行中に出ている React の key 重複 warning を修正し、潜在的な UI 崩れを防ぎます。

## ゴール

- Storybook story tests 実行時に key 重複 warning が解消する

## 対象

- 対象候補: `src/app/components/ListCard.stories.tsx`

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] 対象 story の warning が消える
- [ ] 見た目/挙動が破綻しない
- [ ] `npm run test-storybook` が通る

## 作業内容

- warning が出ている箇所を特定し、key の一意性を担保する
- 必要なら story 用のダミーデータ生成を修正

## 非ゴール

- ListCard 本体のデザイン変更
