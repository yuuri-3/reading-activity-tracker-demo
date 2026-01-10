# P0-01 ゲスト入場と Google リンクログイン（Sanctum 導線・統合確認）

このチケットは「ゲスト入場」だけを単独反映すると、ゲストが後でログインした際に uid が変わり、データが消えたように見える事故が起き得るため、必ず同時に反映する単位です。

## ゴール

- 未ログインでアプリを開いても、ユーザーが明示的に選べばゲスト（匿名認証）として全画面に入れる
- 匿名ユーザーが Google ログインしたときに、可能な限り uid を変えずにログイン状態へ昇格（link 優先）させ、通常ケースでは移行不要にする
- 匿名ユーザーがログイン操作に到達できる導線を Sanctum に用意する

## 対象

- [src/app/App.tsx](../../../src/app/App.tsx)
- [src/app/auth/AuthContext.tsx](../../../src/app/auth/AuthContext.tsx)
- [src/app/auth/AuthGate.tsx](../../../src/app/auth/AuthGate.tsx)
- [src/app/auth/components/SignInScreen.tsx](../../../src/app/auth/components/SignInScreen.tsx)
- [src/app/pages/SanctumPage.tsx](../../../src/app/pages/SanctumPage.tsx)
- Dialog: [src/app/components/Dialog.tsx](../../../src/app/components/Dialog.tsx)

## 実装状況

Status: ✅ 完了（受け入れ条件を満たす）

## 受け入れ条件

達成チェック:

- [x] 未ログインでアプリを開くと SignInScreen が表示される
- [x] SignInScreen の「ログインせず利用する」で匿名認証に成功すると、計測（home）が表示され操作できる
- [x] ゲストでも本棚/記録/書斎に遷移できる
- [x] ゲスト（匿名）で Sanctum に「Google でログイン」導線が表示され、統合確認ダイアログが 1 回表示される
- [x] ゲスト（匿名）で作った books/records/tags が、Google ログイン後も同じ uid のまま見える
- [x] 既存のログイン操作（非匿名ユーザーの通常ログイン/ログアウト）は従来通り動作する

## 作業内容

### 追記事項（合意済み方針）

- AuthContext に追加する匿名入場 API 名は `signInAnonymously` とする
- Sanctum のエラー表示は `AuthContext.error` をそのまま表示で OK（P0-01 では整形は最小限）
- `credential-already-in-use` 等で link 失敗した場合の文言は「統合できなかった。ゲストのまま利用できます」系で OK（詳細設計・文言詰めは P0-02 で扱う）

### 1) AuthGate: 未ログイン時に SignInScreen を表示

- 起動時に匿名ユーザーを自動作成しない
- user が未確定（null）の場合は SignInScreen を表示する

### 2) SignInScreen: 「ログインせず利用する」導線を追加

- ユーザーが明示的に選択した場合のみ `signInAnonymously()` を実行
- 匿名認証中は既存のローディング UI を使用
- 匿名認証失敗時は SignInScreen 上でエラー表示し、リトライ可能にする

### 3) Sanctum: ログイン導線（Google ログイン）を設置

- 現在ログイン中のアカウント情報を表示している場所に、
  - ログイン済み: 現状通り（アカウント表示 + ログアウト等）
  - 匿名ユーザー: 「Google でログイン」ボタンを表示

### 4) Google ログイン: 匿名ユーザーの場合は link 優先

- 匿名ユーザーが Google ログインを開始する前に、統合確認ダイアログを出す
  - 文言例: 「この端末のゲストデータを、これからログインするアカウントに統合します」
  - ボタン: キャンセル / 続行
  - キャンセル時は Google ログインを開始しない（匿名状態を維持）
- `signInWithGoogle()` 内で `auth.currentUser?.isAnonymous` の場合は、まず `linkWithPopup(currentUser, provider)` を試す
  - popup が利用できない場合のみ redirect フォールバック（従来の挙動を踏襲）
- link 成功時:
  - uid が変わらない（`users/{uid}/...` をそのまま参照できる）
  - 既存 UI/ルーティングは変えない

## 非ゴール

- 新しいページ/モーダル/導線を増やす（本チケットに記載した範囲のみ）
- 高度な競合解決（updatedAt ベースのマージ等）は行わない

## 注意

- Anonymous Authentication は Firebase Console 側で有効化済みを前提
- link 失敗時の「追加のみ移行」は次チケット（P0-02）で扱う
