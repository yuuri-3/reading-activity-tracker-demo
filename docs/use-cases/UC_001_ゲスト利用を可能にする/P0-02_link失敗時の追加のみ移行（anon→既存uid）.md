# P0-02 link失敗時の追加のみ移行（anon→既存uid）

このチケットは `linkWithPopup` が失敗するレアケース（例: Google 資格情報が既に別 uid に紐付いている）でも、ゲストデータを失わないためのフォールバックです。

## ゴール

- link できない Google アカウントでも、ゲスト（匿名）で作ったデータがログイン後に見える
- 既存クラウドデータを消さない（削除/全置換/上書きしない）

## 対象

- [src/app/auth/AuthContext.tsx](../../../src/app/auth/AuthContext.tsx)
- Firestore: `users/{uid}/tags|books|records`
- Toast: sonner（`toast`）

## トリガ条件

- `signInWithGoogle()` にて、匿名ユーザーで `linkWithPopup` が `auth/credential-already-in-use` 等で失敗した場合

## 移行アルゴリズム（実装要件）

1. （まだ anon のまま）`users/{anonUid}/tags|books|records` を `getDocs()` で読み出し、メモリに保持する
2. その後 `signInWithPopup` で Google アカウントにログインする（P0 は popup 前提）
   - redirect はページリロードで 1 のメモリが失われるため、P0 の「追加のみ移行」対象外
3. ログイン後 uid に対して、`tags → books → records` の順で `writeBatch()` + `setDoc(..., { merge: true })` 相当で「追加のみ」書き込み

### 冪等性

- docId を維持し、`merge: true` 相当で書くことで、同じデータを再コピーしても破綻しないこと

### クリーンアップ

- この段階では anon 側データは削除しない（クライアントだけで削除まで行うと失敗時に危険）

## UI/UX

- P0-01 と同様に、Google ログイン開始前に統合確認ダイアログを出す
  - キャンセル時は Google ログインを開始しない（匿名状態を維持）
- 移行中/失敗時は既存 UI の範囲で通知する
  - 失敗時は Toast で最小限のエラー表示

## 受け入れ条件

- link できない Google アカウントでも、ゲストで作ったデータがログイン後に見える
- 既存クラウドデータが消えない（削除や全置換を行わない）

## 非ゴール

- 重複排除の高度化、競合解決（updatedAt 上書き）は行わない
- redirect フローでの「追加のみ移行」の対応（必要なら P1 で永続退避方式を検討）
