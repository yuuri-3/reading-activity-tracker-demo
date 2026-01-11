# P0-RE_001-TK_005 アカウント削除で tags も削除する

このチケットは、アカウント削除時に `users/{uid}/tags` が残り得る状態を解消し、「削除したのにデータが残る」事故を防ぎます。

## ゴール

- アカウント削除で関連データが期待どおり消える
- 削除対象（books/records/tags 等）が仕様として明文化される

## 対象

- 認証/削除: [src/app/auth/AuthContext.tsx](../../../src/app/auth/AuthContext.tsx)
- Firestore: `users/{uid}/books`, `users/{uid}/records`, `users/{uid}/tags`

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

達成チェック:

- [ ] アカウント削除で tags も削除される
- [ ] 既存の削除挙動（books/records）が壊れない
- [ ] 仕様として「削除対象」を README or doc に明記する

## 作業内容

### 1) 削除対象の仕様を確定

- 何を消すか（tags を含めるか、将来のサブコレクション等）

### 2) 実装を揃える

- `deleteCollectionDocs` の対象に tags を追加
- 件数増加時の失敗パターンを考慮（段階的削除/リトライ等は将来検討）

## 非ゴール

- Cloud Functions による recursive delete への移行（別チケット）

## 注意

- モバイル回線などで失敗し得るため、UX（失敗時の案内）も要検討
