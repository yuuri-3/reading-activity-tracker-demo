# P1-TK-012 UI の色・シャドウをトークンへ寄せる

このチケットは、コンポーネント内に直書きされている色/シャドウをトークン（CSS 変数）へ寄せ、テーマ変更や微調整に強くします。

## ゴール

- 直書きカラー/シャドウが減り、変更点が `theme.css` 側に集約される
- 主要 UI（ボタン/カード等）でトークン参照が徹底される

## 対象

- トークン: `src/styles/theme.css`
- 直書きが多い箇所（例）: [src/app/components/TimerSection.tsx](../../../src/app/components/TimerSection.tsx), [src/app/pages/RecordSingleView.tsx](../../../src/app/pages/RecordSingleView.tsx)
- ui 基盤（影響大）: `src/app/components/ui/*`

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] 主要画面/主要コンポーネントで `text-[#...]` 等の直書きがトークン参照に置き換わっている
- [ ] `theme.css` に色/シャドウの真実が集約されている
- [ ] 変更後も見た目が大きく崩れない（意図した差分のみ）

## 作業内容

### 1) 直書き棚卸し

- `text-[#` / `bg-[#` / `rgba(` / `shadow-[` などの検索で候補を列挙

### 2) トークン定義

- 既存トークンへ寄せられるものは寄せる
- 足りない場合のみ、命名規則を決めて追加（例: `--color-accent-*`）

### 3) 置換

- 影響の大きい `components/ui` から優先して置換
- 画面側の直書きも段階的に置換

## 非ゴール

- ダークモード等のテーマ追加（別チケット）

## 注意

- Tailwind 側は `text-[var(--...)]` のように変数参照で統一する
