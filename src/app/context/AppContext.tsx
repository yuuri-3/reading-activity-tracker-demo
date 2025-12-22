import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { Book, History, TimerState, BookMemo } from "../types";
import { useAuth } from "../auth/AuthContext";
import { getFirestoreDb } from "../firebase/firebase";

// App context for managing global state
interface AppContextType {
  // Books
  books: Book[];
  addBook: (book: Omit<Book, "id" | "createdAt">) => Promise<void>;
  updateBook: (id: string, book: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  getBook: (id: string) => Book | undefined;
  addBookMemo: (bookId: string, memoText: string) => void;

  // Histories
  histories: History[];
  addHistory: (history: Omit<History, "id" | "createdAt">) => Promise<void>;
  updateHistory: (id: string, history: Partial<History>) => Promise<void>;
  deleteHistory: (id: string) => Promise<void>;
  getHistoriesByBook: (bookId: string) => History[];
  getTotalDurationByBook: (bookId: string) => number;

  // Timer
  timerState: TimerState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;

  // Search
  searchText: string;
  setSearchText: (text: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [histories, setHistories] = useState<History[]>([]);
  const [searchText, setSearchText] = useState("");
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    pausedTime: 0,
  });

  const uid = user?.uid;

  const db = useMemo(() => {
    if (!uid) return null;
    return getFirestoreDb();
  }, [uid]);

  // Subscribe to Firestore (single source of truth)
  useEffect(() => {
    if (!db || !uid) {
      setBooks([]);
      setHistories([]);
      return;
    }

    const booksQuery = query(
      collection(db, "users", uid, "books"),
      orderBy("createdAt", "desc")
    );

    const historiesQuery = query(
      collection(db, "users", uid, "histories"),
      orderBy("createdAt", "desc")
    );

    const unsubBooks = onSnapshot(booksQuery, (snapshot) => {
      setBooks(
        snapshot.docs.map((d) => {
          const data = d.data() as Omit<Book, "id">;
          return {
            id: d.id,
            title: data.title,
            author: data.author,
            memos: data.memos ?? [],
            createdAt: data.createdAt,
          };
        })
      );
    });

    const unsubHistories = onSnapshot(historiesQuery, (snapshot) => {
      setHistories(
        snapshot.docs.map((d) => {
          const data = d.data() as Omit<History, "id">;
          return {
            id: d.id,
            bookId: data.bookId,
            duration: data.duration,
            memo: data.memo,
            startTime: data.startTime,
            endTime: data.endTime,
            createdAt: data.createdAt,
          };
        })
      );
    });

    return () => {
      unsubBooks();
      unsubHistories();
    };
  }, [db, uid]);

  // Timer interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (timerState.isRunning && timerState.startTime) {
      interval = window.setInterval(() => {
        setTimerState((prev) => ({
          ...prev,
          elapsedTime: prev.pausedTime + (Date.now() - prev.startTime!) / 1000,
        }));
      }, 100);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [timerState.isRunning, timerState.startTime]);

  // Book operations
  const addBook = async (book: Omit<Book, "id" | "createdAt">) => {
    if (!db || !uid) return;
    const now = new Date().toISOString();
    await addDoc(collection(db, "users", uid, "books"), {
      ...stripUndefined({
        ...book,
        memos: book.memos ?? [],
      }),
      createdAt: now,
    });
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    if (!db || !uid) return;
    const { id: _id, ...rest } = updates;
    await updateDoc(doc(db, "users", uid, "books", id), stripUndefined(rest));
  };

  const deleteBook = async (id: string) => {
    if (!db || !uid) return;
    await deleteDoc(doc(db, "users", uid, "books", id));
  };

  const getBook = (id: string) => {
    return books.find((book) => book.id === id);
  };

  const addBookMemo = (bookId: string, memoText: string) => {
    const book = getBook(bookId);
    if (book) {
      const newMemo: BookMemo = {
        id: Date.now().toString(),
        text: memoText,
        createdAt: new Date().toISOString(),
      };
      void updateBook(bookId, { memos: [...(book.memos || []), newMemo] });
    }
  };

  // History operations
  const addHistory = async (history: Omit<History, "id" | "createdAt">) => {
    if (!db || !uid) return;
    const now = new Date().toISOString();
    await addDoc(collection(db, "users", uid, "histories"), {
      ...stripUndefined(history as unknown as Record<string, unknown>),
      createdAt: now,
    });
  };

  const updateHistory = async (id: string, updates: Partial<History>) => {
    if (!db || !uid) return;
    const { id: _id, ...rest } = updates;
    await updateDoc(
      doc(db, "users", uid, "histories", id),
      stripUndefined(rest)
    );
  };

  const deleteHistory = async (id: string) => {
    if (!db || !uid) return;
    await deleteDoc(doc(db, "users", uid, "histories", id));
  };

  const getHistoriesByBook = (bookId: string) => {
    return histories.filter((history) => history.bookId === bookId);
  };

  const getTotalDurationByBook = (bookId: string) => {
    return histories
      .filter((history) => history.bookId === bookId)
      .reduce((total, history) => total + history.duration, 0);
  };

  // Timer operations
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

  return (
    <AppContext.Provider
      value={{
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
