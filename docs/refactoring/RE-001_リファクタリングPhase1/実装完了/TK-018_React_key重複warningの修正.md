# TK-018 React の key 重複 warning を修正する（Storybook で検知済み）

このチケットは、Storybook 実行中に出ている React の key 重複 warning を修正し、潜在的な UI 崩れを防ぎます。

## ゴール

- Storybook story tests 実行時に key 重複 warning が解消する

## 対象

- `src/app/components/ListCard.stories.tsx`
- `src/app/components/ListCard.tsx`

## 実装状況

Status: ✅ 完了

## 受け入れ条件

- [x] 対象 story の warning が消える
- [x] 見た目/挙動が破綻しない
- [x] `npm run test-storybook` が通る

### 確認状況

- ✅ 型チェック: `npm run typecheck:all` 成功
- ✅ Storybook での warning 確認: key 重複 warning は解消済み（Console で確認）
- ✅ Storybook での見た目/挙動確認: 問題なし
- ✅ `npm run test-storybook`: 成功（29 files / 66 tests pass）

### 補足（実行環境）

- `npm run test-storybook` 実行前に Playwright の Chromium（arm64）再インストールが必要だった
  - `PLAYWRIGHT_BROWSERS_PATH` 配下に x64 が入っており、arm64 実行時に browser executable が見つからない状態だったため

## 作業内容

- warning が出ている箇所を特定し、key の一意性を担保する
- 必要なら story 用のダミーデータ生成を修正

## 実装内容

### 問題の原因

1. `ListCard.stories.tsx` の `Record` story で `tags: ["タグ1", "タグ1", "タグ1"]` と重複したタグが設定されていた
2. `ListCard.tsx` の実装で `tags.map((t) => <Tag key={t} text={t} />)` とタグのテキスト自体を key として使用していた
3. 同じテキストのタグが複数あると key が重複し、React の warning が発生する
4. 実際のアプリケーションでは同じテキストのタグも登録できる仕様のため、本番環境でも同様の問題が発生する可能性があった

### 修正内容

1. **`ListCard.stories.tsx`**:
   - 通常表示用の `Record` は `["タグ1", "タグ2", "タグ3"]` に調整
   - 回帰確認用に `RecordWithDuplicateTags`（`["タグ1", "タグ1", "タグ1"]`）を追加
2. **`ListCard.tsx`**: `tags` プロパティの key 生成を修正（`key={t}` → `key={`tag-${index}`}`）
   - タグのテキストではなく、配列の index を使った一意な key を生成するように変更
   - これにより、同じテキストのタグが複数あっても key が重複しない

## 非ゴール

- ListCard 本体のデザイン変更
