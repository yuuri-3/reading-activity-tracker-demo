# P0-RE_001-TK_002 Firestore Rules をリポジトリ管理にする

このチケットは、Firestore Rules がリポジトリに存在せず、Console 手動変更で属人化しやすい状態を解消します。

## ゴール

- Firestore の認可境界をコードとして固定化し、再現性を上げる
- 誤設定によるデータ漏えい/破壊リスクを下げる

## 対象

- `firebase.json`（rules 参照の設定）
- `firestore.rules`（新規追加）
- 必要に応じて `firestore.indexes.json`
- PROJECT_LOG / DEPLOYMENT_PLAN の記載整合

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

達成チェック:

- [ ] `firestore.rules` がリポジトリにあり、`firebase.json` から参照されている
- [ ] 既存の主要機能（books/records/tags 等）が Rules の変更で壊れない
- [ ] ローカル/本番どちらも同じ Rules を適用する運用になっている（手動例外がない）

## 作業内容

### 1) 現行 Rules を確定する

- 現在 Console に入っている Rules を取得し、`firestore.rules` として管理開始

### 2) `firebase.json` へ Rules 参照を追加

- `firebase deploy`（または CI）で Rules が反映されることを確認

### 3) ドキュメント整合

- DEPLOYMENT_PLAN / PROJECT_LOG に「Rules はリポジトリ管理」を明記

## 非ゴール

- allowlist（メール/UID）などの運用ポリシー変更（必要なら別チケット）

## 注意

- Functions が扱うデータ（例: guestMergeRequests）も含め、意図した read/write 範囲か要確認
