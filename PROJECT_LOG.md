# Yomzoy — 作業ログ（会話ベース）

作成日: 2025-12-21

このファイルは、GitHub Pages 公開〜 Firebase（Google ログイン + Firestore 同期）導入までの流れを、会話と試行錯誤の「軌跡」として残すメモです。

- リポジトリ: https://github.com/yuuri-3/reading-activity-tracker-demo
- 公開 URL（GitHub Pages）: https://yuuri-3.github.io/reading-activity-tracker-demo/

> 注意
>
> - API キー等の秘匿情報（`VITE_FIREBASE_*` の値）はこのログには記載しません。
> - Firebase Console の画面構成や文言は時期により変わる可能性があります。

---

## 1. ゴール（MVP）

やりたいことはシンプルに「公開できて、ログインできて、同期できる」状態。

- GitHub Pages で公開できる
- Google でログインできる（Firebase Authentication）
- ログイン後にクラウド同期される（Firestore）
- 未ログインでは使えない（仕様を単純化するため）
- 既存の localStorage データは消えて OK（移行しない）

---

## 2. 会話の流れ（時系列メモ）

### 2.1 Pages にデプロイしたい

最初の要望は「このプロジェクトを GitHub Pages にデプロイしたい」。

- Vite + React なので、Project Pages（`/{repo}/`）配下で動くよう `base` を調整する必要があった
- GitHub Actions で build → Pages deploy のワークフローを用意
- 実際にリポジトリがまだ無かったので、`gh` CLI を使ってリポジトリ作成〜push まで実行

結果: `https://yuuri-3.github.io/reading-activity-tracker-demo/` で公開成功。

（途中での小さな詰まり）

- **気づいたきっかけ/操作**: 変更を push した直後、GitHub Actions の run を見たら `cancelled` が出た。
- **挙動**: concurrency の都合で run がキャンセルされる（後続 run が優先される）。
- **解決**: `gh run list` / `gh run view` で「最新 run が `success` か」を確認し、必要なら workflow を再実行。

### 2.2 「クラウド同期したい」→ Firebase 採用

次の要望は「クラウド同期で使えるように。ログインは Google。Firebase 使いたい」。

ここで MVP を成立させるために、いくつか確認して意思決定。

- 未ログイン状態も使えるようにする？ → **未ログインは使えなくして OK**（シンプル優先）
- 既存の localStorage データは？ → **消えて OK**（移行はしない）

将来の拡張についても少しだけ話した（ただし、MVP には入れない）。

- 「本以外（動画/記事など）も将来的に扱いたい」案が出た
- 「最初からカテゴリ（book/video/article）を持つ？」 vs 「タグの方が柔軟？」を比較
- MVP は複雑にしすぎないのが大事なので、まずは **書籍 + 履歴**に集中
- 結論: **タグは将来構想として残す**（このログにも“検討した”事実として残す）

（将来的にタグを入れるフェーズになった時の“構造案”も少し話した）

- まずは **正規化**して、タグ自体は `users/{uid}/tags` に持つ（例: `{ id, name, createdAt }`）
- 書籍には `tagIds: string[]` を持たせて紐づける（表示用にタグ名を重複保存するかは後で判断）
- 履歴にタグを持たせるかは 2 案:
  - A: 履歴は `bookId` だけ持ち、表示時に「その時点の本のタグ」を参照する（シンプル）
  - B: 履歴にも `tagIds` をスナップショットとして保存する（後から本のタグを変えても履歴は当時のまま）
- タグ名の揺れ（大文字小文字/全角半角）をどうするかは、UI で入力時に正規化するのが楽
- 削除は「タグを消すと参照が壊れる」ので、まずは論理削除（`archived`）が無難そう、という話も出た

（タグ重複を避けるための UI アイデア）

- タグ入力をフリーテキストにする場合でも、既存タグを **サジェスト（オートコンプリート）**して「似たタグの重複」を減らす
  - 例: `Rea` と打ったら `Reading` を候補に出す、など
  - 既存タグを選んだ場合は新規作成せず、そのタグを紐づける

（もう少し具体的な将来像として、こんな話も出た）

- **カテゴリ**は「本」か「それ以外」か、の二択で良い（細かい種別はまず持たない）
- **タグは履歴に対して複数付けられる**ようにしたい（= 1 履歴 : N タグ）
- 将来的には **タグごとの集計画面**が欲しい
  - タグ単位で「計測合計時間」を出す
  - タグに紐づく「履歴メモ一覧」を出す（今の “本詳細” 的な見せ方）

この場合のデータ構造案（メモ）:

- アイテム側に `category: 'book' | 'other'` を持たせる（今の books だけ、から一般化するなら `items` に寄せる）
- 履歴には `tagIds: string[]` を持たせる（タグ集計のクエリ/計算をしやすくする）
- タグ集計は Firestore のクエリで履歴を集めてクライアント集計でも良いが、件数が増えたら集計用ドキュメント（例: `users/{uid}/tagStats/{tagId}`）を持つ案もある

### 2.3 ログイン画面を作って、未ログインは使えないようにする

「未ログインは使えなくて OK」に決めたので、まずはアプリにログインゲート（ログイン画面）を付けた。

- **会話で決めたこと**: ログイン導線はシンプルに（まずはポップアップログイン）。
- **実装の方向性**: アプリ全体を `AuthGate` でラップして「ログインしてから中身を使う」。

（この段階の詰まり）

- **気づいたきっかけ/操作**: ログイン画面で「Google でログイン」を押しても、何も起きない／失敗しても理由が分からない。
- **挙動**: 画面はそのまま、ログインできない。
- **解決**: `signInWithGoogle()` の例外を `try/catch` し、失敗時はエラーメッセージを表示できるようにした。

