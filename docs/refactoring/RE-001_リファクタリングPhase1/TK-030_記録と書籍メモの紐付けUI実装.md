# TK-030 記録と書籍メモの紐付け（UI 実装）

このチケットは、TK-028・TK-029 で実装したロジックを UI に反映し、記録カードに書籍メモを表示し、削除時の確認ダイアログを実装する。これにより、ユーザーは記録画面から書籍メモも確認・編集できるようになる。

## ゴール

- 記録カードに紐付けられた書籍メモの内容を表示
- 記録編集フォームに書籍メモが表示され、編集可能
- 記録削除時、書籍メモも削除するか確認するダイアログを表示
- 書籍を選択せずに登録された書籍メモも、記録画面から閲覧・編集できる

## 対象

- [src/app/components/ListCard.tsx](../../src/app/components/ListCard.tsx)
- [src/app/pages/RecordSingleView.tsx](../../src/app/pages/RecordSingleView.tsx)
- [src/app/components/DeleteConfirmDialog.tsx](../../src/app/components/DeleteConfirmDialog.tsx) - 新規作成

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

達成チェック:

- [ ] 記録カードに書籍メモが表示される（グレーの小さいテキストで書籍名の下）
- [ ] 記録カードをタップして編集画面を開くと、書籍メモ欄に内容が表示される
- [ ] 書籍メモを編集して保存すると、カードの表示も更新される
- [ ] 記録削除ボタンをタップ時、書籍メモがあれば確認ダイアログが表示される
- [ ] 確認ダイアログで「両方削除」を選択すると、記録と書籍メモが削除される
- [ ] 確認ダイアログで「記録のみ削除」を選択すると、記録のみ削除される
- [ ] 書籍メモがない記録は従来通り即座に削除される（トースト + Undo）

## 作業内容

### 1) ListCard の Record タイプに書籍メモ表示を追加

`src/app/components/ListCard.tsx`:

- `RecordVariantProps` に `bookNote?: React.ReactNode` を追加
- カード内のレイアウト順序：
  1. 時間・日付
  2. 記録メモ（`recordNote`）
  3. 書籍メモ（`bookNote`）- グレー・小さめのテキスト
  4. 書籍名（`bookName`）
  5. タグ（`tagsNode`）

実装例:

```tsx
{
  recordNoteNode ? (
    <p className="text-sm whitespace-pre-wrap">{recordNoteNode}</p>
  ) : null;
}

{
  bookNote ? (
    <p className="text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-muted-foreground/30 pl-2">
      {bookNote}
    </p>
  ) : null;
}

{
  bookName ? (
    <p className="text-sm text-muted-foreground truncate">{bookName}</p>
  ) : null;
}
```

### 2) RecordSingleView でカード表示時に書籍メモを渡す

`src/app/pages/RecordSingleView.tsx`:

- 記録表示時、`bookMemoId` から書籍メモを取得
- `ListCard` の `bookNote` prop に書籍メモのテキストを渡す

実装方針:

```tsx
const book = record.bookId ? getBook(record.bookId) : null;
const linkedMemo =
  record.bookMemoId && book
    ? book.memos?.find((m) => m.id === record.bookMemoId)
    : null;

<ListCard
  type="Record"
  durationSeconds={record.duration}
  dateTime={record.startTime}
  recordNote={record.memo}
  bookNote={linkedMemo?.text}
  bookName={book?.title}
  // ...
/>;
```

### 3) 削除確認ダイアログの実装

`src/app/components/DeleteConfirmDialog.tsx` を新規作成:

- Dialog コンポーネントを使用
- タイトル: 「記録を削除」
- 説明: 「この記録と一緒に作成された書籍メモがあります」
- 書籍メモのプレビュー（最初の 50 文字程度）
- ボタン:
  - 「キャンセル」- 何もしない
  - 「記録のみ削除」- 記録だけ削除
  - 「両方削除」- 記録と書籍メモを削除（警告スタイル）

`src/app/pages/RecordSingleView.tsx`:

- `handleDelete` で `DeleteConfirmDialog` を表示
- ユーザーの選択に応じて削除処理を実行

### 4) Storybook ストーリーの追加

`src/app/components/ListCard.stories.tsx`:

- `RecordWithBookMemo` ストーリーを追加
- 書籍メモありの記録カードを表示

`src/app/components/DeleteConfirmDialog.stories.tsx`:

- 削除確認ダイアログのストーリーを追加

## 非ゴール

- 記録カードから書籍詳細へのリンク（将来対応）
- 書籍メモの編集履歴（将来対応）
- 紐付けの手動変更 UI（将来対応）

## 注意

- 書籍メモのテキストが長い場合は省略表示（`max-lines` や `truncate`）
- 削除確認ダイアログは記録削除時のみ表示（書籍メモ単独削除は従来通り）
- レスポンシブ対応（モバイル・デスクトップ両方で適切に表示）

## 関連チケット

- TK-028: 記録と書籍メモの紐付け（DB 構造変更と既存データ移行）【前提】
- TK-029: 記録と書籍メモの紐付け（コンポーネントロジック実装）【前提】
