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
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Book, ReadingRecord, TimerState, BookMemo } from "../types";
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

  // Records
  records: ReadingRecord[];
  addRecord: (record: Omit<ReadingRecord, "id" | "createdAt">) => Promise<void>;
  updateRecord: (id: string, record: Partial<ReadingRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  restoreRecord: (record: ReadingRecord) => Promise<void>;
  getRecordsByBook: (bookId: string) => ReadingRecord[];
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
  const [records, setRecords] = useState<ReadingRecord[]>([]);
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
      setRecords([]);
      return;
    }

    const booksQuery = query(
      collection(db, "users", uid, "books"),
      orderBy("createdAt", "desc")
    );

    const recordsQuery = query(
      collection(db, "users", uid, "records"),
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

    const unsubRecords = onSnapshot(recordsQuery, (snapshot) => {
      setRecords(
        snapshot.docs.map((d) => {
          const data = d.data() as Omit<ReadingRecord, "id">;
          return {
            id: d.id,
            bookId: data.bookId,
            duration: data.duration,
            memo: data.memo,
            tags: data.tags ?? [],
            startTime: data.startTime,
            endTime: data.endTime,
            createdAt: data.createdAt,
          };
        })
      );
    });

    return () => {
      unsubBooks();
      unsubRecords();
    };
  }, [db, uid]);

  // Timer interval
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
      if (interval !== undefined) window.clearInterval(interval);
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

  // Record operations
  const addRecord = async (record: Omit<ReadingRecord, "id" | "createdAt">) => {
    if (!db || !uid) return;
    const now = new Date().toISOString();
    await addDoc(collection(db, "users", uid, "records"), {
      ...stripUndefined(record as unknown as Record<string, unknown>),
      createdAt: now,
    });
  };

  const updateRecord = async (id: string, updates: Partial<ReadingRecord>) => {
    if (!db || !uid) return;
    const { id: _id, ...rest } = updates;
    await updateDoc(doc(db, "users", uid, "records", id), stripUndefined(rest));
  };

  const deleteRecord = async (id: string) => {
    if (!db || !uid) return;
    await deleteDoc(doc(db, "users", uid, "records", id));
  };

  const restoreRecord = async (record: ReadingRecord) => {
    if (!db || !uid) return;

    const { id, ...rest } = record;
    await setDoc(
      doc(db, "users", uid, "records", id),
      stripUndefined(rest as unknown as Record<string, unknown>)
    );
  };

  const getRecordsByBook = (bookId: string) => {
    return records.filter((record) => record.bookId === bookId);
  };

  const getTotalDurationByBook = (bookId: string) => {
    return records
      .filter((record) => record.bookId === bookId)
      .reduce((total, record) => total + record.duration, 0);
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
