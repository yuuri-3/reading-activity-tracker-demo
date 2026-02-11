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
  Timestamp,
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
import { getTotalPauseSeconds, normalizePauseIntervals } from "../utils/recordDuration";

// App context for managing global state
interface AppContextType {
  // Books
  books: Book[];
  addBook: (book: Omit<Book, "id" | "createdAt">) => Promise<void>;
  updateBook: (id: string, book: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  getBook: (id: string) => Book | undefined;
  addBookMemo: (
    bookId: string,
    memoText: string,
    createdAt?: string,
  ) => Promise<string>;
  updateBookMemo: (
    bookId: string,
    memoId: string,
    updates: { text?: string },
  ) => Promise<void>;
  deleteBookMemo: (bookId: string, memoId: string) => Promise<void>;
  restoreBookMemo: (bookId: string, memo: BookMemo) => Promise<void>;
  getBookMemoById: (bookId: string, memoId: string) => BookMemo | undefined;

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

  // Migration safety (TK-011)
  migrationIssues: Array<{ kind: string; refPath: string; reason: string }>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function toIsoString(value: unknown): string {
  // NOTE(TK-011): 旧形式(ISO文字列)のフォールバックは行わない。
  // Firestore Timestamp (Web SDK) and similar objects only.
  if (!isTimestampLike(value)) return "";
  const date = value.toDate();
  const ms = date.getTime();
  return Number.isNaN(ms) ? "" : date.toISOString();
}

function isTimestampLike(value: unknown): value is { toDate: () => Date } {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { toDate?: unknown }).toDate === "function";
}

function toTimestampFromIsoOrThrow(iso: string, label: string): Timestamp {
  const d = new Date(iso);
  const ms = d.getTime();
  if (Number.isNaN(ms)) {
    throw new Error(`${label} が不正です: ${iso}`);
  }
  return Timestamp.fromDate(d);
}

function normalizeDurationSeconds(data: {
  duration?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  pauseIntervals?: unknown;
}): number {
  // Prefer explicit duration; it is pause-excluded and the source of truth.
  const n =
    typeof data.duration === "number" ? data.duration : Number(data.duration);
  if (Number.isFinite(n)) return Math.max(0, Math.floor(n));

  // NOTE(TK-011): 旧形式(文字列日時)から duration を算出しない。
  if (isTimestampLike(data.startTime) && isTimestampLike(data.endTime)) {
    const start = data.startTime.toDate();
    const end = data.endTime.toDate();
    const diffSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    if (diffSeconds > 0) {
      const pauseSeconds = getTotalPauseSeconds(data.pauseIntervals);
      return Math.max(0, diffSeconds - pauseSeconds);
    }
  }
  return 0;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { registerGuestCreation } = useGuestCreateNotice();
  const [baseBooks, setBaseBooks] = useState<Book[]>([]);
  const [bookMemosByBookId, setBookMemosByBookId] = useState<
    Record<string, BookMemo[]>
  >({});
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [bookIssues, setBookIssues] = useState<
    Array<{ kind: string; refPath: string; reason: string }>
  >([]);
  const [recordIssues, setRecordIssues] = useState<
    Array<{ kind: string; refPath: string; reason: string }>
  >([]);
  const [tagIssues, setTagIssues] = useState<
    Array<{ kind: string; refPath: string; reason: string }>
  >([]);
  const [memoIssues, setMemoIssues] = useState<
    Array<{ kind: string; refPath: string; reason: string }>
  >([]);

  const uid = user?.uid;

  const db = useMemo(() => {
    if (!uid) return null;
    return getFirestoreDb();
  }, [uid]);

  // Subscribe to Firestore (single source of truth)
  useEffect(() => {
    if (!db || !uid) {
      setBaseBooks([]);
      setBookMemosByBookId({});
      setRecords([]);
      setTags([]);
      setBookIssues([]);
      setRecordIssues([]);
      setTagIssues([]);
      setMemoIssues([]);
      return;
    }

    const memoUnsubsByBookId = new Map<string, () => void>();
    const memoIssuesByBookId = new Map<
      string,
      Array<{ kind: string; refPath: string; reason: string }>
    >();

    const recomputeMemoIssues = () => {
      setMemoIssues(Array.from(memoIssuesByBookId.values()).flat());
    };

    const subscribeBookMemos = (bookId: string) => {
      if (memoUnsubsByBookId.has(bookId)) return;

      const memosQuery = query(
        collection(db, "users", uid, "books", bookId, "memos"),
        orderBy("createdAt", "desc"),
      );

      const unsub = onSnapshot(
        memosQuery,
        (snapshot) => {
          const issues: Array<{
            kind: string;
            refPath: string;
            reason: string;
          }> = [];
          const memos: BookMemo[] = snapshot.docs.map((d) => {
            const raw = d.data() as Record<string, unknown>;
            if (!isTimestampLike(raw.createdAt)) {
              issues.push({
                kind: "memos.createdAt",
                refPath: d.ref.path,
                reason: "createdAt is not Timestamp",
              });
            }

            return {
              id: d.id,
              text: typeof raw.text === "string" ? raw.text : "",
              createdAt: toIsoString(raw.createdAt),
            } satisfies BookMemo;
          });

          setBookMemosByBookId((prev) => ({ ...prev, [bookId]: memos }));
          memoIssuesByBookId.set(bookId, issues);
          recomputeMemoIssues();
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.error("[AppContext] memos onSnapshot error", err);
        },
      );

      memoUnsubsByBookId.set(bookId, unsub);
    };

    const unsubscribeBookMemos = (bookId: string) => {
      const unsub = memoUnsubsByBookId.get(bookId);
      if (unsub) unsub();
      memoUnsubsByBookId.delete(bookId);
      memoIssuesByBookId.delete(bookId);

      setBookMemosByBookId((prev) => {
        if (!(bookId in prev)) return prev;
        const next = { ...prev };
        delete next[bookId];
        return next;
      });
      recomputeMemoIssues();
    };

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
        const issues: Array<{ kind: string; refPath: string; reason: string }> =
          [];

        const nextBookIds = snapshot.docs.map((d) => d.id);

        // Remove memo subscriptions for deleted books.
        for (const existingBookId of memoUnsubsByBookId.keys()) {
          if (!nextBookIds.includes(existingBookId)) {
            unsubscribeBookMemos(existingBookId);
          }
        }

        // Add memo subscriptions for new books.
        for (const bookId of nextBookIds) {
          if (!memoUnsubsByBookId.has(bookId)) {
            subscribeBookMemos(bookId);
          }
        }

        setBaseBooks(
          snapshot.docs.map((d) => {
            const raw = d.data() as Record<string, unknown>;
            if (!isTimestampLike(raw.createdAt)) {
              issues.push({
                kind: "books.createdAt",
                refPath: d.ref.path,
                reason: "createdAt is not Timestamp",
              });
            }

            const author =
              typeof raw.author === "string" ? raw.author : undefined;

            return {
              id: d.id,
              title: typeof raw.title === "string" ? raw.title : "",
              ...(author !== undefined ? { author } : {}),
              memos: [],
              createdAt: toIsoString(raw.createdAt),
            } satisfies Book;
          }),
        );

        setBookIssues(issues);
      },
      onSnapshotError,
    );

    const unsubRecords = onSnapshot(
      recordsQuery,
      (snapshot) => {
        const issues: Array<{ kind: string; refPath: string; reason: string }> =
          [];
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
            const bookId =
              typeof data.bookId === "string" ? data.bookId : undefined;
            const bookMemoId =
              typeof data.bookMemoId === "string" ? data.bookMemoId : undefined;
            const bookMemo =
              typeof (data as unknown as { bookMemo?: unknown }).bookMemo ===
              "string"
                ? ((data as unknown as { bookMemo?: unknown })
                    .bookMemo as string)
                : undefined;

            return {
              id: d.id,
              ...(bookId !== undefined ? { bookId } : {}),
              ...(bookMemoId !== undefined ? { bookMemoId } : {}),
              ...(bookMemo !== undefined ? { bookMemo } : {}),
              duration: normalizeDurationSeconds(data),
              memo,
              ...(tagIds !== undefined ? { tagIds } : {}),
              pauseIntervals: normalizePauseIntervals(
                (data as unknown as { pauseIntervals?: unknown }).pauseIntervals,
              ),
              startTime: (() => {
                const v = (data as unknown as { startTime?: unknown })
                  .startTime;
                if (!isTimestampLike(v)) {
                  issues.push({
                    kind: "records.startTime",
                    refPath: d.ref.path,
                    reason: "startTime is not Timestamp",
                  });
                }
                return toIsoString(v);
              })(),
              endTime: (() => {
                const v = (data as unknown as { endTime?: unknown }).endTime;
                if (!isTimestampLike(v)) {
                  issues.push({
                    kind: "records.endTime",
                    refPath: d.ref.path,
                    reason: "endTime is not Timestamp",
                  });
                }
                return toIsoString(v);
              })(),
              createdAt: (() => {
                const v = (data as unknown as { createdAt?: unknown })
                  .createdAt;
                if (!isTimestampLike(v)) {
                  issues.push({
                    kind: "records.createdAt",
                    refPath: d.ref.path,
                    reason: "createdAt is not Timestamp",
                  });
                }
                return toIsoString(v);
              })(),
            };
          }),
        );

