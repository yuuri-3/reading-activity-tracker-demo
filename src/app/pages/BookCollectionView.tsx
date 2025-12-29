import { useEffect, useMemo, useState } from "react";

import { BookOpen, Plus } from "lucide-react";

import { useApp } from "../context/AppContext";
import type { Book } from "../types";

import { ListCard } from "../components/ListCard";
import { Header } from "../components/Header";
import { ListEmptyView } from "../components/ListEmptyView";
import { Dialog } from "../components/Dialog";
import { PrimaryButton } from "../components/PrimaryButton";
import { FieldItem } from "../components/FieldItem";
import { Input } from "../components/ui/input";

import { BookSingleView } from "./BookSingleView";

export function BookCollectionView() {
  const { books, getTotalDurationByBook, getRecordsByBook, addBook } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isRegistBookDialogOpen, setIsRegistBookDialogOpen] = useState(false);
  const [bookTitle, setBookTitle] = useState("");

  const selectedBook = useMemo(() => {
    if (!selectedBookId) return null;
    return books.find((b) => b.id === selectedBookId) ?? null;
  }, [books, selectedBookId]);

  useEffect(() => {
    // If the selected book was deleted or is no longer available, go back.
    if (selectedBookId && !selectedBook) {
      setSelectedBookId(null);
    }
  }, [selectedBookId, selectedBook]);

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
      <BookSingleView
        book={selectedBook}
        onBack={() => setSelectedBookId(null)}
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
              const records = getRecordsByBook(book.id);

              const lastRecordEnd = records.reduce<string | null>(
                (latest, record) => {
                  const t = record.endTime;
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
                  lastRecordEnd,
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
                  onClick={() => setSelectedBookId(book.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
