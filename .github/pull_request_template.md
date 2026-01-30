## 概要

<!-- 何を・なぜ -->

## 変更点

-

## 影響範囲

-

## 確認

- [ ] `npm run typecheck:all`（型チェック）
- [ ] `npm run test`（ロジック・ユニットテスト）
- [ ] `npm run storybook` → `npm run test-storybook`（UI テスト）
- [ ] `npm run build`
- [ ] `npx tsc -p tsconfig.json --noEmit`
- [ ] 動作確認（該当画面）

---

## PR 作成手順メモ（困ったとき用）

### 1) 差分を確認（PR に入れる/入れないを決める）

- `git status --porcelain`
- `git diff --name-only`

### 2) PR に入れない差分は stash で退避（※破棄しない）

- 例: `git stash push -u -m "wip/unrelated" -- path/to/dir path/to/file`
- 退避確認: `git stash list`

### 3) main を最新化 →PR 用の新規ブランチを作成

- `git checkout main`
- `git pull --ff-only`
- `git checkout -b <usecase>_<ticket>_<short>`

### 4) 退避した作業を必要に応じて適用

- `git stash apply stash@{0}`

### 5) PR 対象ファイルだけを add→commit（コミットメッセージは英語）

- `git add -- <paths...>`
- `git commit -m "..."`

### 6) push

- `git push -u origin <branch>`

### 7) PR 本文はファイルで用意して `gh pr create --body-file` を使う

- `cat > /tmp/pr_body.md <<'EOF'`
- `...本文...`
- `EOF`
- `gh pr create --base main --head <branch> --title "..." --body-file /tmp/pr_body.md`