        setRecordIssues(issues);
      },
      onSnapshotError,
    );

    const unsubTags = onSnapshot(
      tagsQuery,
      (snapshot) => {
        const issues: Array<{ kind: string; refPath: string; reason: string }> =
          [];
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
            if (!isTimestampLike(data.createdAt)) {
              issues.push({
                kind: "tags.createdAt",
                refPath: d.ref.path,
                reason: "createdAt is not Timestamp",
              });
            }
            const createdAt = toIsoString(data.createdAt);

            return {
              id: d.id,
              text,
              description,
              createdAt,
            } satisfies Tag;
          }),
        );

        setTagIssues(issues);
      },
      onSnapshotError,
    );

    return () => {
      unsubBooks();
      unsubRecords();
      unsubTags();

      for (const unsub of memoUnsubsByBookId.values()) {
        try {
          unsub();
        } catch {
          // ignore
        }
      }
    };
  }, [db, uid]);

  const books = useMemo<Book[]>(() => {
    return baseBooks.map((b) => ({
      ...b,
      memos: bookMemosByBookId[b.id] ?? [],
    }));
  }, [baseBooks, bookMemosByBookId]);

  const migrationIssues = useMemo(() => {
    return [...bookIssues, ...memoIssues, ...recordIssues, ...tagIssues];
  }, [bookIssues, memoIssues, recordIssues, tagIssues]);

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
      const { memos: _memos, ...rest } = book as Omit<
        Book,
        "id" | "createdAt"
      > & { memos?: unknown };
      await addDoc(collection(db, "users", uid, "books"), {
        ...stripUndefined(rest as unknown as Record<string, unknown>),
        createdAt: Timestamp.now(),
      });
      registerGuestCreation();
    },
    [db, registerGuestCreation, uid],
  );

  const updateBook = useCallback(
    async (id: string, updates: Partial<Book>) => {
      if (!db || !uid) return;
      const {
        id: _id,
        memos: _memos,
        createdAt: _createdAt,
        ...rest
      } = updates as Partial<Book> & { memos?: unknown };
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
    async (bookId: string, memoText: string, createdAt?: string) => {
      if (!db || !uid) {
        throw new Error(
          "ログイン情報の取得中です。少し待ってからもう一度お試しください",
        );
      }
      const createdAtIso = createdAt?.trim() || new Date().toISOString();
      const ts = toTimestampFromIsoOrThrow(createdAtIso, "createdAt");

      const docRef = await addDoc(
        collection(db, "users", uid, "books", bookId, "memos"),
        {
          text: memoText,
          createdAt: ts,
        },
      );
      registerGuestCreation();
      return docRef.id;
    },
    [db, registerGuestCreation, uid],
  );

  const updateBookMemo = useCallback(
    async (bookId: string, memoId: string, updates: { text?: string }) => {
      if (!db || !uid) return;
      await updateDoc(
        doc(db, "users", uid, "books", bookId, "memos", memoId),
        stripUndefined({
          ...(typeof updates.text === "string" ? { text: updates.text } : {}),
        }),
      );
    },
    [db, uid],
  );

  const deleteBookMemo = useCallback(
    async (bookId: string, memoId: string) => {
      if (!db || !uid) return;
      await deleteDoc(doc(db, "users", uid, "books", bookId, "memos", memoId));
    },
    [db, uid],
  );

  const restoreBookMemo = useCallback(
    async (bookId: string, memo: BookMemo) => {
      if (!db || !uid) return;
      const ts = toTimestampFromIsoOrThrow(memo.createdAt, "createdAt");
      await setDoc(
        doc(db, "users", uid, "books", bookId, "memos", memo.id),
        {
          text: memo.text,
          createdAt: ts,
        },
        { merge: true },
      );
    },
    [db, uid],
  );

  const getBookMemoById = useCallback(
    (bookId: string, memoId: string) => {
      const memos = bookMemosByBookId[bookId] ?? [];
      return memos.find((memo) => memo.id === memoId);
    },
    [bookMemosByBookId],
  );

  // Record operations
  const addRecord = useCallback(
    async (record: Omit<ReadingRecord, "id" | "createdAt">) => {
      if (!db || !uid) {
        throw new Error(
          "ログイン情報の取得中です。少し待ってからもう一度お試しください",
        );
      }
      const startTs = toTimestampFromIsoOrThrow(record.startTime, "startTime");
      const endTs = toTimestampFromIsoOrThrow(record.endTime, "endTime");
      await addDoc(collection(db, "users", uid, "records"), {
        ...stripUndefined({
          ...(record as unknown as Record<string, unknown>),
          duration:
            typeof record.duration === "number"
              ? Math.max(0, Math.floor(record.duration))
              : record.duration,
          startTime: startTs,
          endTime: endTs,
        }),
        createdAt: Timestamp.now(),
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
      const {
        id: _id,
        startTime: startIso,
        endTime: endIso,
        ...rest
      } = updates;
      const nextRest: Record<string, unknown> = {
        ...rest,
        ...(typeof rest.duration === "number"
          ? { duration: Math.max(0, Math.floor(rest.duration)) }
          : {}),
        ...(typeof rest.bookId === "string" && rest.bookId === ""
          ? { bookId: deleteField() }
          : {}),
        ...(typeof rest.bookMemoId === "string" && rest.bookMemoId === ""
          ? { bookMemoId: deleteField() }
          : {}),
        ...(typeof rest.bookMemo === "string" && rest.bookMemo === ""
          ? { bookMemo: deleteField() }
          : {}),
        ...(typeof startIso === "string" && startIso.trim()
          ? { startTime: toTimestampFromIsoOrThrow(startIso, "startTime") }
          : {}),
        ...(typeof endIso === "string" && endIso.trim()
          ? { endTime: toTimestampFromIsoOrThrow(endIso, "endTime") }
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
        stripUndefined({
          ...(rest as unknown as Record<string, unknown>),
          startTime: toTimestampFromIsoOrThrow(record.startTime, "startTime"),
          endTime: toTimestampFromIsoOrThrow(record.endTime, "endTime"),
          createdAt: toTimestampFromIsoOrThrow(record.createdAt, "createdAt"),
        }),
        { merge: true },
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
      updateBookMemo,
      deleteBookMemo,
      restoreBookMemo,
      getBookMemoById,
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
      migrationIssues,
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
    updateBookMemo,
    updateRecord,
    updateTag,
    deleteBookMemo,
    restoreBookMemo,
    getBookMemoById,
    migrationIssues,
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
