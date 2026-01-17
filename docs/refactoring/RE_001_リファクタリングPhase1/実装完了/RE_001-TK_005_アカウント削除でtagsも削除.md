# P0-RE_001-TK_005 アカウント削除で tags も削除する

このチケットは、アカウント削除時に `users/{uid}/tags` が残り得る状態を解消し、「削除したのにデータが残る」事故を防ぎます。

## 現状（2026-01-17 調査）

- tags は Firestore の `users/{uid}/tags` に保存されている（購読/作成ともにこのパス）。
- 通常のアカウント削除フロー（AuthContext の `deleteAccount`）は `users/{uid}/records` と `users/{uid}/books` は削除するが、`users/{uid}/tags` は削除していないため tags が残り得る。
- ゲスト統合時の anon クリーンアップでは `records/books/tags` を削除しているため、削除対象がフローによって不一致になっている。
- Cloud Functions 側には `guestMergeRequests`（トップレベルコレクション）があり、uid を参照するデータが残り得る（TTL 設計があるため恒久保存ではないが「基本的に全削除」という理想からは外れる）。

## ゴール

- アカウント削除で関連データが期待どおり消える
- 削除対象（books/records/tags 等）が仕様として明文化される

理想ゴール:

- アカウント削除されたユーザーのデータは、原則として Firestore から削除される（残す必要があるものがあれば例外として明記する）

## 仕様（決定事項）

- 005 では「クライアント側で削除できる範囲」の削除を確実に行う
- `users/{uid}` ドキュメント削除は **必須** とする（ベストエフォートではない）
- Firestore 側の削除が完了しない限り、Auth のユーザー削除（`deleteUser`）には進まない
  - 途中まで消えていても問題ない（再実行で残りが消える）ため、操作は冪等に扱う
- 削除対象一覧は「コードで一元管理」し、テストで漏れを検知する
  - 定数: [src/app/auth/accountDeletion.ts](../../../../src/app/auth/accountDeletion.ts)
  - テスト: [src/app/auth/accountDeletion.test.ts](../../../../src/app/auth/accountDeletion.test.ts)

## 対象

- 認証/削除: [src/app/auth/AuthContext.tsx](../../../../src/app/auth/AuthContext.tsx)
- Firestore: `users/{uid}/books`, `users/{uid}/records`, `users/{uid}/tags`

## 実装状況

Status: ✅ 完了

現状確認（2026-01-17）:

- 実装: tags を含めた削除対象一覧が追加され、`deleteAccount` がその一覧に従って削除する
  - 定数: [src/app/auth/accountDeletion.ts](../../../../src/app/auth/accountDeletion.ts)
  - 呼び出し: [src/app/auth/AuthContext.tsx](../../../../src/app/auth/AuthContext.tsx)
- テスト: 削除順序・失敗時のユーザードキュメント削除抑止はテスト済み
  - テスト: [src/app/auth/accountDeletion.test.ts](../../../../src/app/auth/accountDeletion.test.ts)
  - 実行: `npm test -- --run src/app/auth/accountDeletion.test.ts`（pass）
- テスト: `deleteAccount` が削除対象一覧に従うこと / Firestore 失敗時に Auth 削除へ進まないことをテストで担保
  - テスト: [src/app/auth/deleteAccountImpl.test.ts](../../../../src/app/auth/deleteAccountImpl.test.ts)
  - 実行: `npm test -- --run src/app/auth/deleteAccountImpl.test.ts`（pass）

## 受け入れ条件

達成チェック:

- [x] アカウント削除で tags も削除される
- [x] 既存の削除挙動（books/records）が壊れない
- [x] 仕様として「削除対象」を本ドキュメントに明記する（README には書かない運用）

補足（理想ゴールに対する最低条件）:

- [x] `users/{uid}` ドキュメント本体が存在する場合は削除される
- [x] 「削除対象の一覧」がソースと齟齬なく管理される（今後サブコレクションが増えても漏れに気づける）
- [x] 削除対象一覧の漏れをテストで検知できる（`accountDeletion.test.ts`）
  - `deleteAccountImpl.test.ts` で「削除対象一覧に従って subcollection 削除が呼ばれる」ことも検証
- [x] Firestore 側の削除が失敗した場合、Auth のユーザー削除は実行されない（= 再試行可能な状態を保つ）
  - `deleteAccountImpl.test.ts` で「Firestore 側失敗時に `deleteUser` されない」ことを直接検証

## 作業内容

### 1) 削除対象の仕様を確定

このチケットの範囲（クライアント側で実現する範囲）:

- Firestore: `users/{uid}`
- Firestore: `users/{uid}/records`
- Firestore: `users/{uid}/books`
- Firestore: `users/{uid}/tags`

検討ポイント（残す必要がある情報があるか）:

- 現状の実装上、ユーザー固有データはほぼ `users/{uid}` 配下に閉じているため「残す必要がある情報」は見当たらない。
- 例外が必要になり得るもの（本リポジトリ範囲外の可能性あり）:
  - 決済・購入証跡、問い合わせ対応ログ、法令対応の監査ログ等（保持要件がある場合のみ）
- ただし、Functions の `guestMergeRequests` のように uid を参照するトップレベルデータが存在し得る。
  - 「基本的にすべて削除」を厳密に満たすには、サーバー側（Admin 権限）での一括削除が必要。

### 2) 実装を揃える

- `deleteCollectionDocs` の対象に tags を追加
- 削除対象一覧は定数で一元管理し、`deleteAccount` がその一覧を走査することをテストで保証する
- 件数増加時の失敗パターンを考慮（段階的削除/リトライ等は将来検討）

削除の順序（仕様）:

1. Firestore: `users/{uid}/records` を削除
2. Firestore: `users/{uid}/books` を削除
3. Firestore: `users/{uid}/tags` を削除
4. Firestore: `users/{uid}` ドキュメントを削除（必須）
5. Auth: `deleteUser`（最後に実行）

失敗時の扱い（仕様）:

- 1〜4 のどこかが失敗した場合、処理は失敗として扱い、5 へ進まない
- ユーザーは再試行できる（途中まで消えていても、残りの削除が続行される）

仕様・運用面の追加（このチケットで明文化しておく）:

- 削除対象一覧を 1 箇所に記述し、実装とレビューの観点にする（例: 本チケット or README に「削除対象」セクション）
- 追加でコレクション/サブコレクションが増えた場合は、必ずこの一覧も更新する

## 非ゴール

- Cloud Functions による recursive delete への移行（別チケット）

別チケット案:

- [RE_001-TK_024 アカウント削除のサーバー側一括削除（Admin recursive delete）](../RE_001-TK_024_アカウント削除のサーバー側一括削除.md)

## 注意

- モバイル回線などで失敗し得るため、UX（失敗時の案内）も要検討
- 「削除しました」等の完了文言の定義（Auth 削除完了なのか、Firestore 含めた全削除完了なのか）は、サーバー側一括削除と合わせて [RE_001-TK_024](../RE_001-TK_024_アカウント削除のサーバー側一括削除.md) で決める
