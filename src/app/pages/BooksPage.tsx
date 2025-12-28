import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Book } from "../types";
import { formatDuration } from "../utils/format";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { BookOpen } from "lucide-react";
import { ListCard } from "../components/ListCard";
import { BookListHeader } from "../components/book-list/BookListHeader";
import { BookListCard } from "../components/book-list/BookListCard";

export function BooksPage() {
  const { books, getTotalDurationByBook, getHistoriesByBook } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.author &&
        book.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (selectedBook) {
    return (
      <BookDetailView
        book={selectedBook}
        onBack={() => setSelectedBook(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0">
        <BookListHeader
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-28">
        {filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="size-12 mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery
                ? "該当する書籍が見つかりません"
                : "書籍が登録されていません"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredBooks.map((book) => {
              const totalDuration = getTotalDurationByBook(book.id);
              const histories = getHistoriesByBook(book.id);

              const lastHistoryEnd = histories.reduce<string | null>(
                (latest, history) => {
                  const t = history.endTime;
                  if (!latest) return t;
                  return new Date(t).getTime() > new Date(latest).getTime()
                    ? t
                    : latest;
                },
                null
              );

              const lastMemoAt = (book.memos ?? []).reduce<string | null>(
                (latest, memo) => {
                  const t = memo.createdAt;
                  if (!latest) return t;
                  return new Date(t).getTime() > new Date(latest).getTime()
                    ? t
                    : latest;
                },
                null
              );

              const lastActivityAt = (() => {
                const candidates = [
                  book.createdAt,
                  lastMemoAt,
                  lastHistoryEnd,
                ].filter(Boolean) as string[];
                return candidates.reduce((latest, t) =>
                  new Date(t).getTime() > new Date(latest).getTime()
                    ? t
                    : latest
                );
              })();

              return (
                <BookListCard
                  key={book.id}
                  title={book.title}
                  lastActivityAt={lastActivityAt}
                  notesCount={book.memos?.length ?? 0}
                  totalDurationSeconds={totalDuration}
                  onClick={() => setSelectedBook(book)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BookDetailView({ book, onBack }: { book: Book; onBack: () => void }) {
  const {
    updateBook,
    deleteBook,
    getHistoriesByBook,
    getTotalDurationByBook,
    addBookMemo,
  } = useApp();
  const [isAddingMemo, setIsAddingMemo] = useState(false);
  const [newMemo, setNewMemo] = useState("");

  const histories = getHistoriesByBook(book.id);
  const totalDuration = getTotalDurationByBook(book.id);

  const handleSaveMemo = () => {
    if (newMemo.trim()) {
      addBookMemo(book.id, newMemo.trim());
      setNewMemo("");
      setIsAddingMemo(false);
    }
  };

  const handleDelete = () => {
    if (confirm("この書籍を削除しますか？")) {
      void deleteBook(book.id);
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      <div className="shrink-0">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          ← 一覧に戻る
        </button>

        <h1 className="mb-2">{book.title}</h1>
        {book.author && <p className="text-muted-foreground">{book.author}</p>}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pt-6 pb-28">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">累計時間</p>
          <p className="text-3xl tabular-nums">
            {formatDuration(totalDuration)}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p>メモ</p>
            {!isAddingMemo && (
              <button
                onClick={() => setIsAddingMemo(true)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                追加
              </button>
            )}
          </div>

          {isAddingMemo ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                className="min-h-[100px]"
                placeholder="書籍に関するメモを入力..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setNewMemo("");
                    setIsAddingMemo(false);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button onClick={handleSaveMemo} className="flex-1">
                  保存
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {book.memos && book.memos.length > 0
              ? book.memos.map((memo) => (
                  <ListCard key={memo.id}>
                    <p className="text-sm text-muted-foreground mb-1">
                      {new Date(memo.createdAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="whitespace-pre-wrap">{memo.text}</p>
                  </ListCard>
                ))
              : !isAddingMemo && (
                  <p className="text-muted-foreground">メモなし</p>
                )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p>履歴 ({histories.length}件)</p>
          {histories.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 border rounded-lg">
              履歴がありません
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {histories.map((history) => (
                <ListCard key={history.id}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="tabular-nums">
                      {formatDuration(history.duration)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(history.endTime).toLocaleDateString("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {history.memo && (
                    <p className="text-sm whitespace-pre-wrap">
                      {history.memo}
                    </p>
                  )}
                </ListCard>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleDelete}
          variant="outline"
          className="text-destructive border-destructive hover:bg-destructive/10"
        >
          書籍を削除
        </Button>
      </div>
    </div>
  );
}
