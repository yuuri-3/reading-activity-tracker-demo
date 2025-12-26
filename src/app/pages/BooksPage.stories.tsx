import type { Meta, StoryObj } from "@storybook/react-vite";

import { useMemo, useState } from "react";
import type { ContextType } from "react";

import { BooksPage } from "./BooksPage";
import { AppContext } from "../context/AppContext";
import type { Book, History, TimerState } from "../types";

type HarnessProps = {
  initialBooks?: Book[];
  initialHistories?: History[];
};

function createIsoDate(offsetMinutes: number) {
  return new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString();
}

function BooksPageHarness({ initialBooks, initialHistories }: HarnessProps) {
  const [books, setBooks] = useState<Book[]>(
    initialBooks ?? [
      {
        id: "book-1",
        title: "これが書籍タイトルB (タイトルが長いときはこんな感じ)",
        author: "著者A",
        memos: [
          { id: "m-1", text: "気づきメモ", createdAt: createIsoDate(-60) },
          { id: "m-2", text: "次回読む場所", createdAt: createIsoDate(-30) },
        ],
        createdAt: createIsoDate(-7 * 24 * 60),
      },
      {
        id: "book-2",
        title: "サンプル書籍",
        author: "著者",
        memos: [],
        createdAt: createIsoDate(-3 * 24 * 60),
      },
      {
        id: "book-3",
        title: "もう一冊",
        memos: [{ id: "m-3", text: "メモだけ", createdAt: createIsoDate(-20) }],
        createdAt: createIsoDate(-2 * 24 * 60),
      },
    ]
  );

  const [histories, setHistories] = useState<History[]>(
    initialHistories ?? [
      {
        id: "history-1",
        bookId: "book-1",
        duration: 2 * 3600 + 32 * 60,
        memo: "P.10まで読んだ",
        startTime: createIsoDate(-200),
        endTime: createIsoDate(-180),
        createdAt: createIsoDate(-180),
      },
      {
        id: "history-2",
        bookId: "book-2",
        duration: 25 * 60,
        memo: "集中できた",
        startTime: createIsoDate(-90),
        endTime: createIsoDate(-65),
        createdAt: createIsoDate(-65),
      },
    ]
  );

  const [searchText, setSearchText] = useState("");
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    pausedTime: 0,
  });

  const value = useMemo<NonNullable<ContextType<typeof AppContext>>>(() => {
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
      setHistories((prev) => prev.filter((h) => h.bookId !== id));
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

    const addHistory = async (history: Omit<History, "id" | "createdAt">) => {
      setHistories((prev) => [
        {
          id: `history-${Date.now()}`,
          ...history,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    };

    const updateHistory = async (id: string, updates: Partial<History>) => {
      setHistories((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...updates, id: h.id } : h))
      );
    };

    const deleteHistory = async (id: string) => {
      setHistories((prev) => prev.filter((h) => h.id !== id));
    };

    const getHistoriesByBook = (bookId: string) =>
      histories.filter((h) => h.bookId === bookId);

    const getTotalDurationByBook = (bookId: string) =>
      histories
        .filter((h) => h.bookId === bookId)
        .reduce((total, h) => total + h.duration, 0);

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
      histories,
      addHistory,
      updateHistory,
      deleteHistory,
      getHistoriesByBook,
      getTotalDurationByBook,
      timerState,
      startTimer,
      pauseTimer,
      resetTimer,
      searchText,
      setSearchText,
    };
  }, [books, histories, searchText, timerState]);

  return (
    <AppContext.Provider value={value}>
      <BooksPage />
    </AppContext.Provider>
  );
}

export default {
  title: "Pages/BooksPage",
  component: BooksPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="min-h-dvh w-full">
        <div className="h-dvh overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6 pb-28">
            <Story />
          </div>
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof BooksPage>;

type Story = StoryObj<typeof BooksPage>;

export const Default: Story = {
  render: () => <BooksPageHarness />,
};

export const Empty: Story = {
  render: () => <BooksPageHarness initialBooks={[]} initialHistories={[]} />,
};
