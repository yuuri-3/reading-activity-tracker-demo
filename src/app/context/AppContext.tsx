import React, {
  createContext,
  useCallback,
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
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Book, ReadingRecord, BookMemo, Tag } from "../types";
import { useAuth } from "../auth/AuthContext";
import { getFirestoreDb } from "../firebase/firebase";
import { useGuestCreateNotice } from "./GuestCreateNoticeContext";
import {
  createTag as createTagInRepository,
  updateTag as updateTagInRepository,
  deleteTag as deleteTagInRepository,
  restoreTag as restoreTagInRepository,
} from "../repositories/tagRepository";

// App context for managing global state
interface AppContextType {
  // Books
  books: Book[];
  addBook: (book: Omit<Book, "id" | "createdAt">) => Promise<void>;
  updateBook: (id: string, book: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  getBook: (id: string) => Book | undefined;
  addBookMemo: (bookId: string, memoText: string, createdAt?: string) => void;

  // Tags
  tags: Tag[];
  createTag: (tag: {
    text: string;
    description?: string;
  }) => Promise<string | null>;
  updateTag: (
    id: string,
    updates: Partial<Pick<Tag, "text" | "description">>,
  ) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  restoreTag: (tag: Tag) => Promise<void>;

  // Records
  records: ReadingRecord[];
  addRecord: (record: Omit<ReadingRecord, "id" | "createdAt">) => Promise<void>;
  updateRecord: (id: string, record: Partial<ReadingRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  restoreRecord: (record: ReadingRecord) => Promise<void>;
  getRecordsByBook: (bookId: string) => ReadingRecord[];
  getTotalDurationByBook: (bookId: string) => number;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function toIsoString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? "" : value.toISOString();
  }

  // Firestore Timestamp (Web SDK) and similar objects.
  if (value && typeof value === "object") {
    const maybeToDate = (value as { toDate?: unknown }).toDate;
    if (typeof maybeToDate === "function") {
      const date = (value as { toDate: () => Date }).toDate();
      const ms = date.getTime();
      return Number.isNaN(ms) ? "" : date.toISOString();
    }
  }

  return "";
}

function normalizeDurationSeconds(data: {
  duration?: unknown;
  startTime?: unknown;
  endTime?: unknown;
}): number {
  const startTime = typeof data.startTime === "string" ? data.startTime : "";
  const endTime = typeof data.endTime === "string" ? data.endTime : "";

  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const diffSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
      if (diffSeconds > 0) return diffSeconds;
    }
  }

  const n =
    typeof data.duration === "number" ? data.duration : Number(data.duration);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { registerGuestCreation } = useGuestCreateNotice();
  const [books, setBooks] = useState<Book[]>([]);
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

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
      setTags([]);
      return;
    }

    const onSnapshotError = (err: unknown) => {
      // This used to be silent; keep it visible for debugging.
      // eslint-disable-next-line no-console
      console.error("[AppContext] onSnapshot error", err);
    };

    const booksQuery = query(
      collection(db, "users", uid, "books"),
      orderBy("createdAt", "desc"),
    );

    const recordsQuery = query(
      collection(db, "users", uid, "records"),
      orderBy("createdAt", "desc"),
    );

    const tagsQuery = query(
      collection(db, "users", uid, "tags"),
      orderBy("createdAt", "desc"),
    );

    const unsubBooks = onSnapshot(
      booksQuery,
      (snapshot) => {
        setBooks(
          snapshot.docs.map((d) => {
            const data = d.data() as Omit<Book, "id">;
            return {
              id: d.id,
              title: data.title,
              author: data.author,
              memos: data.memos ?? [],
              createdAt: toIsoString(
                (data as unknown as { createdAt?: unknown }).createdAt,
              ),
            };
          }),
        );
      },
      onSnapshotError,
    );

    const unsubRecords = onSnapshot(
      recordsQuery,
      (snapshot) => {
        setRecords(
          snapshot.docs.map((d) => {
            const data = d.data() as Omit<ReadingRecord, "id">;
            const memo =
              typeof (data as unknown as { memo?: unknown }).memo === "string"
                ? ((data as unknown as { memo?: unknown }).memo as string)
                : "";
            const tagIds: string[] | undefined = Array.isArray(
              (data as unknown as { tagIds?: unknown }).tagIds,
            )
              ? (
                  (data as unknown as { tagIds?: unknown }).tagIds as unknown[]
                ).filter(
                  (v): v is string => typeof v === "string" && v.length > 0,
                )
              : undefined;

            return {
              id: d.id,
              bookId: data.bookId,
              duration: normalizeDurationSeconds(data),
              memo,
              tagIds,
              startTime: toIsoString(
                (data as unknown as { startTime?: unknown }).startTime,
              ),
              endTime: toIsoString(
                (data as unknown as { endTime?: unknown }).endTime,
              ),
              createdAt: toIsoString(
                (data as unknown as { createdAt?: unknown }).createdAt,
              ),
            };
          }),
        );
      },
      onSnapshotError,
    );

    const unsubTags = onSnapshot(
      tagsQuery,
      (snapshot) => {
        setTags(
          snapshot.docs.map((d) => {
            const data = d.data() as {
              text?: unknown;
              description?: unknown;
              createdAt?: unknown;
            };

            const text = typeof data.text === "string" ? data.text : "";
            const description =
              typeof data.description === "string" ? data.description : "";
            const createdAt =
              toIsoString(data.createdAt) || new Date().toISOString();

            return {
              id: d.id,
              text,
              description,
              createdAt,
            } satisfies Tag;
          }),
        );
      },
      onSnapshotError,
    );

    return () => {
      unsubBooks();
      unsubRecords();
      unsubTags();
    };
  }, [db, uid]);

  const createTag = useCallback(
    async (tag: { text: string; description?: string }) => {
      return await createTagInRepository(db, uid, tag);
    },
    [db, uid],
  );

  const updateTag = useCallback(
    async (id: string, updates: Partial<Pick<Tag, "text" | "description">>) => {
      const current = tags.find((t) => t.id === id);
      await updateTagInRepository(db, uid, id, current, updates);
    },
    [db, tags, uid],
  );

  const deleteTag = useCallback(
    async (id: string) => {
      await deleteTagInRepository(db, uid, id);
    },
    [db, uid],
  );

  const restoreTag = useCallback(
    async (tag: Tag) => {
      await restoreTagInRepository(db, uid, tag);
    },
    [db, uid],
  );

  // Book operations
  const addBook = useCallback(
    async (book: Omit<Book, "id" | "createdAt">) => {
      if (!db || !uid) return;
      const now = new Date().toISOString();
      await addDoc(collection(db, "users", uid, "books"), {
        ...stripUndefined({
          ...book,
          memos: book.memos ?? [],
        }),
        createdAt: now,
      });
      registerGuestCreation();
    },
    [db, registerGuestCreation, uid],
  );

  const updateBook = useCallback(
    async (id: string, updates: Partial<Book>) => {
      if (!db || !uid) return;
      const { id: _id, ...rest } = updates;
      await updateDoc(doc(db, "users", uid, "books", id), stripUndefined(rest));
    },
    [db, uid],
  );

  const deleteBook = useCallback(
    async (id: string) => {
      if (!db || !uid) return;
      await deleteDoc(doc(db, "users", uid, "books", id));
    },
    [db, uid],
  );

  const getBook = useCallback(
    (id: string) => {
      return books.find((book) => book.id === id);
    },
    [books],
  );

  const addBookMemo = useCallback(
    (bookId: string, memoText: string, createdAt?: string) => {
      const book = getBook(bookId);
      if (book) {
        const fallbackCreatedAt = new Date().toISOString();
        const createdAtValue = createdAt?.trim() || fallbackCreatedAt;
        const newMemo: BookMemo = {
          id: Date.now().toString(),
          text: memoText,
          createdAt: createdAtValue,
        };
        void updateBook(bookId, { memos: [...(book.memos || []), newMemo] });
      }
    },
    [getBook, updateBook],
  );

  // Record operations
  const addRecord = useCallback(
    async (record: Omit<ReadingRecord, "id" | "createdAt">) => {
      if (!db || !uid) {
        throw new Error(
          "ログイン情報の取得中です。少し待ってからもう一度お試しください",
        );
      }
      const now = new Date().toISOString();
      await addDoc(collection(db, "users", uid, "records"), {
        ...stripUndefined({
          ...(record as unknown as Record<string, unknown>),
          duration:
            typeof record.duration === "number"
              ? Math.max(0, Math.floor(record.duration))
              : record.duration,
        }),
        createdAt: now,
      });
      registerGuestCreation();
    },
    [db, registerGuestCreation, uid],
  );

  const updateRecord = useCallback(
    async (id: string, updates: Partial<ReadingRecord>) => {
      if (!db || !uid) {
        throw new Error(
          "ログイン情報の取得中です。少し待ってからもう一度お試しください",
        );
      }
      const { id: _id, ...rest } = updates;
      const nextRest: Record<string, unknown> = {
        ...rest,
        ...(typeof rest.duration === "number"
          ? { duration: Math.max(0, Math.floor(rest.duration)) }
          : {}),
        ...(typeof rest.bookId === "string" && rest.bookId === ""
          ? { bookId: deleteField() }
          : {}),
      };
      await updateDoc(
        doc(db, "users", uid, "records", id),
        stripUndefined(nextRest),
      );
    },
    [db, uid],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      if (!db || !uid) return;
      await deleteDoc(doc(db, "users", uid, "records", id));
    },
    [db, uid],
  );

  const restoreRecord = useCallback(
    async (record: ReadingRecord) => {
      if (!db || !uid) return;

      const { id, ...rest } = record;
      await setDoc(
        doc(db, "users", uid, "records", id),
        stripUndefined(rest as unknown as Record<string, unknown>),
      );
    },
    [db, uid],
  );

  const getRecordsByBook = useCallback(
    (bookId: string) => {
      return records.filter((record) => record.bookId === bookId);
    },
    [records],
  );

  const getTotalDurationByBook = useCallback(
    (bookId: string) => {
      return records
        .filter((record) => record.bookId === bookId)
        .reduce((total, record) => total + record.duration, 0);
    },
    [records],
  );

  const value = useMemo<AppContextType>(() => {
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
  }, [
    addBook,
    addBookMemo,
    addRecord,
    books,
    createTag,
    deleteBook,
    deleteRecord,
    deleteTag,
    getBook,
    getRecordsByBook,
    getTotalDurationByBook,
    records,
    restoreRecord,
    restoreTag,
    tags,
    updateBook,
    updateRecord,
    updateTag,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
