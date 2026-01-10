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

  // Guest notice
  guestCreateNoticeOpen: boolean;
  closeGuestCreateNotice: () => void;
  dismissGuestCreateNotice: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

type PersistedTimerStateV1 = {
  v: 1;
  isRunning: boolean;
  startTime: number | null;
  pausedTime: number;
};

const TIMER_STORAGE_VERSION = 1 as const;

type PersistedGuestCreateNoticeV1 = {
  v: 1;
  createdCount: number;
  dismissed: boolean;
};

const GUEST_CREATE_NOTICE_STORAGE_VERSION = 1 as const;

function getTimerStorageKey(uid: string | undefined) {
  return `yomzoy:timerState:v${TIMER_STORAGE_VERSION}:${uid ?? "anon"}`;
}

function getGuestCreateNoticeStorageKey(uid: string | undefined) {
  return `yomzoy:guestCreateNotice:v${GUEST_CREATE_NOTICE_STORAGE_VERSION}:${
    uid ?? "anon"
  }`;
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

function loadPersistedGuestCreateNotice(
  storageKey: string
): PersistedGuestCreateNoticeV1 {
  if (typeof window === "undefined") {
    return {
      v: GUEST_CREATE_NOTICE_STORAGE_VERSION,
      createdCount: 0,
      dismissed: false,
    };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw)
      return {
        v: GUEST_CREATE_NOTICE_STORAGE_VERSION,
        createdCount: 0,
        dismissed: false,
      };
    const parsed = JSON.parse(raw) as Partial<PersistedGuestCreateNoticeV1>;
    if (parsed.v !== GUEST_CREATE_NOTICE_STORAGE_VERSION)
      return {
        v: GUEST_CREATE_NOTICE_STORAGE_VERSION,
        createdCount: 0,
        dismissed: false,
      };

    const createdCount =
      typeof parsed.createdCount === "number" &&
      Number.isFinite(parsed.createdCount)
        ? Math.max(0, Math.floor(parsed.createdCount))
        : 0;
    const dismissed =
      typeof parsed.dismissed === "boolean" ? parsed.dismissed : false;

    return { v: GUEST_CREATE_NOTICE_STORAGE_VERSION, createdCount, dismissed };
  } catch {
    return {
      v: GUEST_CREATE_NOTICE_STORAGE_VERSION,
      createdCount: 0,
      dismissed: false,
    };
  }
}

function savePersistedGuestCreateNotice(
  storageKey: string,
  state: PersistedGuestCreateNoticeV1
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // ignore (e.g. storage full / disabled)
  }
}

function shouldShowGuestCreateNotice(createdCount: number) {
  if (createdCount === 3) return true;
  if (createdCount > 3 && (createdCount - 3) % 5 === 0) return true;
  return false;
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

  const [guestCreateNoticeOpen, setGuestCreateNoticeOpen] = useState(false);

  const timerStorageKey = useMemo(
    () => getTimerStorageKey(user?.uid),
    [user?.uid]
  );

  const guestCreateNoticeStorageKey = useMemo(
    () => getGuestCreateNoticeStorageKey(user?.uid),
    [user?.uid]
  );
  const timerHydratingKeyRef = useRef<string | null>(null);

  const uid = user?.uid;

  const db = useMemo(() => {
    if (!uid) return null;
    return getFirestoreDb();
  }, [uid]);

  useEffect(() => {
    if (!user?.isAnonymous) {
      setGuestCreateNoticeOpen(false);
    }
  }, [user?.isAnonymous]);

  useEffect(() => {
    setGuestCreateNoticeOpen(false);
  }, [guestCreateNoticeStorageKey]);

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
              createdAt: data.createdAt,
            };
          })
        );
      },
      onSnapshotError
    );

    const unsubRecords = onSnapshot(
      recordsQuery,
      (snapshot) => {
        setRecords(
          snapshot.docs.map((d) => {
            const data = d.data() as Omit<ReadingRecord, "id">;
            const tagIds: string[] | undefined = Array.isArray(
              (data as unknown as { tagIds?: unknown }).tagIds
            )
              ? (
                  (data as unknown as { tagIds?: unknown }).tagIds as unknown[]
                ).filter(
                  (v): v is string => typeof v === "string" && v.length > 0
                )
              : undefined;

            return {
              id: d.id,
              bookId: data.bookId,
              duration: normalizeDurationSeconds(data),
              memo: data.memo,
              tagIds,
              startTime: data.startTime,
              endTime: data.endTime,
              createdAt: data.createdAt,
            };
          })
        );
      },
      onSnapshotError
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
      },
      onSnapshotError
    );

    return () => {
      unsubBooks();
      unsubRecords();
      unsubTags();
    };
  }, [db, uid]);

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

    if (user?.isAnonymous) {
      const current = loadPersistedGuestCreateNotice(
        guestCreateNoticeStorageKey
      );
      if (!current.dismissed) {
        const next: PersistedGuestCreateNoticeV1 = {
          v: GUEST_CREATE_NOTICE_STORAGE_VERSION,
          createdCount: current.createdCount + 1,
          dismissed: false,
        };
        savePersistedGuestCreateNotice(guestCreateNoticeStorageKey, next);
        if (shouldShowGuestCreateNotice(next.createdCount)) {
          setGuestCreateNoticeOpen(true);
        }
      }
    }
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
    if (!db || !uid) {
      throw new Error(
        "ログイン情報の取得中です。少し待ってからもう一度お試しください"
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

    if (user?.isAnonymous) {
      const current = loadPersistedGuestCreateNotice(
        guestCreateNoticeStorageKey
      );
      if (!current.dismissed) {
        const next: PersistedGuestCreateNoticeV1 = {
          v: GUEST_CREATE_NOTICE_STORAGE_VERSION,
          createdCount: current.createdCount + 1,
          dismissed: false,
        };
        savePersistedGuestCreateNotice(guestCreateNoticeStorageKey, next);
        if (shouldShowGuestCreateNotice(next.createdCount)) {
          setGuestCreateNoticeOpen(true);
        }
      }
    }
  };

  const closeGuestCreateNotice = () => setGuestCreateNoticeOpen(false);

  const dismissGuestCreateNotice = () => {
    setGuestCreateNoticeOpen(false);
    if (!user?.isAnonymous) return;
    const current = loadPersistedGuestCreateNotice(guestCreateNoticeStorageKey);
    if (current.dismissed) return;
    savePersistedGuestCreateNotice(guestCreateNoticeStorageKey, {
      ...current,
      dismissed: true,
    });
  };

  const updateRecord = async (id: string, updates: Partial<ReadingRecord>) => {
    if (!db || !uid) {
      throw new Error(
        "ログイン情報の取得中です。少し待ってからもう一度お試しください"
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

        guestCreateNoticeOpen,
        closeGuestCreateNotice,
        dismissGuestCreateNotice,
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
