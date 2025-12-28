import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Book } from "../types";
import { formatDuration } from "../utils/format";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { BookOpen, Plus } from "lucide-react";
import { ListCard } from "../components/ListCard";
import { Header } from "../components/Header";
import { ListEmptyView } from "../components/ListEmptyView";
import { Dialog } from "../components/Dialog";
import { PrimaryButton } from "../components/PrimaryButton";
import { FieldItem } from "../components/FieldItem";
import { Input } from "../components/ui/input";

export function BooksPage() {
  const { books, getTotalDurationByBook, getHistoriesByBook, addBook } =
    useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isRegistBookDialogOpen, setIsRegistBookDialogOpen] = useState(false);
  const [bookTitle, setBookTitle] = useState("");

  const handleSubmitBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) return;

    addBook({
      title: bookTitle.trim(),
      memos: [],
    });

    setBookTitle("");
    setIsRegistBookDialogOpen(false);
  };

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
        <Header
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          showSegmentedControl={false}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-28">
        {books.length === 0 ? (
          <div className="min-h-full flex items-start justify-center">
            <ListEmptyView
              message="書籍が登録されていません"
              submessage="書籍の情報を登録してください"
              action={
                <Dialog
                  open={isRegistBookDialogOpen}
                  onOpenChange={setIsRegistBookDialogOpen}
                  title="書籍を登録"
                  description="読書時間を記録したい書籍を追加します"
                  formPatternType="RegistBook"
                  cancelLabel="キャンセル"
                  confirmLabel="登録"
                  confirmButtonType="submit"
                  confirmForm="regist-book-form"
                  onCancel={() => setIsRegistBookDialogOpen(false)}
                  trigger={
                    <PrimaryButton
                      className="px-3 py-2 text-sm"
                      icon={<Plus className="size-4" />}
                    >
                      書籍登録
                    </PrimaryButton>
                  }
                >
                  <form id="regist-book-form" onSubmit={handleSubmitBook}>
                    <FieldItem
                      className="w-full"
                      labelProps={{
                        text: "書籍タイトル",
                        showOptionalLabel: false,
                      }}
                      instance={
                        <Input
                          id="title"
                          value={bookTitle}
                          onChange={(e) => setBookTitle(e.target.value)}
                          placeholder="書籍名を入力"
                          required
                          className="h-auto min-h-[44px] rounded-[6px] px-4 py-3 text-sm leading-5"
                        />
                      }
                    />
                  </form>
                </Dialog>
              }
            />
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="min-h-full flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="size-12 mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              該当する書籍が見つかりません
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
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
                <ListCard
                  key={book.id}
                  type="Book"
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
                placeholder="例）第2章に具体的な例が多い"
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
                  <ListCard
                    key={memo.id}
                    type="BookNote"
                    createdAt={memo.createdAt}
                    bookName={book.title}
                    bookNote={memo.text}
                  />
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
                <ListCard
                  key={history.id}
                  type="Record"
                  durationSeconds={history.duration}
                  dateTime={history.endTime}
                  recordNote={history.memo}
                  bookName={book.title}
                  tags={history.tags}
                />
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
