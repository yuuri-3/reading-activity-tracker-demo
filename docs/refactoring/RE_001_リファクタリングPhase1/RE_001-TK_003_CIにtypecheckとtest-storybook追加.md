# P0-RE_001-TK_003 CI に typecheck + test-storybook を追加

このチケットは、現状 build→deploy のみの CI に「最低限の品質ゲート」を追加し、回帰を早期検知できるようにします。

## ゴール

- deploy 前に `npm run typecheck` と `npm run test-storybook` が通ること
- Storybook story tests を品質ゲートとして運用できる状態にする

## 対象

- GitHub Actions: `.github/workflows/deploy-firebase-hosting.yml`
- scripts: [package.json](../../../package.json)
- Storybook/Vitest 設定: [.storybook/main.ts](../../../.storybook/main.ts), [vitest.workspace.ts](../../../vitest.workspace.ts)

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

達成チェック:

- [ ] CI 上で `npm ci` → `npm run typecheck` → `npm run test-storybook` が動く
- [ ] テスト失敗時は deploy が止まる
- [ ] browser mode に必要な Playwright chromium の導入が CI に含まれている

## 作業内容

### 1) CI にテストステップを追加

- `npm run typecheck`
- `npm run test-storybook`

### 2) Playwright Chromium を CI で用意

- 例: `npx playwright install chromium`（CI 内）

### 3) 実行時間の最適化（必要なら）

- キャッシュ方針（npm cache / Playwright cache）を検討

## 非ゴール

- ESLint/Prettier の導入（別チケット）

## 注意

- 初回は CI 実行時間が伸びる可能性あり（browser mode のため）
