# RE-001_TK-014 UI 依存（Radix/MUI/shadcn 等）と components/ui の棚卸し・整理（未使用削除）

このチケットは、UI 関連の依存/コンポーネントが多く混在している状態を整理し、保守コストの増加を抑えます。

## ゴール

- UI ライブラリの採用優先順位（方針）が短い文書で決まっている
- `src/app/components/ui` の「使う/使わない」の境界が明確になり、未使用を削る計画ができる
- 未使用が明確な `src/app/components/ui/**` はプロジェクトから削除されている

## 対象

- 依存: `package.json`
- UI コンポーネント群: `src/app/components/ui/*`
- 参考（レポートの棚卸し結果）: [tech-lead-report.md](./tech-lead-report.md)

対象外（別チケット）:

- `src/app/components/ui/**` 内の `lucide-react` 置換（アイコン方針の延長だが影響範囲が大きい）

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] UI スタックの方針が文書化されている（例: 基本は Tailwind+Radix、MUI は既存のみ等）
- [ ] 未使用の `src/app/components/ui/**` が特定され、削除対象が合意されている（一覧が本文にある）
- [ ] 合意した未使用ファイルが実際に削除されている（import 参照が残っていない）
- [ ] `npm run build` と `npm run test-storybook` が通る

## 作業内容

### 1) 実使用の再棚卸し

- import 参照を検索して「使用/未使用」を再確認（差分があれば更新）

### 2) 方針決定

- “使うものだけ置く” or “vendor として固定して更新しない” などを決める

### 3) 段階削除

- 未使用が明確なものから削除し、CI/Storybook で回帰を拾う

削除のルール:

- 「未使用」判定は import 参照（TypeScript）で行う（grep ではなく型チェックで最終確認）
- 削除は小さく刻み、Storybook / build で回帰を検知する

## 非ゴール

- UI 全体のデザイン刷新
- `lucide-react` の置換（`src/app/components/ui/**` 内）は別チケットで対応

## 注意

- `components/ui` の削除は影響が広いので、小さく刻む
