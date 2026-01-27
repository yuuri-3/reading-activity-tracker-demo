# P1-TK-011 Firestore データモデル改善（Timestamp 化 + BookMemo サブコレ化）

このチケットは、現状の「日時が文字列」「BookMemo が配列で肥大化し得る」ことで将来詰まりやすい Firestore モデルを、**既存データを守りながら**新形式へ段階移行できる状態にする。

## TL;DR（実装者向け）

- 新形式: 日時は Firestore Timestamp、BookMemo は `books/{bookId}/memos/{memoId}` のサブコレ
- 移行: 本番 Firestore に対して Admin SDK スクリプトでバックフィル（冪等）
- 検証: トンネルでつないだプレビューで本番（バックフィル後）を確認し、OK ならそのままデプロイする
- 旧形式データは残す（削除/一掃と移行リトライ手順は TK-026）

## 実装状況

Status: ✅ 完了

### 2026-01-27 完了メモ

- ✅ バックフィル（Admin SDK）: [functions/src/admin/backfillTk011.ts](../../../functions/src/admin/backfillTk011.ts)
  - Books/Records/Tags の `createdAt/startTime/endTime` を Timestamp 化（merge 更新）
  - 旧 `books.memos[]` を `books/{bookId}/memos/{memoId}` に展開（重複 ID は suffix 付与）
  - `--write` 指定時のみ書き込み、結果は failures 付きで JSON 出力
  - 本番アカウント 1 つで実施し、トンネルのプレビューで表示/検索が成立することを確認済み（ユーザー報告）
- ✅ アプリ側は新形式のみ（Timestamp + memos サブコレ）で読み書きする
  - 購読/表示: [src/app/context/AppContext.tsx](../../../src/app/context/AppContext.tsx) が `books/{bookId}/memos` を購読し、アプリ内検索は `includes` で従来通り成立
  - 書き込み: Books/Tags/Records は Timestamp、BookMemo はサブコレへ保存
- ✅ 旧形式を完全に読まない（フォールバック無し）
  - 日時が Timestamp でない場合は `migrationIssues` に積み上げ、主要画面/検索を停止して案内のみ表示
  - UI: [src/app/App.tsx](../../../src/app/App.tsx)
- ✅ guest merge は books/tags/records に加えて memos サブコレもコピー対象
  - Functions: [functions/src/index.ts](../../../functions/src/index.ts)
  - クライアント側フォールバック移行: [src/app/auth/AuthContext.tsx](../../../src/app/auth/AuthContext.tsx)

## 対象（実装の主戦場）

- 型定義: [src/app/types/index.ts](../../../src/app/types/index.ts)
- Firestore 購読/更新: [src/app/context/AppContext.tsx](../../../src/app/context/AppContext.tsx)
- ゲスト統合（guest merge）: [src/app/auth/AuthContext.tsx](../../../src/app/auth/AuthContext.tsx)

## スコープ

### このチケットでやること（= TK-011 の完了条件）

- 日時フィールドを Timestamp 前提へ移行する（新規書き込み + 既存データのバックフィル）
- BookMemo をサブコレクションへ移行する（読み書き + 既存配列からのバックフィル）
- アプリの通常表示を **新形式のみ** にする（最終状態として旧形式フォールバックは持たない）
- 移行漏れ/移行失敗を UI で検知し、対象を特定できる状態にする
- 体験維持: 既存の検索体験（記録メモ + 書籍メモ + タグ名の部分一致）が、見た目/操作を変えずに引き続き成立する（裏側の取得元のみ新形式に追従）

### このチケットでやらないこと（= TK-026 へ）

- 旧形式データの削除/一掃（旧フィールド、旧 `memos: BookMemo[]` 配列など）
- 旧形式を残したまま運用する期間の最終判断（目安は後述、実施判断は TK-026 で再確認）

関連: [TK-026](../TK-026_旧形式データ一掃（削除）と移行リトライ手順.md)

## 決定事項（仕様）

### 0) 方針（補足）

- 移行は **短期間で一気に切り替える** 方針を採用する（利用者が実質 1 名で、移行作業中は本番アプリ利用者が 0 を担保できるため）
- BookMemo は **サブコレクション化** する

### 1) 新形式スキーマ（パス/フィールド/ID 規約）

既存のコレクション構造（`users/{uid}/...`）は維持し、型を Timestamp 化する。
BookMemo はサブコレクション化する。

#### Books

