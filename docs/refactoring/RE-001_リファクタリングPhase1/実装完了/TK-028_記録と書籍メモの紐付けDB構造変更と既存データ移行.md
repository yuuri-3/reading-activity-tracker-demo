# TK-028 記録と書籍メモの紐付け（DB 構造変更と既存データ移行）

このチケットは、計測画面で一緒に登録した記録メモと書籍メモを明示的に紐付けるため、ReadingRecord に `bookMemoId` フィールドを追加し、既存データの移行を行う。これにより、記録編集・削除時に関連する書籍メモも操作できるようになる。

## ゴール

- `ReadingRecord` に `bookMemoId` フィールドを追加（optional）
- 既存データに対して、同じ書籍・同じ時刻付近の記録と書籍メモを紐付ける移行処理を実装
- 移行後、記録画面で書籍メモも表示・編集できる基盤を確立

## 対象

- [src/app/types/index.ts](../../src/app/types/index.ts)
- [src/app/context/AppContext.tsx](../../src/app/context/AppContext.tsx)
- [functions/src/admin/](../../functions/src/admin/) - 新規移行スクリプト
- Firestore の `users/{uid}/records` コレクション

## 実装状況

Status: ✅ 完了

## 受け入れ条件

達成チェック:

- [x] `ReadingRecord` 型に `bookMemoId?: string` が追加されている
- [x] 新規作成時、書籍メモを一緒に登録した場合は `bookMemoId` が設定される
- [x] 既存データに対して移行スクリプトを実行でき、同時刻付近の記録と書籍メモが紐付けられる
- [x] 移行後も既存機能（記録作成・編集・削除・書籍メモ作成・編集・削除）が正常動作する
- [x] 紐付けがない記録・書籍メモも引き続き正常に動作する

## 作業内容

### 1) 型定義の更新

`src/app/types/index.ts`:

```typescript
export interface ReadingRecord {
  id: string;
  bookId?: string;
  bookMemoId?: string; // 追加: 一緒に作成された書籍メモのID
  duration: number;
  memo: string;
  tagIds?: string[];
  startTime: string;
  endTime: string;
  createdAt: string;
}
```

### 2) 新規作成時の紐付け実装

`src/app/pages/RecordSingleView.tsx` および `src/app/pages/TimerPage.tsx`:

- 記録保存時に書籍メモも作成する場合、作成した `bookMemoId` を記録に設定
- `AppContext.addRecord` は `bookMemoId` を受け取れるようにする

実装方針:

```typescript
// 1. 書籍メモを先に作成してIDを取得
const memoId = await addBookMemo(selectedBookId, bookMemo.trim());

// 2. 記録作成時に bookMemoId を設定
await addRecord({
  // ... その他フィールド
  bookMemoId: memoId,
});
```

### 3) 既存データの移行スクリプト作成

事前調査（取り漏れ見積もり）:

- `functions/src/admin/analyzeTk028Linkage.ts` を実行し、window=5 分の条件で
  - 紐付け可能数 / 紐付け不可数（記録・書籍メモ）
  - 近接差分（最小差分の分数）サンプル
    を JSON 出力で確認する

`functions/src/admin/backfillTk028.ts`:

- 全ユーザーの記録と書籍メモを取得
- 以下の条件で紐付け候補を検出：
  - 記録の `bookId` と書籍メモの所属書籍が一致
  - 記録の `createdAt` と書籍メモの `createdAt` の差が 5 分以内
  - 記録に `bookMemoId` が未設定
  - 書籍メモがまだ他の記録に紐付いていない
- マッチした場合、記録に `bookMemoId` を設定
  - 候補が複数ある場合は `createdAt` 差分が最小の 1 件に紐付ける（案 A）

安全性:

- dry-run モード（`--write` なしでは書き込まない）
- 対象 UID 制限（`--allowed-uids` がない限り実行しない）
- 実行結果を JSON ファイルに出力

### 4) AppContext の更新

`src/app/context/AppContext.tsx`:

- `addBookMemo` が作成した書籍メモの ID を返すように変更
- `addRecord` が `bookMemoId` を受け取れるように更新

## 非ゴール