### 2.4 Firebase Auth + Firestore を実装

実装は「まずログインできる」「次にデータが同期する」の順番で進めた。

- ログイン UI はポップアップで開始（シンプル）
- `localStorage` で持っていた books/histories を Firestore に置き換え
- Firestore は realtime sync（`onSnapshot`）を採用して、Firestore を single source of truth にした

データの置き場所はユーザーごとに分離。

- `users/{uid}/books`
- `users/{uid}/histories`

（この段階の詰まり: Pages で Firebase 設定が不足）

- **気づいたきっかけ/操作**: Pages の URL を開いたら、画面に「Firebase 設定が不足しています」が出た。
- **挙動**: ログイン画面は表示されるが、設定不足エラーが出て進めない。
- **原因**: 本番ビルドに `VITE_FIREBASE_*` が入っていない（GitHub Actions Variables 未設定）。
- **解決**: Actions Variables に `VITE_FIREBASE_*` を登録して再デプロイ。

（この段階の詰まり: `auth/api-key-not-valid`）

- **気づいたきっかけ/操作**: ログイン画面で「Google でログイン」を押した。
- **挙動**: ポップアップが出かけて消える／エラー表示に `auth/api-key-not-valid` が出る。
- **原因候補**: API キーの不一致、または API キー制限。
- **解決**: Firebase Console の Web アプリ設定を確認し、GitHub Variables の値を正しいものに揃えて再デプロイ。

### 2.5 ログイン後の動作検証 → 履歴保存の詰まりを潰す

ログインできた後、MVP として「書籍登録」「タイマー計測 → 履歴保存」「リロード後も残る」を確認していった。

（詰まり: 履歴が保存されないように見える）

- **気づいたきっかけ/操作**: 本を登録せずに、計測開始 → 停止 → 終了した。
- **挙動**: 履歴が作成されない（ように見える）。
- **原因**: 停止後に開くダイアログで **保存** を押した時だけ履歴が作成されるが、×/外側クリックで閉じるとタイマーがリセットされ、結果的に“保存されない”に見えやすかった。
- **解決**: ダイアログは保存/破棄以外で閉じないようにし、失敗時はエラー表示。

（詰まり: Firestore の `undefined` エラー）

- **気づいたきっかけ/操作**: 書籍未選択のまま「保存」を押した。
- **挙動**: 保存に失敗し、エラーが表示される。
- **エラー内容**: `Unsupported field value: undefined (found in field bookId...)`
- **原因**: `bookId` 未選択の時に `bookId: undefined` をそのまま `addDoc()` に渡していた（Firestore は `undefined` を保存できない）。
- **解決**: `bookId` は「ある時だけ送る」+ 念のため書き込み時に `undefined` フィールドを除去。

#### （このあたりで一緒にやった）Firebase 設定手順メモ

`undefined` 対応そのものはアプリ側の修正だけど、同じ時期に「そもそも本番で Firebase が動く」状態を整える作業も並行してやったので、手順をここにまとめて置いておく。

##### Firebase Console 側

1. プロジェクト作成
2. Web アプリ追加（`firebaseConfig` を取得）
3. Authentication: Google を有効化（公開名/サポートメール設定）
4. Authorized domains に追加
   - `localhost`
   - `yuuri-3.github.io`
5. Firestore Database 作成
6. ルール: `users/{uid}/**` のみ read/write

##### GitHub（本番）

- Actions Variables に `VITE_FIREBASE_*` を登録（値はここには書かない）
- 反映にはデプロイ（workflow）の再実行が必要

### 2.6 スマホ（iOS）でログインが不安定/ループ → ループ対策

PC では OK でも、スマホ確認で別の問題が出た。

（詰まり: `missing initial state`）

- **気づいたきっかけ/操作**: スマホで Google ログインを進め、Google 側で ID/PW 入力後に戻ろうとした。
- **挙動**: （旧: `firebaseapp.com` / `web.app`）の画面で「Unable to process request due to missing initial state...」が表示される。
- **原因候補**: iOS / アプリ内ブラウザ等で redirect/popup の状態引き継ぎ（storage）が不安定。
- **解決（方針）**: popup/redirect の戦略を調整し、永続化の明示やループ防止フラグ等を入れて安定化。

（詰まり: ログイン画面とアカウント選択のループ）

- **気づいたきっかけ/操作**: アカウント選択後にアプリへ戻るが、またログイン画面に戻る（繰り返す）。
- **挙動**: 体感として「ログイン画面」と「アカウント選択」がループ。
- **解決（方針）**: redirect は必要時のみに絞り、redirect 実行中フラグで再実行を抑止、タイムアウトで案内を出す。
- **運用上の回避**: 「Safari で開く」を案内。

結果: スマホでもログインしてアプリに入れることを確認。

---

## 3. 変更した主なファイル（あとで追える用）

### デプロイ

- `.github/workflows/deploy-pages.yml`

### Firebase / 認証

- `src/app/firebase/firebase.ts`
- `src/app/auth/AuthContext.tsx`
- `src/app/auth/AuthGate.tsx`

### Firestore 同期

- `src/app/context/AppContext.tsx`

### 履歴保存フロー

- `src/app/components/TimerSection.tsx`
- `src/app/components/SaveTimerDialog.tsx`
- `src/app/components/AddHistoryDialog.tsx`

---

## 4. MVP 到達チェック

- [x] Pages でページが表示される
- [x] Google ログインできる（PC/スマホ）
- [x] 書籍を追加でき、リロード後も残る
- [x] タイマー計測 → 履歴保存ができ、履歴一覧に表示される
- [x] 別端末でも同じアカウントでログインするとデータが見える

---
