# P2-RE_001-TK_017 Storybook story tests の不安定要因（キャッシュ等）を対処し、運用メモを整備する

このチケットは、Storybook/Vitest 実行時のキャッシュ不整合などに起因し得る不安定さを減らし、再現/対処方法をチームで共有できる状態にします。

## ゴール

- `npm run test-storybook` が安定して再実行できる
- 落ちた時の対処手順がドキュメント化されている

## 対象

- `.storybook/*`
- `node_modules/.cache/storybook`（運用上の削除対象）
- ドキュメント（案）: README もしくは Phase1 内の運用メモ

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

- [ ] キャッシュ削除などの再現性メモがどこかに明記されている
- [ ] テスト失敗時にまず疑うポイント（キャッシュ/Playwright/変換）が整理されている

## 作業内容

- `SyntaxError: Unexpected token ')'` などの事象を想定し、最小の復旧手順を決める
  - 例: `node_modules/.cache/storybook` 削除 → 再実行
- （必要なら）`test-storybook` 実行前にキャッシュを消す運用/スクリプト追加を検討
- （任意）Storybook telemetry の opt-out 方針を決め、必要なら設定を追加

## 非ゴール

- Storybook テスト方式の変更（Playwright 廃止など）
