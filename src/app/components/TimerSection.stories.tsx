import type { Meta, StoryObj } from "@storybook/react-vite";

import { useEffect, useMemo, useState } from "react";
import type { ContextType } from "react";

import { AppContext } from "../context/AppContext";
import type { Book, History, TimerState } from "../types";
import { TimerSection } from "./TimerSection";

type HarnessProps = {
  initialSeconds?: number;
  initialRunning?: boolean;
};

function TimerSectionHarness({
  initialSeconds = 0,
  initialRunning = false,
}: HarnessProps) {
  const [books, setBooks] = useState<Book[]>([
    {
      id: "book-1",
      title: "サンプル書籍",
      author: "著者",
      memos: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: "book-2",
      title: "もう一冊",
      memos: [],
      createdAt: new Date().toISOString(),
    },
  ]);
  const [histories, setHistories] = useState<History[]>([]);
  const [searchText, setSearchText] = useState("");
  const [timerState, setTimerState] = useState<TimerState>(() => {
    const startTime = initialRunning ? Date.now() : null;
    return {
      isRunning: initialRunning,
      startTime,
      elapsedTime: initialSeconds,
      pausedTime: initialSeconds,
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
      }, 100);
    }

    return () => {
      if (interval != null) window.clearInterval(interval);
    };
  }, [timerState.isRunning, timerState.startTime]);

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
      <TimerSection />
    </AppContext.Provider>
  );
}

export default {
  title: "Components/TimerSection",
  component: TimerSection,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="min-h-dvh w-full">
        <div className="max-w-2xl mx-auto p-6 pb-28">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof TimerSection>;

type Story = StoryObj<typeof TimerSection>;

export const Default: Story = {
  render: () => <TimerSectionHarness />,
};

export const WithElapsedTime: Story = {
  render: () => <TimerSectionHarness initialSeconds={65} />,
};

export const Running: Story = {
  render: () => <TimerSectionHarness initialSeconds={12} initialRunning />,
};
