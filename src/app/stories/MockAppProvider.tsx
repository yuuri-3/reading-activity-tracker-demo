import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { AppContext } from "../context/AppContext";
import type { Book, ReadingRecord, TimerState } from "../types";

export type MockAppProviderProps = {
  children: ReactNode;

  initialBooks?: Book[];
  initialRecords?: ReadingRecord[];
  initialSearchText?: string;

  initialTimerSeconds?: number;
  initialTimerRunning?: boolean;
  timerTickMs?: number;
};

export function MockAppProvider({
  children,
  initialBooks,
  initialRecords,
  initialSearchText,
  initialTimerSeconds = 0,
  initialTimerRunning = false,
  timerTickMs = 100,
}: MockAppProviderProps) {
  const [books, setBooks] = useState<Book[]>(() => initialBooks ?? []);
  const [records, setRecords] = useState<ReadingRecord[]>(
    () => initialRecords ?? []
  );
  const [searchText, setSearchText] = useState(initialSearchText ?? "");
  const [timerState, setTimerState] = useState<TimerState>(() => {
    const startTime = initialTimerRunning ? Date.now() : null;
    return {
      isRunning: initialTimerRunning,
      startTime,
      elapsedTime: initialTimerSeconds,
      pausedTime: initialTimerSeconds,
    };
  });

  useEffect(() => {
    let interval: number | undefined;

    if (timerState.isRunning && timerState.startTime) {
      interval = window.setInterval(() => {
        setTimerState((prev) => ({
          ...prev,
          elapsedTime: prev.pausedTime + (Date.now() - prev.startTime!) / 1000,
        }));
      }, timerTickMs);
    }

    return () => {
      if (interval != null) window.clearInterval(interval);
    };
  }, [timerState.isRunning, timerState.startTime, timerTickMs]);

  const value = useMemo<
    NonNullable<React.ContextType<typeof AppContext>>
  >(() => {
    const getBook = (id: string) => books.find((b) => b.id === id);

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
        prev.map((b) => (b.id === id ? { ...b, ...updates, id: b.id } : b))
      );
    };

    const deleteBook = async (id: string) => {
      setBooks((prev) => prev.filter((b) => b.id !== id));
      setRecords((prev) => prev.filter((r) => r.bookId !== id));
    };

    const addBookMemo = (bookId: string, memoText: string) => {
      const target = getBook(bookId);
      if (!target) return;
      void updateBook(bookId, {
        memos: [
          ...(target.memos ?? []),
          {
            id: Date.now().toString(),
            text: memoText,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    };

    const addRecord = async (
      record: Omit<ReadingRecord, "id" | "createdAt">
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
      updates: Partial<ReadingRecord>
    ) => {
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates, id: r.id } : r))
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

    const startTimer = () => {
      setTimerState((prev) => ({
        ...prev,
        isRunning: true,
        startTime: Date.now(),
      }));
    };

    const pauseTimer = () => {
      setTimerState((prev) => ({
        ...prev,
        isRunning: false,
        startTime: null,
        pausedTime: prev.elapsedTime,
      }));
    };

    const resetTimer = () => {
      setTimerState({
        isRunning: false,
        startTime: null,
        elapsedTime: 0,
        pausedTime: 0,
      });
    };

    return {
      books,
      addBook,
      updateBook,
      deleteBook,
      getBook,
      addBookMemo,
      records,
      addRecord,
      updateRecord,
      deleteRecord,
      restoreRecord,
      getRecordsByBook,
      getTotalDurationByBook,
      timerState,
      startTimer,
      pauseTimer,
      resetTimer,
      searchText,
      setSearchText,
    };
  }, [books, records, searchText, timerState]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