- UI での表示・編集機能（TK-029, TK-030 で対応）
- 記録削除時の書籍メモ削除確認（TK-029 で対応）
- 紐付けの手動変更機能（将来対応）

## 注意

- `bookMemoId` は optional なので、紐付けがない記録も引き続き動作する
- 移行は既存データのみが対象（新規作成時は自動で紐付けられる）
- 移行後、同じ記録に対して複数回実行しても冪等性を保つ
- 同時刻付近の許容範囲は 5 分固定で進める（方針 A）
- 移行の安全性検証は「匿名化した本番コピーを用意した検証環境」で事前に行う方針とする

## 補足調査結果（2026-02-01）

- 取り漏れ見積もり（window=5 分、UID: CEBkqCIUTLemMeRMmiAHNhNIgTB2）
  - 書籍メモ総数: 25
  - 記録総数: 209
  - `bookId` あり: 72（`bookMemoId` あり: 0）
  - 紐付け対象（`bookId` あり & `bookMemoId` なし）: 58
  - 紐付け成功: 25 / 書籍メモ側の取り漏れ: 0
  - 記録側の未紐付け: 33
  - `bookId` 欠損の記録: 137（今回の紐付け対象外）
  - 参照: [functions/tmp/tk028-linkage-estimate.json](../../../functions/tmp/tk028-linkage-estimate.json)
- 判断メモ

  - 書籍が選択されていない記録は書籍メモが存在しない想定のため、`bookId` 欠損の記録が対象外であることは問題なし
  - 書籍メモ側の取り漏れが 0 件であるため、書籍メモ → 記録の紐付け作業は支障なく進められる見込み

- 書籍未選択時に入力した書籍メモは保存されない
  - 書籍メモの保存は `selectedBookId` がある場合のみ実行されるため、未選択で入力しても永続化されない
  - 参照: [src/app/pages/RecordSingleView.tsx](../../src/app/pages/RecordSingleView.tsx)、[src/app/pages/TimerPage.tsx](../../src/app/pages/TimerPage.tsx)
- 実データ調査（UID: CEBkqCIUTLemMeRMmiAHNhNIgTB2）
  - 書籍「アフターデジタル 2 - UX と自由」（bookId: yU7RholcmIPsqDGCgx00）の `memos` サブコレは 10 件
  - memoId `1769510141126`（createdAt: 2026-01-27T10:35:41.126Z）が存在
  - その時刻付近の記録（records）は存在しない
  - 参照スクリプト: [functions/src/admin/analyzeTk028Memos.ts](../../../functions/src/admin/analyzeTk028Memos.ts)
- 書籍詳細画面の時刻表示はローカル時刻（JST など）に変換して表示されるため、UTC の `10:35` は UI 上では `19:35` として見える
  - 参照: [src/app/components/ListCard.tsx](../../src/app/components/ListCard.tsx)、[src/app/utils/format.ts](../../src/app/utils/format.ts)

## 実装完了メモ（2026-02-01）

- 実装: `bookMemoId` 追加 / 新規作成時の紐付け / 移行スクリプト追加（DB 指定対応）
- 検証（migration-test）
  - dry-run: [functions/tmp/tk028-backfill-migration-test-dry-run.json](../../../functions/tmp/tk028-backfill-migration-test-dry-run.json)
  - write: [functions/tmp/tk028-backfill-migration-test-write.json](../../../functions/tmp/tk028-backfill-migration-test-write.json)
  - post: [functions/tmp/tk028-backfill-migration-test-post.json](../../../functions/tmp/tk028-backfill-migration-test-post.json)
- 本番移行（default）
  - dry-run: [functions/tmp/tk028-backfill-prod-dry-run.json](../../../functions/tmp/tk028-backfill-prod-dry-run.json)
  - write: [functions/tmp/tk028-backfill-prod-write.json](../../../functions/tmp/tk028-backfill-prod-write.json)
  - post: [functions/tmp/tk028-backfill-prod-post.json](../../../functions/tmp/tk028-backfill-prod-post.json)
- 人手レビュー: 実データで紐付け確認済み（ユーザー確認済み）

## 関連チケット

- TK-029: 記録と書籍メモの紐付け（コンポーネントロジック実装）
- TK-030: 記録と書籍メモの紐付け（UI 実装）
