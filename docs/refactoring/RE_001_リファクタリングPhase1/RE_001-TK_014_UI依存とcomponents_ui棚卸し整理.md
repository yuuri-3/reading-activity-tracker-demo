# P2-RE_001-TK_014 UI 依存（Radix/MUI/shadcn 等）と `components/ui` の棚卸し・整理方針を決める

このチケットは、UI 関連の依存/コンポーネントが多く混在している状態を整理し、保守コストの増加を抑えます。

## ゴール

- UI ライブラリの採用優先順位（方針）が短い文書で決まっている
- `src/app/components/ui` の「使う/使わない」の境界が明確になり、未使用を削る計画ができる

## 対象

- 依存: `package.json`
- UI コンポーネント群: `src/app/components/ui/*`
- 参考（レポートの棚卸し結果）: [tech-lead-report.md](./tech-lead-report.md)

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] UI スタックの方針が文書化されている（例: 基本は Tailwind+Radix、MUI は既存のみ等）
- [ ] 未使用の `components/ui` を削る/隔離する方針が決まっている
- [ ] 削除する場合、`npm run build` と `npm run test-storybook` が通る

## 作業内容

### 1) 実使用の再棚卸し

- import 参照を検索して「使用/未使用」を再確認（差分があれば更新）

### 2) 方針決定

- “使うものだけ置く” or “vendor として固定して更新しない” などを決める

### 3) 段階削除

- 未使用が明確なものから削除し、CI/Storybook で回帰を拾う

## 非ゴール

- UI 全体のデザイン刷新

## 注意

- `components/ui` の削除は影響が広いので、小さく刻む
