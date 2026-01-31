# P2-TK-017 Storybook story tests の不安定要因（キャッシュ等）を対処し、運用メモを整備する

このチケットは、Storybook/Vitest 実行時のキャッシュ不整合などに起因し得る不安定さを減らし、再現/対処方法をチームで共有できる状態にします。

## ゴール

- `npm run test-storybook` が安定して再実行できる
- 落ちた時の対処手順がドキュメント化されている

## 対象

- `.storybook/*`
- `node_modules/.cache/storybook`（運用上の削除対象）
- ドキュメント（案）: README もしくは Phase1 内の運用メモ

## 実装状況

Status: 📴 未実装クローズ（問題が再現しておらず、既存ドキュメントで十分なため）

## クローズ理由

このチケットは以下の理由により、実装不要と判断してクローズします。

1. **問題が再現していない**
   - `tech-lead-report.md` によると、`SyntaxError: Unexpected token ')'` は「一度だけ」発生した事象
   - 現在は `npm run test-storybook` が正常に動作している（29 files / 66 tests pass）
   - CI でも安定して実行されている（`.github/workflows/ci-quality-gates.yml`）

2. **既に記録済み**
   - `tech-lead-report.md` の「テストが不安定になった場合の対処（再現性メモ）」セクションに対処法が記載されている
   - キャッシュ削除の手順（`node_modules/.cache/storybook` 削除）も記録済み

3. **キャッシュ削除は通常不要**
   - Storybook のキャッシュは通常有効にしておくべき（パフォーマンスのため）
   - キャッシュ削除は破損時の対処のみで、通常運用では不要
   - CI は毎回クリーン環境のため、キャッシュ破損は発生しにくい

4. **より根本的な対応が別チケットで予定**
   - TK-021（P1）で Storybook 外部依存をモック化して安定稼働を目指しており、より根本的な安定化が予定されている

5. **ドキュメント追加も不要**
   - ユーザー判断により、追加のドキュメント整備は不要と判断

将来同様の問題が再発した場合は、その時点で対応を検討する方が効率的です。

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
