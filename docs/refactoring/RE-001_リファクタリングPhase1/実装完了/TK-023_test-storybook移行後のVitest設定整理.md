# P2-TK-023 `test-storybook` 移行後の Vitest（storybook project）設定整理

このチケットは、`test-storybook` を Storybook test runner に移行した後に、不要になった Vitest browser mode / storybook project 周りの設定やスクリプトを整理します。

この内容は [TK-015](./TK-015_Vitest_workspace廃止に備えて移行.md)（方針 A）で同時に対応しました（workspace deprecated 対応と同じ範囲のため）。

## ゴール

- テスト実行系のスクリプト/設定が二重管理にならない
- 「どのコマンドが何を実行するか」が明確で、保守しやすい

## 対象（例）

- `package.json` の scripts（`test-storybook` / `test-storybook:watch` など）
- `.storybook/vitest.setup.ts` などの storybook-vitest 関連設定
- `vitest.workspace.ts` や関連する storybook project 設定（存在する場合）
- ドキュメント（README / 運用メモ）

## 関連

- 元チケット: [TK-003 CI に typecheck + test-storybook を追加](./TK-003_CIにtypecheckとtest-storybook追加.md)

## 実装状況

Status: ✅ TK-015 に統合済み

## 受け入れ条件

- [x] [TK-015](./TK-015_Vitest_workspace廃止に備えて移行.md) 側で達成されている

## 作業内容（概要）

- 作業は [TK-015](./TK-015_Vitest_workspace廃止に備えて移行.md) に集約

## 非ゴール

- Storybook test runner の安定化そのもの（別チケットで扱う）
