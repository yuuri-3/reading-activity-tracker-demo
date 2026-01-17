# P2-TK-023 `test-storybook` 移行後の Vitest（storybook project）設定整理

このチケットは、`test-storybook` を Storybook test runner に移行した後に、不要になった Vitest browser mode / storybook project 周りの設定やスクリプトを整理します。

## ゴール

- テスト実行系のスクリプト/設定が二重管理にならない
- 「どのコマンドが何を実行するか」が明確で、保守しやすい

## 対象（例）

- `package.json` の scripts（`test-storybook` / `test-storybook:watch` など）
- `.storybook/vitest.setup.ts` などの storybook-vitest 関連設定
- `vitest.workspace.ts` や関連する storybook project 設定（存在する場合）
- ドキュメント（README / 運用メモ）

## 関連

- 元チケット: [TK-003 CI に typecheck + test-storybook を追加](TK-003_CIにtypecheckとtest-storybook追加.md)

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] `test-storybook` が Storybook test runner を指す
- [ ] 不要になった設定ファイル/依存/スクリプトが整理されている
- [ ] `npm run test` / `npm run test-storybook` の役割分担がドキュメント化されている

## 作業内容（概要）

- 移行後に未使用になる設定（storybook project / browser mode）を洗い出し
- 削除/統合/移行の方針を決めて整理
- CI と開発者のローカル運用手順を更新

## 非ゴール

- Storybook test runner の安定化そのもの（別チケットで扱う）
