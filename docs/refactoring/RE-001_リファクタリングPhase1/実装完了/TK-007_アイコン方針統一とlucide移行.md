# RE-001_TK-007 アイコン方針を統一し、lucide-react を段階的に移行する

このチケットは「アイコンは SVG からコンポーネントとして実装する」という方針と、実装上の `lucide-react` 混在を解消し、UI の一貫性と保守性を上げます。

## ゴール

- アイコンの実装方針が明文化され、コード上でも一貫する
- `lucide-react` 依存が新規追加されない（抑止できる）
- 既存 UI を壊さずに段階移行できる

## 対象

- 既存利用箇所（例）: [src/app/pages/BookCollectionView.tsx](../../../../src/app/pages/BookCollectionView.tsx), [src/app/pages/RecordSingleView.tsx](../../../../src/app/pages/RecordSingleView.tsx), [src/app/components/TimerSection.tsx](../../../../src/app/components/TimerSection.tsx)
- アイコン実装先（新設 or 既存整理）: `src/app/components/icons/*`
- 運用ルール: `copilot-instructions.md`（既存ルールの補強）, README 等

## 決定事項（方針 A）

- 原則: アプリコード（`src/app/**`）では SVG アイコンコンポーネント（`src/app/components/icons/*`）を使用する
- Props: 許容する props は `size` と `color` のみ（`className` 等は持たせない）
- サイズ指定: アイコンのサイズは `size` props で統一し、Tailwind の spacing トークンを渡す（例: `size={6}` は `w-6 h-6` 相当。`w-*` / `h-*` 等のクラスでアイコン自体のサイズを指定しない）
- 色指定: 基本は `currentColor`（親要素の文字色）で表現し、`color` props が渡された場合はそれを優先する
- 置換の見た目: `src/app/components/ui/**` を除き、Figma を完全再現する（`lucide-react` と一致させる必要はない）
- アイコンのソース: Figma に存在するものを実装する（Figma に無いアイコンが必要になった場合は、勝手に作らずデザイナーに追加を依頼する）
- アクセシビリティ: アイコン自体はラベルを持たせない（装飾扱いで `aria-hidden`）。アイコンボタン/リンク等は親（ボタン/リンク）側に `aria-label` 等で名称を付与する
- 命名: アイコンコンポーネントは `Icon` + PascalCase（例: `IconClock`）で統一する（意味が明確な語を優先）
- 例外: `src/app/components/ui/**` 内は当面 `lucide-react` を許容する（shadcn 由来のため）
- 禁止: 上記例外を除き、新規の `lucide-react` import は禁止（既存の維持・置換のみ）
- 抑止: `npm run check:lucide`（`scripts/check-lucide-imports.mjs`）で、例外パス以外の `lucide-react` import を CI で検知して落とす（allowlist 方式）
  - 許容されるのは `src/app/components/ui/**` と、このチケットの「受け入れ条件」に列挙した移行対象（既存の暫定許容）のみ
  - 移行対象を追加する場合は「受け入れ条件（対象ファイル）」とスクリプトの allowlist をセットで更新する
  - allowlist を増やすのは原則 NG（どうしても必要な場合は理由をチケットに残す）

補足:

- `src/app/components/ui/**` の `lucide-react` も将来的には段階的に置換する（別チケットで扱う）

## 実装状況

Status: ✅ 完了

## 受け入れ条件

- [x] `lucide-react` の使用方針（方針 A）がこのチケット内に明記されている
- [x] 例外（`src/app/components/ui/**` のみ許容）が明記されている
- [x] 次のファイル群から `lucide-react` import が除去され、`src/app/components/icons/*` へ置換されている
  - `src/app/pages/BookCollectionView.tsx`
  - `src/app/pages/BookSingleView.tsx`
  - `src/app/pages/RecordSingleView.tsx`
  - `src/app/components/TimerSection.tsx`
  - `src/app/components/ListCard.tsx`
  - `src/app/components/ListEmptyView.tsx`
  - `src/app/components/TagMultiSelectInput.tsx`
  - `src/app/components/book-list/BookListSearchField.tsx`
  - `src/app/components/PrimaryButton.stories.tsx`（ストーリーでの見た目統一のため）
- [x] 新規の `lucide-react` import が例外パス以外で追加された場合に検知できる仕組みがある（`npm run check:lucide`）

## 置換対象アイコン（棚卸し）

このチケットのスコープ内（`src/app/components/ui/**` を除く）で、現在 `lucide-react` から import されているアイコンは以下。

| 旧（lucide） | 新（SVG コンポーネント）                 | 主な使用箇所（例）                               |
| ------------ | ---------------------------------------- | ------------------------------------------------ |
| `BookOpen`   | `IconBook`                               | `BookCollectionView`, `ListEmptyView`            |
| `Calendar`   | `IconBookRibbon`（Figma: `book_ribbon`） | `BookSingleView`, `ListCard`                     |
| `Clock`      | `IconClock`                              | `BookSingleView`, `RecordSingleView`, `ListCard` |
| `FileText`   | `IconNoteStack`（Figma: `note_stack`）   | `BookSingleView`, `ListCard`                     |
| `Play`       | `IconStart`（Figma: `Start`）            | `TimerSection`, `PrimaryButton.stories`          |
| `Pause`      | `IconPause`                              | `TimerSection`                                   |
| `Square`     | `IconStop`（用途: 停止）                 | `TimerSection`                                   |
| `Check`      | `IconCheck`（Figma: `Check`）            | `TagMultiSelectInput`                            |
| `X`          | `IconClose`（Figma: `Close`）            | `TagMultiSelectInput`                            |
| `Search`     | `IconSearch`                             | `BookListSearchField`                            |

## 作業内容

### 1) 方針確定

- 原則: SVG コンポーネント化（プロジェクト指示に合わせる）
- 例外: `src/app/components/ui/**` は当面 `lucide-react` を許容（方針 A）

### 2) 置き換え計画

- `lucide-react` 利用箇所を棚卸しし、置き換え順（影響/頻度）を決める
- このチケットでは「アプリ側（`src/app/components/ui/**` 以外）」を優先して置換する
- `src/app/components/ui/**` の置換は別チケット化して段階対応する

### 3) 最低限の抑止

- 文字列検索ベース + allowlist 方式で「`src/app/components/ui/**` 以外に `lucide-react` が入ったら落とす」仕組みを作る
  - CI で `npm run check:lucide` を実行し、`src/app/components/ui/**` 以外の `lucide-react` import を原則 NG にする
  - 既存の暫定許容（段階移行中）のみ allowlist に登録し、それ以外は“新規追加”扱いとして検知する
  - 例外運用が必要になった場合は、
    - まずは SVG アイコンコンポーネント実装で解決できないか検討し、
    - どうしても暫定許容が必要なら、このチケットの対象ファイル一覧と allowlist を更新して理由を残す
  - ESLint 導入などの大きな仕組み化は別チケットで検討（このチケットでは追加依存なしを優先）

## 別チケット候補

- `src/app/components/ui/**` の整理（未使用削除）: [TK-014](../TK-014_UI依存とcomponents_ui棚卸し整理.md)
- `src/app/components/ui/**` 内の `lucide-react` 置換: [TK-025](../TK-025_components_uiのlucide-react置換.md)

## 非ゴール

- 全画面の一括置換（段階移行で OK）
- デザイン刷新

## 注意

- アイコン実装は Figma の外枠サイズ（例: 24x24）を含めて実装する
- 既存のアイコンコンポーネントがある場合は極力再利用する