- パス: `users/{uid}/books/{bookId}`
- フィールド:
  - `title`, `author?`, `createdAt: Timestamp`
  - 旧 `memos: BookMemo[]` は新形式では使用しない（削除は TK-026）

#### BookMemos（新規）

- パス: `users/{uid}/books/{bookId}/memos/{memoId}`
- フィールド: `text`, `createdAt: Timestamp`
- `memoId`: バックフィル時に旧 `BookMemo.id` を採用（冪等性のため）

#### Records

- パス: `users/{uid}/records/{recordId}`
- フィールド: `bookId?`, `duration`, `memo`, `tagIds?`, `startTime: Timestamp`, `endTime: Timestamp`, `createdAt: Timestamp`

#### Tags

- パス: `users/{uid}/tags/{tagId}`
- フィールド: `text`, `description?`, `createdAt: Timestamp`

### 2) 変換ルール（旧 → 新）

- 日付文字列（ISO 想定）→ Timestamp
  - 既存データが重要なため、変換できない値を「それっぽい値」で埋めない
  - 変換: `new Date(文字列)` を用いて解釈し、Timestamp 化する
  - 失敗: `Invalid Date` になる場合は **移行失敗**（`now` などで補完しない）
  - 切替条件: 失敗が 1 件でもある場合、アプリを「新形式のみ表示」に切り替えない
  - 新形式のみ表示以降、日時フィールドは Timestamp のみを正とする
  - 文字列のまま残っている日時は移行漏れとして失敗扱いにし、切替をブロックする
- BookMemo 配列 → サブコレクション展開
  - 旧 `Book.memos: BookMemo[]` を、新 `users/{uid}/books/{bookId}/memos/{memoId}` へ展開する
  - 1 件の BookMemo から 1 件の memo ドキュメントを作る
    - `text`: 旧 `BookMemo.text`
    - `createdAt`: 旧 `BookMemo.createdAt` を Timestamp 化（失敗は移行失敗）
  - `memoId` の決め方
    - 原則: 旧 `BookMemo.id` をそのまま採用
    - 例外: 同一 Book 内で `BookMemo.id` が重複している場合は、全件欠落なく移行するため `memoId = "{id}_{index}"` のように suffix を付与
  - 並び順
    - 取得/表示は `createdAt` の降順を基本とする

### 3) 冪等バックフィル設計

バックフィルは「何回実行しても壊れない」を必須要件とする

- 移行済みフラグは基本持たない（フラグのスキーマ追加・保守を増やさない）
- 書き込み戦略
  - Books/Records/Tags: 同一ドキュメント ID に対して `set(..., { merge: true })` 相当で更新
  - BookMemos: `memoId` を安定化し、同一 `memoId` に `set(..., { merge: true })` 相当で上書き
- 再実行時の期待動作
  - 途中で失敗しても、再実行で不足分が補完され、重複は発生しない
  - 変換に失敗したデータは「失敗一覧」として可視化し、修正後に再実行する

### 4) 移行漏れの検知（新形式のみ表示にするための安全装置）

- 失敗件数が 1 件でもある場合は、画面上に警告を表示する
- PDM が原因を特定できるように「何が失敗したか（対象の種類/ID）」を確認できる状態にする

#### 4.1) 旧形式を完全に読まない（フォールバック無し）

このチケット完了時点では、アプリは **旧形式を一切フォールバックせず**、新形式（Timestamp + memos サブコレ）以外を「不正」として扱う。

- 日時フィールド（`createdAt/startTime/endTime`）が Timestamp でない場合
  - 文字列（ISO）であっても **読まずに** `migrationIssues` に積み上げる
  - 値は表示用に補完しない（空/Invalid 扱い）
- `migrationIssues.length > 0` の場合
  - **主要画面/検索を停止**し、移行案内のみ表示する（機能利用をブロック）
  - 詳細（`kind/refPath/reason`）を UI 上で確認・コピーできる
  - `migrationIssues` が 0 件になった時点で、自動的に通常表示へ復帰する

### 5.1) バックフィルの実行方式（運用）

バックフィルは **Admin SDK スクリプトで本番 Firestore に対して実行**する

- 前提: 移行作業中は本番アプリ利用者が 0 であり、アプリ以外の書き込み（Cloud Functions / 別端末 / バッチ等）も発生しない
- 実行前: 本番データのバックアップ（export 等）を取る
- 実行者: PDM
- 誤実行防止: 実行対象プロジェクト / UID をホワイトリストで限定する
- 途中失敗しても再実行できる（冪等設計）

