# P1-TK-007 アイコン方針を統一し、lucide-react を段階的に移行する

このチケットは「アイコンは SVG からコンポーネントとして実装する」という方針と、実装上の `lucide-react` 混在を解消し、UI の一貫性と保守性を上げます。

## ゴール

- アイコンの実装方針が明文化され、コード上でも一貫する
- `lucide-react` 依存が新規追加されない（抑止できる）
- 既存 UI を壊さずに段階移行できる

## 対象

- 既存利用箇所（例）: [src/app/pages/BookCollectionView.tsx](../../../src/app/pages/BookCollectionView.tsx), [src/app/pages/RecordSingleView.tsx](../../../src/app/pages/RecordSingleView.tsx), [src/app/components/TimerSection.tsx](../../../src/app/components/TimerSection.tsx)
- アイコン実装先（新設 or 既存整理）: `src/app/components/icons/*`
- 運用ルール: `copilot-instructions.md`（既存ルールの補強）, README 等

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] `lucide-react` の使用方針が決定・文書化されている（禁止 or 例外条件）
- [ ] `src/app/components/icons` に SVG ベースのアイコンコンポーネントが用意され、主要画面で置き換えできる
- [ ] 新規の `lucide-react` 利用がレビューで検知できる仕組みがある（簡易でも可）

## 作業内容

### 1) 方針確定

- 原則: SVG コンポーネント化（プロジェクト指示に合わせる）
- 例外がある場合は例外条件を明記（例: 一時的に許容、移行期限）

### 2) 置き換え計画

- `lucide-react` 利用箇所を棚卸しし、置き換え順（影響/頻度）を決める
- まずは共通 UI（Button/Select など）や利用頻度が高い画面から置換

### 3) 最低限の抑止

- 文字列検索ベースでも良いので「lucide-react を追加したら気づける」運用を作る
  - 例: CI で `lucide-react` import を grep して差分検知（将来 ESLint ルール化も検討）

## 非ゴール

- 全画面の一括置換（段階移行で OK）
- デザイン刷新

## 注意

- アイコン実装は Figma の外枠サイズ（例: 24x24）を含めて実装する
- 既存のアイコンコンポーネントがある場合は極力再利用する
