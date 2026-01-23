# RE-001_TK-025 components/ui の lucide-react を SVG アイコンへ置換する

このチケットは、`src/app/components/ui/**` 内で使用されている `lucide-react` を、プロジェクト方針（SVG からアイコンコンポーネント実装）に合わせて段階的に置換します。

前提: [TK-007](./TK-007_アイコン方針統一とlucide移行.md) の方針 A（`components/ui` は当面例外）を、このチケットで解消していく。

## ゴール

- `src/app/components/ui/**` から `lucide-react` 依存が除去される
- 置換後も見た目・アクセシビリティ（`aria-hidden` 等）・サイズ指定の挙動が崩れない

## 対象

- `src/app/components/ui/**`
- アイコン実装先: `src/app/components/icons/*`

想定される対象ファイル（現時点の import ベース）:

- `src/app/components/ui/accordion.tsx`
- `src/app/components/ui/breadcrumb.tsx`
- `src/app/components/ui/calendar.tsx`
- `src/app/components/ui/carousel.tsx`
- `src/app/components/ui/checkbox.tsx`
- `src/app/components/ui/command.tsx`
- `src/app/components/ui/context-menu.tsx`
- `src/app/components/ui/dialog.tsx`
- `src/app/components/ui/dropdown-menu.tsx`
- `src/app/components/ui/input-otp.tsx`
- `src/app/components/ui/menubar.tsx`
- `src/app/components/ui/navigation-menu.tsx`
- `src/app/components/ui/pagination.tsx`
- `src/app/components/ui/radio-group.tsx`
- `src/app/components/ui/resizable.tsx`
- `src/app/components/ui/select.tsx`
- `src/app/components/ui/sheet.tsx`

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] 上記対象ファイル群から `lucide-react` の import が削除されている
- [ ] 必要なアイコンが `src/app/components/icons/*` として実装されている（SVG ベース）
- [ ] `npm run build` が通る
- [ ] `npm run test-storybook` が通る

## 作業内容

### 1) アイコン利用の棚卸し

- `components/ui` 内で使用されているアイコン名（例: `ChevronDownIcon`, `XIcon` など）と、要求される props（`className`/サイズ指定）を一覧化

### 2) SVG アイコンの追加

- 必要な SVG を `src/app/components/icons/*` に追加
- 既存の `IconProps`（`className`, `size`, `color`）で表現できないケースがあれば、方針に沿って最小限の拡張を検討（例: `aria-label` 等の受け渡し）

### 3) `components/ui` の import 置換

- `lucide-react` → `src/app/components/icons/*` へ差し替え
- 既存の Tailwind クラスによるサイズ指定（例: `h-4 w-4`）が崩れないことを Storybook で確認

### 4) リグレッション確認

- `npm run build`
- `npm run test-storybook`

## 非ゴール

- `components/ui` の API 仕様変更（props 破壊的変更）
- UI デザイン刷新

## 注意

- アイコン実装は Figma の外枠サイズ（例: 24x24）を含めて実装する
- `components/ui` は影響範囲が広いので、差分は小さく刻む