#### 5.2) 実行手順（ローカル / Admin SDK）

- スクリプト: [functions/src/admin/backfillTk011.ts](../../../functions/src/admin/backfillTk011.ts)
- 事前準備（認証）
  - いずれかで ADC を用意する
    - `gcloud auth application-default login`
    - `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`
- 実行（まず dry-run）
  - `npm --prefix functions run build && node functions/lib/admin/backfillTk011.js --project=<PROJECT_ID> --uid=<UID> --out=./.tmp/tk011-dry-run.json`
- 実行（書き込み）
  - `npm --prefix functions run build && node functions/lib/admin/backfillTk011.js --project=<PROJECT_ID> --uid=<UID> --write --allowed-uids=<UID> --out=./.tmp/tk011-write.json`

ガード方針:

- 書き込みは `--write` 指定時のみ行う（デフォルトは dry-run）
- `--project` と `--uid/--uids` を必須にし、対象を明示してから実行する
- 誤実行防止のため、書き込み時は `--allowed-uids` を必須にする（対象 UID ホワイトリスト）
- 失敗 1 件でもあればデプロイしない（5.1 に従う）

### 6.1) 移行手順（ゼロユーザー前提の短期ビッグバン）

本チケットは「移行作業中は本番アプリ利用者が 0」を担保できる前提のため、段階リリースではなく短期ビッグバンで移行する。

1. 事前バックアップ
2. 本番 Firestore に対してバックフィルを実行（Admin SDK スクリプト）
3. 失敗 0 を確認
   - 失敗が 1 件でもあれば **デプロイしない**
   - 必要ならバックアップから復元し、原因修正後にバックフィルを再実行する
4. トンネルでつないだプレビューで、本番（バックフィル後）の表示・検索が成立することを確認
5. 新形式のみ表示の実装を本番へデプロイ

補足: 本番ユーザー 0 を担保できるため、本チケットでは dual-write（旧 `memos[]` と新サブコレへの二重書き込み）は行わない

### 7) Firestore Rules（サブコレ対応）

Rules が `users/{uid}/{document=**}` を本人のみ許可しているため、
`users/{uid}/books/{bookId}/memos/{memoId}` も同じく本人のみ read/write を満たす

### 8) ゲスト統合（guest merge）時の扱い

データの正を新形式に寄せるため、ゲスト統合で移行対象をコピーする際は、
`books` ドキュメント本体だけでなく **各 book の `memos` サブコレクションもコピー対象**に含める

- 対象: `users/{uid}/books/{bookId}/memos/{memoId}`
- `memoId` は維持（冪等性・重複回避）

## 実装ガイド（推奨の進め方）

6.1 の移行手順（短期ビッグバン）に沿って進める

1. 型/境界の確定

- `createdAt/startTime/endTime` を Timestamp 前提の型へ寄せ、UI 側は Timestamp から表示/整列する

2. 新形式の読み書きを実装

- 新規作成時に Timestamp で保存する
- BookMemo 追加はサブコレに `memo` ドキュメントを作る
- 表示・検索は新形式のみ（Timestamp + memos サブコレ）で成立するようにする

3. バックフィル（Admin SDK スクリプト）

- 旧 → 新の変換を行い、冪等に書き込む
- 失敗一覧（対象の種類/ID/理由）を確認できるようにする（ログ/結果出力）

4. トンネルプレビューで検証 → 本番デプロイ
5. guest merge 対応

- `books/{bookId}/memos/*` のコピーを追加

## 受け入れ条件

- [x] `createdAt/startTime/endTime` を Timestamp として扱う方針が **実装に反映**されている
- [x] BookMemo の格納方式が **サブコレクション**になっている（読み書き・表示ともに）
- [x] バックフィルが冪等である（途中失敗後も再実行で収束し、重複しない）
- [x] バックフィルの失敗/移行漏れが 1 件でもある場合、主要画面/検索が **停止**され、案内のみ表示になる（切替をブロックできる）
- [x] バックフィル完了後、アプリの通常表示は **新形式のみ**（旧形式フォールバック無し・旧形式を読まない）
- [x] 移行漏れ/移行失敗が UI で検知でき、対象（種類/ID/理由）が確認できる
- [x] 検索体験が維持されている（記録メモ + 書籍メモ + タグ名が部分一致でヒットする）
- [x] 移行作業中は本番アプリ利用者が 0 であり、アプリ以外の書き込みも発生しない前提が明文化されている
- [x] 「一気に移行 → 確認」までができる手順になっている（問題時のリトライは TK-026 で定義する）
- [x] 移行後の「問題がないか確認する期間」は TK-026 で扱う（本チケットの完了条件からは除外）
- [x] 旧形式データは削除しない（削除/一掃とリトライ手順は TK-026）
- [x] ロールバック方針（不具合時にどう復旧するか）がドキュメント化されている

