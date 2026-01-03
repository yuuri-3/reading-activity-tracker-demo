import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
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
  writeBatch,
} from "firebase/firestore";
import { Book, ReadingRecord, TimerState, BookMemo, Tag } from "../types";
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

  // Tags
  tags: Tag[];
  createTag: (tag: {
    text: string;
    description?: string;
  }) => Promise<string | null>;
  updateTag: (
    id: string,
    updates: Partial<Pick<Tag, "text" | "description">>
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

type PersistedTimerStateV1 = {
  v: 1;
  isRunning: boolean;
  startTime: number | null;
  pausedTime: number;
};

const TIMER_STORAGE_VERSION = 1 as const;

function getTimerStorageKey(uid: string | undefined) {
  return `yomzoy:timerState:v${TIMER_STORAGE_VERSION}:${uid ?? "anon"}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function loadPersistedTimerState(storageKey: string): TimerState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedTimerStateV1>;
    if (parsed.v !== TIMER_STORAGE_VERSION) return null;
    if (typeof parsed.isRunning !== "boolean") return null;

    const startTime = parsed.startTime ?? null;
    const pausedTime = isFiniteNumber(parsed.pausedTime)
      ? Math.max(0, parsed.pausedTime)
      : 0;

    const hasValidStartTime = isFiniteNumber(startTime) && startTime > 0;

    if (parsed.isRunning && hasValidStartTime) {
      const elapsedTime = pausedTime + (Date.now() - startTime) / 1000;
      return {
        isRunning: true,
        startTime,
        pausedTime,
        elapsedTime: Math.max(0, elapsedTime),
      };
    }

    // Paused/idle state.
    return {
      isRunning: false,
      startTime: null,
      pausedTime,
      elapsedTime: pausedTime,
    };
  } catch {
    return null;
  }
}

function savePersistedTimerState(storageKey: string, timerState: TimerState) {
  if (typeof window === "undefined") return;

  const isDefault =
    !timerState.isRunning &&
    timerState.startTime === null &&
    timerState.pausedTime === 0;

  try {
    if (isDefault) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const payload: PersistedTimerStateV1 = {
      v: TIMER_STORAGE_VERSION,
      isRunning: timerState.isRunning,
      startTime: timerState.isRunning ? timerState.startTime : null,
      pausedTime: Math.max(0, timerState.pausedTime),
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // ignore (e.g. storage full / disabled)
  }
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
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

function normalizeTagText(text: string) {
  return text.trim();
}

function normalizeTagCompareKey(text: string) {
  return normalizeTagText(text).toLocaleLowerCase();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchText, setSearchText] = useState("");
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    pausedTime: 0,
  });

  const timerStorageKey = useMemo(
    () => getTimerStorageKey(user?.uid),
    [user?.uid]
  );
  const timerHydratingKeyRef = useRef<string | null>(null);

  const uid = user?.uid;

  const db = useMemo(() => {
    if (!uid) return null;
    return getFirestoreDb();
  }, [uid]);

  const tagsHydratedRef = useRef(false);

  // Subscribe to Firestore (single source of truth)
  useEffect(() => {
    if (!db || !uid) {
      setBooks([]);
      setRecords([]);
      setTags([]);
      tagsHydratedRef.current = false;
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

    const tagsQuery = query(
      collection(db, "users", uid, "tags"),
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
            duration: normalizeDurationSeconds(data),
            memo: data.memo,
            tagIds: Array.isArray(
              (data as unknown as { tagIds?: unknown }).tagIds
            )
              ? (
                  (data as unknown as { tagIds?: unknown }).tagIds as unknown[]
                ).filter(
                  (v): v is string => typeof v === "string" && v.length > 0
                )
              : undefined,
            tags: Array.isArray((data as unknown as { tags?: unknown }).tags)
              ? (
                  (data as unknown as { tags?: unknown }).tags as unknown[]
                ).filter((v): v is string => typeof v === "string")
              : undefined,
            startTime: data.startTime,
            endTime: data.endTime,
            createdAt: data.createdAt,
          };
        })
      );
    });

    const unsubTags = onSnapshot(tagsQuery, (snapshot) => {
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
            typeof data.createdAt === "string"
              ? data.createdAt
              : new Date().toISOString();

          return {
            id: d.id,
            text,
            description,
            createdAt,
          } satisfies Tag;
        })
      );
      tagsHydratedRef.current = true;
    });

    return () => {
      unsubBooks();
      unsubRecords();
      unsubTags();
    };
  }, [db, uid]);

  // Migration: legacy records.tags(string[]) => records.tagIds(string[])
  useEffect(() => {
    if (!db || !uid) return;
    if (!tagsHydratedRef.current) return;

    const legacyTargets = records.filter(
      (r) => (!r.tagIds || r.tagIds.length === 0) && (r.tags ?? []).length > 0
    );
    if (legacyTargets.length === 0) return;

    void (async () => {
      // Build name -> id index (prefer first found; duplicates allowed).
      const byName = new Map<string, string>();
      for (const t of tags) {
        const key = normalizeTagCompareKey(t.text);
        if (!key) continue;
        if (!byName.has(key)) byName.set(key, t.id);
      }

      // Create missing tags for legacy labels.
      const missingNames = new Map<string, string>();
      for (const r of legacyTargets) {
        for (const raw of r.tags ?? []) {
          const text = normalizeTagText(raw);
          if (!text) continue;
          const k = normalizeTagCompareKey(text);
          if (!k) continue;
          if (byName.has(k)) continue;
          if (missingNames.has(k)) continue;
          missingNames.set(k, text);
        }
      }

      for (const text of missingNames.values()) {
        const now = new Date().toISOString();
        const created = await addDoc(collection(db, "users", uid, "tags"), {
          text,
          description: "",
          createdAt: now,
        });
        byName.set(normalizeTagCompareKey(text), created.id);
      }

      // Update records with resolved tagIds.
      let batch = writeBatch(db);
      let ops = 0;
      const commit = async () => {
        if (ops === 0) return;
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      };

      for (const r of legacyTargets) {
        const nextIds: string[] = [];
        const seen = new Set<string>();
        for (const raw of r.tags ?? []) {
          const text = normalizeTagText(raw);
          if (!text) continue;
          const id = byName.get(normalizeTagCompareKey(text));
          if (!id) continue;
          if (seen.has(id)) continue;
          seen.add(id);
          nextIds.push(id);
        }

        if (nextIds.length === 0) continue;
        batch.update(doc(db, "users", uid, "records", r.id), {
          tagIds: nextIds,
        });
        ops += 1;
        if (ops >= 450) await commit();
      }

      await commit();
    })();
  }, [db, records, tags, uid]);

  const createTag = async (tag: { text: string; description?: string }) => {
    if (!db || !uid) return null;
    const text = normalizeTagText(tag.text);
    if (!text) return null;
    const now = new Date().toISOString();
    const created = await addDoc(collection(db, "users", uid, "tags"), {
      text,
      description: tag.description ?? "",
      createdAt: now,
    });
    return created.id;
  };

  const updateTag = async (
    id: string,
    updates: Partial<Pick<Tag, "text" | "description">>
  ) => {
    if (!db || !uid) return;
    const current = tags.find((t) => t.id === id);
    if (!current) return;

    const nextText =
      typeof updates.text === "string"
        ? normalizeTagText(updates.text)
        : current.text;
    const nextDescription =
      typeof updates.description === "string"
        ? updates.description
        : current.description;

    await updateDoc(
      doc(db, "users", uid, "tags", id),
      stripUndefined({
        ...(nextText !== current.text ? { text: nextText } : {}),
        ...(nextDescription !== current.description
          ? { description: nextDescription }
          : {}),
      })
    );
  };

  const deleteTag = async (id: string) => {
    if (!db || !uid) return;
    await deleteDoc(doc(db, "users", uid, "tags", id));
  };

  const restoreTag = async (tag: Tag) => {
    if (!db || !uid) return;
    const { id, ...rest } = tag;
    await setDoc(
      doc(db, "users", uid, "tags", id),
      stripUndefined({
        ...rest,
        text: normalizeTagText(tag.text),
        description: tag.description ?? "",
        createdAt: tag.createdAt ?? new Date().toISOString(),
      } as unknown as Record<string, unknown>)
    );
  };

  // Restore timer state from localStorage so reload doesn't reset measurement.
  // Use layout effect to avoid a "reset to 0" paint before hydration.
  useLayoutEffect(() => {
    timerHydratingKeyRef.current = timerStorageKey;
    const restored = loadPersistedTimerState(timerStorageKey);
    if (restored) {
      setTimerState(restored);
    } else {
      setTimerState({
        isRunning: false,
        startTime: null,
        elapsedTime: 0,
        pausedTime: 0,
      });
    }
  }, [timerStorageKey]);

  // Persist minimal timer fields (start/pause/reset only; not every tick).
  useEffect(() => {
    // If key changes, this effect might run for an intermediate render; ignore.
    if (timerHydratingKeyRef.current !== timerStorageKey) return;
    savePersistedTimerState(timerStorageKey, timerState);
  }, [
    timerStorageKey,
    timerState.isRunning,
    timerState.startTime,
    timerState.pausedTime,
  ]);

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
      ...stripUndefined({
        ...(record as unknown as Record<string, unknown>),
        duration:
          typeof record.duration === "number"
            ? Math.max(0, Math.floor(record.duration))
            : record.duration,
      }),
      createdAt: now,
    });
  };

  const updateRecord = async (id: string, updates: Partial<ReadingRecord>) => {
    if (!db || !uid) return;
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
      stripUndefined(nextRest)
    );
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

  return (
    <AppContext.Provider
      value={{
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
