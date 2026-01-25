import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { AppContext } from "../context/AppContext";
import { GuestCreateNoticeProvider } from "../context/GuestCreateNoticeContext";
import { SearchProvider } from "../context/SearchContext";
import type { Book, ReadingRecord, Tag, TimerState } from "../types";
import { TimerProvider } from "../timer/TimerContext";

export type MockAppProviderProps = {
  children?: ReactNode;

  initialBooks?: Book[];
  initialRecords?: ReadingRecord[];
  initialTags?: Tag[];
  initialSearchText?: string;

  initialTimerSeconds?: number;
  initialTimerRunning?: boolean;
  timerTickMs?: number;
};

export function MockAppProvider({
  children,
  initialBooks,
  initialRecords,
  initialTags,
  initialSearchText,
  initialTimerSeconds = 0,
  initialTimerRunning = false,
  timerTickMs = 1000,
}: MockAppProviderProps) {
  const [books, setBooks] = useState<Book[]>(() => initialBooks ?? []);
  const [records, setRecords] = useState<ReadingRecord[]>(
    () => initialRecords ?? [],
  );
  const [tags, setTags] = useState<Tag[]>(() => initialTags ?? []);
  const initialTimerState = useMemo<TimerState>(() => {
    const startTime = initialTimerRunning ? Date.now() : null;
    return {
      isRunning: initialTimerRunning,
      startTime,
      elapsedTime: initialTimerSeconds,
      pausedTime: initialTimerSeconds,
    };
  }, [initialTimerRunning, initialTimerSeconds]);

  const value = useMemo<
    NonNullable<React.ContextType<typeof AppContext>>
  >(() => {
    const getBook = (id: string) => books.find((b) => b.id === id);

    const createTag = async (tag: { text: string; description?: string }) => {
      const text = tag.text.trim();
      if (!text) return null;

      const now = new Date().toISOString();
      const id = `tag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setTags((prev) => [
        {
          id,
          text,
          description: tag.description ?? "",
          createdAt: now,
        },
        ...prev,
      ]);
      return id;
    };

    const updateTag = async (
      id: string,
      updates: Partial<Pick<Tag, "text" | "description">>,
    ) => {
      setTags((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                ...(typeof updates.text === "string"
                  ? { text: updates.text }
                  : {}),
                ...(typeof updates.description === "string"
                  ? { description: updates.description }
                  : {}),
              }
            : t,
        ),
      );
    };

    const deleteTag = async (id: string) => {
      setTags((prev) => prev.filter((t) => t.id !== id));
    };

    const restoreTag = async (tag: Tag) => {
      setTags((prev) => {
        const idx = prev.findIndex((t) => t.id === tag.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = tag;
          return next;
        }
        return [tag, ...prev];
      });
    };

    const addBook = async (book: Omit<Book, "id" | "createdAt">) => {
      setBooks((prev) => [
        {
          id: `book-${Date.now()}`,
          title: book.title,
          author: book.author,
          memos: book.memos ?? [],
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    };

    const updateBook = async (id: string, updates: Partial<Book>) => {
      setBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates, id: b.id } : b)),
      );
    };

    const deleteBook = async (id: string) => {
      setBooks((prev) => prev.filter((b) => b.id !== id));
      setRecords((prev) => prev.filter((r) => r.bookId !== id));
    };

    const addBookMemo = (
      bookId: string,
      memoText: string,
      createdAt?: string,
    ) => {
      const target = getBook(bookId);
      if (!target) return;
      const fallbackCreatedAt = new Date().toISOString();
      const createdAtValue = createdAt?.trim() || fallbackCreatedAt;
      void updateBook(bookId, {
        memos: [
          ...(target.memos ?? []),
          {
            id: Date.now().toString(),
            text: memoText,
            createdAt: createdAtValue,
          },
        ],
      });
    };

    const addRecord = async (
      record: Omit<ReadingRecord, "id" | "createdAt">,
    ) => {
      setRecords((prev) => [
        {
          id: `record-${Date.now()}`,
          ...record,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    };

    const updateRecord = async (
      id: string,
      updates: Partial<ReadingRecord>,
    ) => {
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates, id: r.id } : r)),
      );
    };

    const deleteRecord = async (id: string) => {
      setRecords((prev) => prev.filter((r) => r.id !== id));
    };

    const restoreRecord = async (record: ReadingRecord) => {
      setRecords((prev) => {
        const idx = prev.findIndex((r) => r.id === record.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = record;
          return next;
        }
        return [record, ...prev];
      });
    };

    const getRecordsByBook = (bookId: string) =>
      records.filter((r) => r.bookId === bookId);

    const getTotalDurationByBook = (bookId: string) =>
      records
        .filter((r) => r.bookId === bookId)
        .reduce((total, r) => total + r.duration, 0);

    return {
      books,
      addBook,
      updateBook,
      deleteBook,
      getBook,
      addBookMemo,
      tags,
      createTag,
      updateTag,
      deleteTag,
      restoreTag,
      records,
      addRecord,
      updateRecord,
      deleteRecord,
      restoreRecord,
      getRecordsByBook,
      getTotalDurationByBook,
    };
  }, [books, records, tags]);

  return (
    <TimerProvider
      persist={false}
      tickMs={timerTickMs}
      initialState={initialTimerState}
    >
      <GuestCreateNoticeProvider user={null}>
        <SearchProvider initialSearchText={initialSearchText}>
          <AppContext.Provider value={value}>{children}</AppContext.Provider>
        </SearchProvider>
      </GuestCreateNoticeProvider>
    </TimerProvider>
  );
}