## ロールバック/停止条件（運用上の安全策）

### 停止条件（これが起きたら止める）

- バックフィルの失敗が連続する / 原因不明の失敗が増える
- 新形式のみ表示で、既存データの欠落が広範囲に出る

### 停止したらやること

- 旧データは残る前提なので、表示/保存の不具合をホットフィックスで復旧しつつ原因を切り分ける
- 失敗一覧から原因を特定し、バックフィルを修正して再実行

### ロールバック（不具合時）

- 判断者: 直近の運用では **PDM（あなた）** が判断してよい（実質単独利用のため）
- 手段: **本番へ即時反映できる前提**なので、ホットフィックスで復旧する
- 旧データ削除前であれば、バックフィルを修正してリトライできる
- （将来）旧データ削除後に問題が発覚した場合の扱いは、旧データ削除チケット側で定義する

### 安全策（怖さを減らすためのチェックリスト）

バックフィルは「旧データを消さずに新形式を生成する」方針でも、手順を誤ると見え方の不整合が出ます。
実施前に以下を満たすことで、事故確率を大きく下げられます。

- 実施前に「対象ユーザー数/対象ドキュメント数」を把握する（規模感の見積もり）
- バックフィルは **冪等**（同じ処理を 2 回実行しても結果が壊れない）にする
- バックフィルは「少量（例: 1 ユーザー分）」で試してから全量へ拡大する
- ログ（処理件数/失敗件数）を残し、失敗は再実行できるようにする
- バックアップを取ってから実施する

## 補足（確認期間の目安）

- 旧形式データを残したまま「問題がないか確認する保険期間」は **1 か月を目安**とする
- ただし、旧形式データの削除/一掃の実施判断と、移行リトライ手順の確定は TK-026 で扱う

## 検索（部分一致/絞り込み）についての補足

このチケット（TK-011）の主目的は「Timestamp 化 + BookMemo サブコレ化 + 段階移行」だが、
サブコレ化により「検索対象データの格納場所」が変わるため、検索の扱いは事前に方針メモを残す

本チケット完了時点の最低限（体験維持）

- 既存の検索 UI/操作は変えない
- BookMemo がサブコレに移るため、移行完了後は検索対象（書籍メモ本文）の取得元を新形式へ追従する
- 検索の高度化（期間絞り込み、ページング、横断検索の最適化等）は TK-027 側で扱う

### 本チケットでの「書籍メモ検索」の取得方式（体験維持のための最小）

記録画面の検索は、現状「手元にあるデータに対する部分一致（`includes`）」で成立している
検索体験を変えないために、段階ごとに「検索対象となる書籍メモ本文が常に手元にある」状態を作る

- books を購読し、各 book の `users/{uid}/books/{bookId}/memos` を購読して集約する（Rules と整合）
  - 取得元がサブコレに変わるだけで、検索 UI/操作は変えない
- UI/検索用にはフラットな参照 DTO を使う（`BookMemo` 自体に `bookId` は追加しない）
  - 例: `BookMemoRef = { bookId, memoId, text, createdAt: Timestamp }`

注意/補足

- `collectionGroup("memos")` は、ドキュメントに `ownerUid` 等のフィールドを持たない限り「本人の uid 配下だけ」をクエリ条件で保証できず、Rules の判定で弾かれやすい。そのため本チケットでは採用しない。
- 件数増加で重くなった場合の段階導入（ページング/期間絞り込み等）は TK-027 へ寄せる
- Firestore は「文字列の部分一致（contains）」をサーバー側クエリで直接は提供しないため、現状の体験維持は「取得 → アプリ内 `includes`」が前提になる。性能や品質の上限が見えたら、設計・実装は TK-027 で詰める。

関連: [TK-027\_検索（部分一致）の方針決定](../TK-027_検索（部分一致）の方針決定.md)

## 非ゴール

- Firestore 全データの完全再設計（スキーマ全体の作り直し）
- 旧形式データの削除（別チケットで判断）

## 注意

- ゲスト統合が「スキーマ揺れ」を吸収しているため、互換の範囲を明示しないと保守が重くなる
