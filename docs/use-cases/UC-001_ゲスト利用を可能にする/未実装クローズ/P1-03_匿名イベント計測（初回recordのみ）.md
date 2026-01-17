# P1-03 匿名イベント計測（初回 record のみ）

## ゴール

- 「一つ以上の記録を作ったゲスト（匿名ユーザー）の規模感」を把握できるようにする
- 常時トラッキングではなく、匿名ユーザーの初回 record 作成時に 1 回だけ送信する

## 対象

- [src/app/firebase/firebase.ts](../../../../src/app/firebase/firebase.ts)
- AppContext の record 作成処理（匿名ユーザー時）
- 新規: `src/app/utils/guestInstallId`（端末内にランダム ID を永続するヘルパ）

## 実装状況

Status: 📴 未実装クローズ（Firestore で目的を代替できるため）

## クローズ理由

- 匿名認証の導入により、ゲスト利用開始時点で Firebase Auth 上にユーザーが作成され、規模感が把握できるようになった
- 本チケットの当初ゴール（「1つ以上 record を作ったゲスト人数」）も、現状の実装では Firestore 上で概ね代替できる
  - ゲストが book/record を 1つ以上作成して初めて Firestore にユーザーが出現する運用のため、「Firestore に表示されているユーザー ≒ 1つ以上作成したゲスト」とみなせる
- 追加の常時トラッキング（GA4 イベント送信）を導入せず、実装・プライバシー対応のコスト/リスクを増やさない方針とする

メモ:
- もし将来「record の初回作成コンバージョン」をプロダクト側で継続観測したくなった場合は、GA4 の `guest_first_record` を復活検討する

## 受け入れ条件

達成チェック:

- [ ] 匿名ユーザーで初回 record 作成時にのみ、イベントが 1 回送られる
- [ ] 2 件目以降の record 作成では送られない
- [ ] ログイン後の record 作成では送られない

## 作業内容

### 手段（推奨）

- Firebase Analytics（GA4）

### 前提（実装要件）

- `VITE_FIREBASE_MEASUREMENT_ID` が設定されている場合のみ有効化する
- 計測が無効/ブロックされてもアプリの機能は壊れない（例外は握りつぶし、UX を優先）

### 仕様詳細（実装要件）

- 端末/ブラウザ単位の匿名 ID（例: `guestInstallId`）を 1 回生成し、localStorage に保持する
- 匿名ユーザー（`user.isAnonymous === true`）で record を作成した時に、次を満たす場合のみイベント `guest_first_record` を送る
  - その端末で初めての送信
- イベントに含める情報は最小限
  - 例: `guestInstallId`, `isGuest: true`, `appVersion`（任意）
- record の中身（タイトル・メモ・duration・bookId・tagIds 等）は送らない

## 非ゴール

- 常時トラッキングの導入
- record の内容（タイトル/メモ等）をイベント送信すること
