import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { initializeApp, deleteApp } from "firebase/app";
import {
  browserLocalPersistence,
  deleteUser,
  GoogleAuthProvider,
  getRedirectResult,
  getAuth as getAuthFromApp,
  inMemoryPersistence,
  onAuthStateChanged,
  setPersistence,
  type Auth,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  linkWithPopup,
  linkWithRedirect,
  signOut as firebaseSignOut,
  type User,
  type OAuthCredential,
  updateCurrentUser,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  getDocs,
  getFirestore as getFirestoreFromApp,
  writeBatch,
  doc as firestoreDoc,
  deleteDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  getFirebaseAuth,
  getFirebaseApp,
  getFirebaseFunctions,
  getFirestoreDb,
  getGoogleProvider,
} from "../firebase/firebase";
import { checkGuestMergeBackend } from "../firebase/guestMergeBackend";
import { getCallableErrorCode } from "../firebase/functionsError";
import {
  ACCOUNT_DELETION_SUBCOLLECTIONS,
  deleteFirestoreUserDataForAccountDeletion,
} from "./accountDeletion";

type FirestoreDocData = Record<string, unknown>;
type FirestoreDocSnapshot = { id: string; data: FirestoreDocData };

type SecondaryAppAuthAndDb = Awaited<
  ReturnType<typeof createSecondaryAppAuthAndDb>
>;

type PrepareGuestMergeCallableResult = {
  requestId: string;
  secret: string;
  expiresAt: string;
};

type PreviewGuestMergeCallableResult = {
  anonUid: string;
  counts: { tags: number; books: number; records: number };
};

async function createSecondaryAppAuthAndDb() {
  const primaryApp = getFirebaseApp();
  const name = `yomzoy-secondary-${Date.now()}-${Math.random()}`;
  const app = initializeApp(primaryApp.options, name);
  const auth = getAuthFromApp(app);
  // Avoid affecting the primary auth state/persistence.
  try {
    await setPersistence(auth, inMemoryPersistence);
  } catch {
    // ignore
  }
  const db = getFirestoreFromApp(app);
  return { app, auth, db };
}

async function readUserSubcollectionDocs(
  db: ReturnType<typeof getFirestoreDb>,
  uid: string,
  subcollection: "tags" | "books" | "records"
): Promise<FirestoreDocSnapshot[]> {
  const snap = await getDocs(collection(db, "users", uid, subcollection));
  return snap.docs.map((d) => {
    const raw = (d.data() as unknown as FirestoreDocData) ?? {};
    return {
      id: d.id,
      data: normalizeMigratingDocData(subcollection, raw, d.id),
    };
  });
}

function toIsoStringMaybe(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const t = new Date(value);
    return Number.isNaN(t.getTime()) ? null : t.toISOString();
  }
  if (value instanceof Date) return value.toISOString();

  const asAny = value as any;
  if (asAny && typeof asAny.toDate === "function") {
    try {
      const d = asAny.toDate();
      return d instanceof Date ? d.toISOString() : null;
    } catch {
      return null;
    }
  }
  if (typeof asAny?.seconds === "number") {
    const ms = asAny.seconds * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // heuristics: milliseconds epoch (>= 10^12) else seconds.
    const ms = value >= 1_000_000_000_000 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const filtered = value.filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
  return filtered.length > 0 ? filtered : undefined;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMigratingDocData(
  subcollection: "tags" | "books" | "records",
  data: FirestoreDocData,
  id: string
): FirestoreDocData {
  const nowIso = new Date().toISOString();

  if (subcollection === "tags") {
    const createdAt =
      toIsoStringMaybe((data as any).createdAt) ||
      toIsoStringMaybe((data as any).created_at) ||
      nowIso;
    const text = normalizeString((data as any).text, "").trim();
    const description = normalizeString((data as any).description, "");
    return {
      ...data,
      text,
      description,
      createdAt,
    };
  }

  if (subcollection === "books") {
    const createdAt =
      toIsoStringMaybe((data as any).createdAt) ||
      toIsoStringMaybe((data as any).created_at) ||
      nowIso;
    const title = normalizeString((data as any).title, "");
    const author = normalizeString((data as any).author, "");

    const rawMemos = Array.isArray((data as any).memos)
      ? (data as any).memos
      : [];
    const memos = rawMemos
      .map((m: any, idx: number) => {
        if (!m || typeof m !== "object") return null;
        const memoId = normalizeString(m.id, String(idx));
        const text = normalizeString(m.text, "");
        const createdAt =
          toIsoStringMaybe(m.createdAt) ||
          toIsoStringMaybe(m.created_at) ||
          nowIso;
        return { id: memoId, text, createdAt };
      })
      .filter(Boolean);

    return {
      ...data,
      title,
      ...(author ? { author } : {}),
      memos,
      createdAt,
    };
  }

  // records
  const createdAt =
    toIsoStringMaybe((data as any).createdAt) ||
    toIsoStringMaybe((data as any).created_at) ||
    nowIso;

  const memo = normalizeString((data as any).memo, "");
  const bookIdRaw =
    (data as any).bookId ?? (data as any).book_id ?? (data as any).bookID;
  const bookId = typeof bookIdRaw === "string" ? bookIdRaw : undefined;

  const tagIds =
    normalizeStringArray((data as any).tagIds) ||
    normalizeStringArray((data as any).tag_ids) ||
    normalizeStringArray((data as any).tags);

  let startTime =
    toIsoStringMaybe((data as any).startTime) ||
    toIsoStringMaybe((data as any).startAt) ||
    toIsoStringMaybe((data as any).start_time) ||
    toIsoStringMaybe((data as any).startedAt);
  let endTime =
    toIsoStringMaybe((data as any).endTime) ||
    toIsoStringMaybe((data as any).endAt) ||
    toIsoStringMaybe((data as any).end_time) ||
    toIsoStringMaybe((data as any).endedAt);

  let duration = normalizeNumber((data as any).duration, 0);
  duration = Math.max(0, Math.floor(duration));

  // Fill missing times best-effort so UI can display them.
  if (!startTime && endTime && duration > 0) {
    const end = new Date(endTime);
    if (!Number.isNaN(end.getTime())) {
      startTime = new Date(end.getTime() - duration * 1000).toISOString();
    }
  }
  if (!endTime && startTime && duration > 0) {
    const start = new Date(startTime);
    if (!Number.isNaN(start.getTime())) {
      endTime = new Date(start.getTime() + duration * 1000).toISOString();
    }
  }
  if (!startTime && !endTime) {
    // fallback: at least make it show up in grouped list
    startTime = createdAt;
    endTime = createdAt;
  }

  return {
    ...data,
    memo,
    duration,
    createdAt,
    startTime,
    endTime,
    ...(bookId ? { bookId } : {}),
    ...(tagIds ? { tagIds } : {}),
    _migratedFromAnon: true,
    _migratedFromAnonId: id,
  };
}

async function writeUserSubcollectionDocsMerge(
  db: ReturnType<typeof getFirestoreDb>,
  uid: string,
  subcollection: "tags" | "books" | "records",
  docs: FirestoreDocSnapshot[]
) {
  if (docs.length === 0) return;

  // Firestore batch limit is 500 operations. Keep margin.
  let batch = writeBatch(db);
  let opCount = 0;

  for (const d of docs) {
    const ref = firestoreDoc(db, "users", uid, subcollection, d.id);
    batch.set(ref, d.data, { merge: true });
    opCount += 1;

    if (opCount >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }
}

async function deleteCollectionDocs(
  db: ReturnType<typeof getFirestoreDb>,
  ...path: [string, ...string[]]
) {
  const snap = await getDocs(collection(db, ...path));
  if (snap.empty) return;

  // Firestore batch limit is 500 operations. Keep margin.
  let batch = writeBatch(db);
  let opCount = 0;

  for (const d of snap.docs) {
    batch.delete(d.ref);
    opCount += 1;
    if (opCount >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }
}

function isLikelyMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function cleanupLocalStorageForUid(
  targetUid: string,
  options: {
    guestCreateNotice?: boolean;
    timerState?: boolean;
  }
) {
  if (typeof window === "undefined") return;

  const prefixes: string[] = [];
  if (options.guestCreateNotice) prefixes.push("yomzoy:guestCreateNotice:v");
  if (options.timerState) prefixes.push("yomzoy:timerState:v");
  if (prefixes.length === 0) return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (!key.endsWith(`:${targetUid}`)) continue;
      if (!prefixes.some((p) => key.startsWith(p))) continue;
      keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore (e.g. storage disabled)
  }
}

function getErrorCode(err: unknown): string | undefined {
  const maybe = err as { code?: unknown };
  return typeof maybe?.code === "string" ? maybe.code : undefined;
}

function getErrorEmail(err: unknown): string | undefined {
  const asAny = err as any;

  const directEmail = asAny?.email;
  if (typeof directEmail === "string" && directEmail) return directEmail;

  const customEmail = asAny?.customData?.email;
  if (typeof customEmail === "string" && customEmail) return customEmail;

  const tokenEmail = asAny?.customData?._tokenResponse?.email;
  if (typeof tokenEmail === "string" && tokenEmail) return tokenEmail;

  // Some FirebaseAuthError cases only carry an OAuthCredential.
  try {
    const cred = GoogleAuthProvider.credentialFromError(err as any) as any;
    const idToken = cred?.idToken;
    if (typeof idToken === "string" && idToken.includes(".")) {
      const payload = idToken.split(".")[1];
      if (payload) {
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(
          base64.length + ((4 - (base64.length % 4)) % 4),
          "="
        );
        const json = globalThis.atob ? globalThis.atob(padded) : "";
        if (json) {
          const parsed = JSON.parse(json) as { email?: unknown };
          if (typeof parsed.email === "string" && parsed.email)
            return parsed.email;
        }
      }
    }
  } catch {
    // ignore
  }

  return undefined;
}

function isMissingInitialStateError(err: unknown): boolean {
  return err instanceof Error && /missing initial state/i.test(err.message);
}

const REDIRECT_FLAG_KEY = "yomzoy_redirect_in_progress";
const AUTH_CALLBACK_PATH = "/auth/callback";

function joinWithBase(pathname: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = pathname === "/" ? "" : pathname;
  return `${normalizedBase}${normalizedPath}` || "/";
}

function replacePathname(pathname: string) {
  try {
    if (typeof window === "undefined") return;
    const nextPathname = joinWithBase(pathname);
    window.history.replaceState(
      null,
      "",
      `${nextPathname}${window.location.search}`
    );
  } catch {
    // ignore
  }
}

function setRedirectFlag(value: boolean) {
  try {
    if (typeof window === "undefined") return;
    if (value) {
      window.sessionStorage.setItem(REDIRECT_FLAG_KEY, "1");
    } else {
      window.sessionStorage.removeItem(REDIRECT_FLAG_KEY);
    }
  } catch {
    // ignore (storage may be unavailable)
  }
}

function getRedirectFlag(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(REDIRECT_FLAG_KEY) === "1"
    );
  } catch {
    return false;
  }
}

async function startRedirect(auth: Auth) {
  const provider = getGoogleProvider();
  // redirect後の戻り先を callback に固定
  replacePathname(AUTH_CALLBACK_PATH);
  setRedirectFlag(true);
  await signInWithRedirect(auth, provider);
}

async function startLinkRedirect(auth: Auth, user: User) {
  const provider = getGoogleProvider();
  // redirect後の戻り先を callback に固定
  replacePathname(AUTH_CALLBACK_PATH);
  setRedirectFlag(true);
  await linkWithRedirect(user, provider);
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  fallbackMigrationInProgress: boolean;
  pendingFallbackAccountMismatch: {
    expectedEmail: string;
    selectedEmail: string;
    counts: { tags: number; books: number; records: number };
  } | null;
  pendingFallbackMigration: {
    reasonCode:
      | "auth/credential-already-in-use"
      | "auth/account-exists-with-different-credential"
      | "auth/email-already-in-use";
    counts: { tags: number; books: number; records: number };
  } | null;
  signInAnonymously: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  confirmFallbackMigration: () => Promise<boolean>;
  confirmFallbackAccountMismatchProceed: () => Promise<boolean>;
  cancelFallbackAccountMismatch: () => void;
  cancelFallbackMigration: () => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export type MockAuthProviderProps = {
  children: ReactNode;
  user?: User | null;
  loading?: boolean;
  error?: string | null;
  fallbackMigrationInProgress?: boolean;
  pendingFallbackAccountMismatch?: AuthContextValue["pendingFallbackAccountMismatch"];
  pendingFallbackMigration?: AuthContextValue["pendingFallbackMigration"];
  signInAnonymously?: () => Promise<void>;
  signInWithGoogle?: () => Promise<void>;
  confirmFallbackMigration?: () => Promise<boolean>;
  confirmFallbackAccountMismatchProceed?: () => Promise<boolean>;
  cancelFallbackAccountMismatch?: () => void;
  cancelFallbackMigration?: () => void;
  signOut?: () => Promise<void>;
  deleteAccount?: () => Promise<void>;
};

// Storybook 等で Firebase を初期化せずに useAuth を動かすための Provider。
export function MockAuthProvider({
  children,
  user = null,
  loading = false,
  error = null,
  fallbackMigrationInProgress = false,
  pendingFallbackAccountMismatch = null,
  pendingFallbackMigration = null,
  signInAnonymously,
  signInWithGoogle,
  confirmFallbackMigration,
  confirmFallbackAccountMismatchProceed,
  cancelFallbackAccountMismatch,
  cancelFallbackMigration,
  signOut,
  deleteAccount,
}: MockAuthProviderProps) {
  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      loading,
      error,
      fallbackMigrationInProgress,
      pendingFallbackAccountMismatch,
      pendingFallbackMigration,
      signInAnonymously: signInAnonymously ?? (async () => {}),
      signInWithGoogle: signInWithGoogle ?? (async () => {}),
      confirmFallbackMigration: confirmFallbackMigration ?? (async () => false),
      confirmFallbackAccountMismatchProceed:
        confirmFallbackAccountMismatchProceed ?? (async () => false),
      cancelFallbackAccountMismatch:
        cancelFallbackAccountMismatch ?? (() => {}),
      cancelFallbackMigration: cancelFallbackMigration ?? (() => {}),
      signOut: signOut ?? (async () => {}),
      deleteAccount: deleteAccount ?? (async () => {}),
    };
  }, [
    cancelFallbackAccountMismatch,
    cancelFallbackMigration,
    confirmFallbackAccountMismatchProceed,
    confirmFallbackMigration,
    deleteAccount,
    error,
    fallbackMigrationInProgress,
    pendingFallbackAccountMismatch,
    loading,
    pendingFallbackMigration,
    signInAnonymously,
    signInWithGoogle,
    signOut,
    user,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMigrationInProgress, setFallbackMigrationInProgress] =
    useState(false);
  const [pendingFallbackAccountMismatch, setPendingFallbackAccountMismatch] =
    useState<AuthContextValue["pendingFallbackAccountMismatch"]>(null);
  const [pendingFallbackMigration, setPendingFallbackMigration] =
    useState<AuthContextValue["pendingFallbackMigration"]>(null);

  const pendingFallbackDataRef = React.useRef<{
    anonUser: User;
    anonUid: string;
    expectedEmail?: string;
    reasonCode: NonNullable<
      AuthContextValue["pendingFallbackMigration"]
    >["reasonCode"];
    // Backend merge support (ideal flow)
    mergeRequest?: PrepareGuestMergeCallableResult;
    linkErrorCredential?: OAuthCredential | null;

    // Legacy client-side migration data (fallback)
    anonTags?: FirestoreDocSnapshot[];
    anonBooks?: FirestoreDocSnapshot[];
    anonRecords?: FirestoreDocSnapshot[];
  } | null>(null);

  const fallbackSecondaryRef = React.useRef<{
    secondary: SecondaryAppAuthAndDb;
    nextUid: string;
    googleCredential: ReturnType<
      typeof GoogleAuthProvider.credentialFromResult
    >;
    selectedEmail: string;
  } | null>(null);

  const fallbackMigrationRunningRef = React.useRef(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const auth = getFirebaseAuth();

      // 永続化（特にモバイルSafariでログイン状態が戻らない対策）
      void (async () => {
        try {
          await setPersistence(auth, browserLocalPersistence);
        } catch {
          // ignore
        }
      })();

      // signInWithRedirect の結果を拾ってエラー表示できるようにする
      void (async () => {
        try {
          const result = await getRedirectResult(auth);
          // ここまで来たらredirect処理は一旦完了
          setRedirectFlag(false);

          // resultがnullでもOK（redirectしていないケース）
          // ただし、redirect中フラグが残ったままなら解除しておく
          void result;
        } catch (err) {
          setRedirectFlag(false);
          setError(
            err instanceof Error ? err.message : "Googleログインに失敗しました"
          );
        }
      })();

      // redirectを開始したのにuserが確定しない場合、ループになりがちなので止める
      if (getRedirectFlag()) {
        window.setTimeout(() => {
          // まだログインできていない & フラグが残っているならエラーにする
          if (!auth.currentUser && getRedirectFlag()) {
            setRedirectFlag(false);
            setError(
              "ログインが完了しませんでした（iOSのSafari設定やアプリ内ブラウザが原因のことがあります）。\n\n対処: Safariで開く／iOS設定→Safari→『サイト越えトラッキングを防ぐ』をOFFにする、を試してください。"
            );
          }
        }, 4000);
      }

      unsubscribe = onAuthStateChanged(
        auth,
        (nextUser) => {
          setUser(nextUser);
          setLoading(false);
        },
        (err) => {
          setError(err.message || "ログイン状態の取得に失敗しました");
          setLoading(false);
        }
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Firebaseの初期化に失敗しました"
      );
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    // When a guest user becomes a non-anonymous user (via link or redirect sign-in),
    // remove guest-only counters from localStorage.
    if (!user?.uid) return;
    if (user.isAnonymous) return;
    cleanupLocalStorageForUid(user.uid, { guestCreateNotice: true });
  }, [user?.uid, user?.isAnonymous]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      loading,
      error,
      fallbackMigrationInProgress,
      pendingFallbackAccountMismatch,
      pendingFallbackMigration,
      signInAnonymously: async () => {
        setError(null);
        setLoading(true);

        try {
          const auth = getFirebaseAuth();
          await firebaseSignInAnonymously(auth);

          // Keep loading=true until onAuthStateChanged receives the new user.
          // This makes AuthGate show the existing loading UI during sign-in.
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "匿名ログインに失敗しました"
          );
          setLoading(false);
        }
      },
      signInWithGoogle: async () => {
        setError(null);

        // Clear any pending mismatch flow.
        setPendingFallbackAccountMismatch(null);
        if (fallbackSecondaryRef.current) {
          try {
            await deleteApp(fallbackSecondaryRef.current.secondary.app);
          } catch {
            // ignore
          }
          fallbackSecondaryRef.current = null;
        }

        // Any new attempt should clear a pending fallback request.
        pendingFallbackDataRef.current = null;
        setPendingFallbackMigration(null);
        try {
          const auth = getFirebaseAuth();
          const provider = getGoogleProvider();

          const currentUser = auth.currentUser;
          if (currentUser?.isAnonymous) {
            try {
              // Prefer linking so uid stays the same.
              const anonUid = currentUser.uid;
              await linkWithPopup(currentUser, provider);

              // Guest-only counters are no longer needed after linking.
              cleanupLocalStorageForUid(anonUid, { guestCreateNotice: true });
              return;
            } catch (err) {
              const code = getErrorCode(err);

              // iOS/アプリ内ブラウザでありがちなredirect状態欠落
              if (isMissingInitialStateError(err)) {
                setError(
                  "ログイン状態の受け渡しに失敗しました。\n\n対処: Safariで開く／iOS設定→Safari→『サイト越えトラッキングを防ぐ』をOFFにする、を試してください。"
                );
                return;
              }

              // popup環境依存エラーはredirectでフォールバック（link版）
              if (
                code === "auth/popup-blocked" ||
                code === "auth/popup-closed-by-user" ||
                code === "auth/web-storage-unsupported" ||
                (isLikelyMobile() &&
                  code === "auth/operation-not-supported-in-this-environment")
              ) {
                try {
                  await startLinkRedirect(getFirebaseAuth(), currentUser);
                  return;
                } catch (redirectErr) {
                  setRedirectFlag(false);
                  setError(
                    redirectErr instanceof Error
                      ? redirectErr.message
                      : "Googleログインに失敗しました"
                  );
                  return;
                }
              }

              // Linkできない場合はゲスト継続を許可（詳細設計はP0-02で対応）
              if (
                code === "auth/credential-already-in-use" ||
                code === "auth/account-exists-with-different-credential" ||
                code === "auth/email-already-in-use"
              ) {
                // Ideal flow: account was selected already, but linking failed because it belongs to an existing user.
                // Show a confirmation dialog and (on OK) migrate via backend without a second account picker.
                const enableBackendMerge =
                  (import.meta as any)?.env?.VITE_ENABLE_BACKEND_GUEST_MERGE ===
                  "true";

                const anonUid = currentUser.uid;
                const expectedEmail = getErrorEmail(err);
                const linkErrorCredential =
                  (GoogleAuthProvider.credentialFromError(
                    err
                  ) as OAuthCredential | null) ?? null;

                if (enableBackendMerge) {
                  try {
                    const backend = await checkGuestMergeBackend();
                    if (backend.status !== "available") {
                      throw new Error("BACKEND_MERGE_UNAVAILABLE");
                    }

                    const functions = getFirebaseFunctions();
                    const prepare = httpsCallable(
                      functions,
                      "prepareGuestMerge"
                    );
                    const preparedRaw = await prepare({});
                    const prepared = (preparedRaw.data ?? {}) as any;
                    const mergeRequest: PrepareGuestMergeCallableResult = {
                      requestId: String(prepared.requestId ?? ""),
                      secret: String(prepared.secret ?? ""),
                      expiresAt: String(prepared.expiresAt ?? ""),
                    };
                    if (!mergeRequest.requestId || !mergeRequest.secret) {
                      throw new Error("統合準備に失敗しました");
                    }

                    // Fetch counts from backend so we don't have to read all docs client-side.
                    let counts = { tags: 0, books: 0, records: 0 };
                    try {
                      const preview = httpsCallable(
                        functions,
                        "previewGuestMerge"
                      );
                      const previewRaw = await preview({
                        requestId: mergeRequest.requestId,
                        secret: mergeRequest.secret,
                      });
                      const previewData = (previewRaw.data ??
                        {}) as PreviewGuestMergeCallableResult;
                      if (previewData?.counts) {
                        counts = {
                          tags: Number(previewData.counts.tags ?? 0),
                          books: Number(previewData.counts.books ?? 0),
                          records: Number(previewData.counts.records ?? 0),
                        };
                      }
                    } catch {
                      // If preview fails, still allow migration (counts will be unknown/0).
                    }

                    pendingFallbackDataRef.current = {
                      anonUser: currentUser,
                      anonUid,
                      expectedEmail,
                      reasonCode: code,
                      mergeRequest,
                      linkErrorCredential,
                    };
                    setPendingFallbackMigration({
                      reasonCode: code,
                      counts,
                    });
                    return;
                  } catch (migrationErr) {
                    // If backend merge is unavailable, fall back to legacy client-side copy.
                    if (
                      migrationErr instanceof Error &&
                      migrationErr.message === "BACKEND_MERGE_UNAVAILABLE"
                    ) {
                      // continue to legacy fallback
                    } else {
                      toast.error("統合準備に失敗しました");
                      setError(
                        migrationErr instanceof Error
                          ? migrationErr.message
                          : "統合準備に失敗しました"
                      );
                      return;
                    }
                  }
                }

                // Legacy fallback (client-side copy)
                const db = getFirestoreDb();
                try {
                  const [anonTags, anonBooks, anonRecords] = await Promise.all([
                    readUserSubcollectionDocs(db, anonUid, "tags"),
                    readUserSubcollectionDocs(db, anonUid, "books"),
                    readUserSubcollectionDocs(db, anonUid, "records"),
                  ]);
                  pendingFallbackDataRef.current = {
                    anonUser: currentUser,
                    anonUid,
                    expectedEmail,
                    reasonCode: code,
                    anonTags,
                    anonBooks,
                    anonRecords,
                  };
                  setPendingFallbackMigration({
                    reasonCode: code,
                    counts: {
                      tags: anonTags.length,
                      books: anonBooks.length,
                      records: anonRecords.length,
                    },
                  });
                  return;
                } catch (migrationErr) {
                  toast.error("データ移行に失敗しました");
                  setError(
                    migrationErr instanceof Error
                      ? migrationErr.message
                      : "データ移行に失敗しました"
                  );
                  return;
                }
              }

              setError(
                err instanceof Error
                  ? err.message
                  : "Googleログインに失敗しました"
              );
              return;
            }
          }

          // まずはpopupを試す（iOSでもpopupが通る環境があるため）
          await signInWithPopup(auth, provider);
        } catch (err) {
          const code = getErrorCode(err);

          // iOS/アプリ内ブラウザでありがちなredirect状態欠落
          if (isMissingInitialStateError(err)) {
            setError(
              "ログイン状態の受け渡しに失敗しました。\n\n対処: Safariで開く／iOS設定→Safari→『サイト越えトラッキングを防ぐ』をOFFにする、を試してください。"
            );
            return;
          }

          // popup環境依存エラーはredirectでフォールバック
          if (
            code === "auth/popup-blocked" ||
            code === "auth/popup-closed-by-user" ||
            code === "auth/web-storage-unsupported" ||
            (isLikelyMobile() &&
              code === "auth/operation-not-supported-in-this-environment")
          ) {
            try {
              await startRedirect(getFirebaseAuth());
              return;
            } catch (redirectErr) {
              setRedirectFlag(false);
              setError(
                redirectErr instanceof Error
                  ? redirectErr.message
                  : "Googleログインに失敗しました"
              );
              return;
            }
          }

          setError(
            err instanceof Error ? err.message : "Googleログインに失敗しました"
          );
        }
      },
      confirmFallbackMigration: async () => {
        const pending = pendingFallbackDataRef.current;
        if (!pending) return false;

        if (fallbackMigrationRunningRef.current) return false;
        fallbackMigrationRunningRef.current = true;
        setFallbackMigrationInProgress(true);

        setError(null);

        // Clear any previous mismatch flow.
        setPendingFallbackAccountMismatch(null);
        if (fallbackSecondaryRef.current) {
          try {
            await deleteApp(fallbackSecondaryRef.current.secondary.app);
          } catch {
            // ignore
          }
          fallbackSecondaryRef.current = null;
        }

        const migratingToastId = toast.message(
          "ゲストデータを移行しています…",
          { duration: Infinity }
        );

        try {
          const auth = getFirebaseAuth();
          const provider = getGoogleProvider();
          const db = getFirestoreDb();

          // Ideal flow (backend merge): reuse the credential from the failed link attempt so we don't show
          // the Google account picker again.
          const enableBackendMerge =
            (import.meta as any)?.env?.VITE_ENABLE_BACKEND_GUEST_MERGE ===
            "true";
          if (enableBackendMerge && pending.mergeRequest) {
            try {
              const functions = getFirebaseFunctions();

              // 1) Switch primary auth to the selected Google account (no picker if we have a credential).
              if (pending.linkErrorCredential) {
                await signInWithCredential(auth, pending.linkErrorCredential);
              } else {
                // Fallback: picker may appear (rare; when credentialFromError is unavailable).
                await signInWithPopup(auth, provider);
              }
              setUser(auth.currentUser);

              // 2) Execute merge
              const execute = httpsCallable(functions, "executeGuestMerge");
              await execute({
                requestId: pending.mergeRequest.requestId,
                secret: pending.mergeRequest.secret,
              });

              cleanupLocalStorageForUid(pending.anonUid, {
                guestCreateNotice: true,
                timerState: true,
              });

              pendingFallbackDataRef.current = null;
              setPendingFallbackMigration(null);
              setPendingFallbackAccountMismatch(null);

              toast.dismiss(migratingToastId);
              toast.success("ゲストデータを統合しました");
              return true;
            } catch (err) {
              const code = getCallableErrorCode(err);
              setError(
                code
                  ? `統合に失敗しました（${code}）。もう一度お試しください。`
                  : "統合に失敗しました。もう一度お試しください。"
              );
              toast.dismiss(migratingToastId);
              return false;
            }
          }

          // Keep primary auth as anon until cleanup is done.
          const secondary = await createSecondaryAppAuthAndDb();
          let nextUid: string;
          let googleCredential: ReturnType<
            typeof GoogleAuthProvider.credentialFromResult
          > = null;
          let selectedEmail = "";
          let keepSecondary = false;

          try {
            // 2) Googleアカウントにログイン（secondary）
            // ※ ここは必ずpopup（アカウント選択が表示される）
            const secondaryResult = await signInWithPopup(
              secondary.auth,
              provider
            );

            nextUid = secondaryResult.user.uid;
            googleCredential =
              GoogleAuthProvider.credentialFromResult(secondaryResult);

            selectedEmail = (secondaryResult.user.email ?? "").trim();
            const expectedEmail = (pending.expectedEmail ?? "").trim();
            if (
              expectedEmail &&
              selectedEmail &&
              expectedEmail !== selectedEmail
            ) {
              // Stop here and ask for explicit confirmation.
              keepSecondary = true;
              fallbackSecondaryRef.current = {
                secondary,
                nextUid,
                googleCredential,
                selectedEmail,
              };
              setPendingFallbackAccountMismatch({
                expectedEmail,
                selectedEmail,
                counts: {
                  tags: pending.anonTags.length,
                  books: pending.anonBooks.length,
                  records: pending.anonRecords.length,
                },
              });
              toast.dismiss(migratingToastId);
              return false;
            }

            // 3) tags -> books -> records の順で「追加のみ」コピー（secondaryの認証で実行）
            await writeUserSubcollectionDocsMerge(
              secondary.db,
              nextUid,
              "tags",
              pending.anonTags
            );
            await writeUserSubcollectionDocsMerge(
              secondary.db,
              nextUid,
              "books",
              pending.anonBooks
            );
            await writeUserSubcollectionDocsMerge(
              secondary.db,
              nextUid,
              "records",
              pending.anonRecords
            );
          } catch (popupErr) {
            const popupCode = getErrorCode(popupErr);

            if (isMissingInitialStateError(popupErr)) {
              setError(
                "ログイン状態の受け渡しに失敗しました。\n\n対処: Safariで開く／iOS設定→Safari→『サイト越えトラッキングを防ぐ』をOFFにする、を試してください。"
              );
              toast.dismiss(migratingToastId);
              return false;
            }

            if (
              popupCode === "auth/popup-blocked" ||
              popupCode === "auth/popup-closed-by-user" ||
              popupCode === "auth/web-storage-unsupported" ||
              (isLikelyMobile() &&
                popupCode ===
                  "auth/operation-not-supported-in-this-environment")
            ) {
              setError(
                "この環境ではGoogleログインを開始できませんでした。\n\n対処: Safariで開く／ポップアップを許可する、を試してください。"
              );
              toast.dismiss(migratingToastId);
              return false;
            }

            setError(
              popupErr instanceof Error
                ? popupErr.message
                : "Googleログインに失敗しました"
            );
            toast.dismiss(migratingToastId);
            return false;
          } finally {
            // Cleanup secondary app resources
            if (!keepSecondary) {
              try {
                await deleteApp(secondary.app);
              } catch {
                // ignore
              }
            }
          }

          toast.dismiss(migratingToastId);
          const copiedCount =
            pending.anonTags.length +
            pending.anonBooks.length +
            pending.anonRecords.length;

          // 5) primary を Googleログインへ切り替える（可能ならcredentialでサイレント）
          // ここが成功しないと「統合先のuidでデータが見える」状態にならない。
          try {
            if (googleCredential) {
              await signInWithCredential(auth, googleCredential);
            } else {
              await signInWithPopup(auth, provider);
            }
            setUser(auth.currentUser);

            const loggedInUid = auth.currentUser?.uid ?? "";
            if (nextUid && loggedInUid && nextUid !== loggedInUid) {
              // uidが一致しない場合、統合先のデータが画面に表示されないため停止する
              try {
                await updateCurrentUser(auth, pending.anonUser);
                setUser(pending.anonUser);
              } catch {
                // ignore
              }
              setError(
                "ログインしたアカウントが統合先と一致しませんでした。統合先と同じGoogleアカウントでログインして、もう一度お試しください。"
              );
              return false;
            }

            // popupフォールバック等で移行先と異なるアカウントにログインしてしまうと、
            // 「Firebaseには統合されたが画面に出ない」状態になるため、ここで防ぐ。
            const loggedInEmail = (auth.currentUser?.email ?? "").trim();
            if (
              selectedEmail &&
              loggedInEmail &&
              selectedEmail !== loggedInEmail
            ) {
              // 匿名に戻してから、確認ダイアログを出す（ここではコピー/削除を進めない）
              try {
                await updateCurrentUser(auth, pending.anonUser);
                setUser(pending.anonUser);
              } catch {
                // ignore
              }

              setPendingFallbackAccountMismatch({
                expectedEmail: selectedEmail,
                selectedEmail: loggedInEmail,
                counts: {
                  tags: pending.anonTags.length,
                  books: pending.anonBooks.length,
                  records: pending.anonRecords.length,
                },
              });
              return false;
            }
          } catch (err) {
            // ログイン切り替え失敗時に`user=null`へ落ちることがあるため、匿名ユーザーへ復帰させる（ベストエフォート）
            try {
              await updateCurrentUser(auth, pending.anonUser);
              setUser(pending.anonUser);
            } catch {
              // ignore
            }

            const code = getErrorCode(err);
            setError(
              code
                ? `Googleログインに失敗しました（${code}）。もう一度お試しください。`
                : "Googleログインに失敗しました。もう一度お試しください。"
            );
            return false;
          }

          // 6) ゲスト（anon）アカウントとデータの削除
          // anon権限で削除する必要があるため、一時的にanonへ戻して削除→最後にGoogleへ戻す。
          let cleanupSucceeded = true;
          try {
            await updateCurrentUser(auth, pending.anonUser);
            setUser(pending.anonUser);

            try {
              await deleteCollectionDocs(
                db,
                "users",
                pending.anonUid,
                "records"
              );
              await deleteCollectionDocs(db, "users", pending.anonUid, "books");
              await deleteCollectionDocs(db, "users", pending.anonUid, "tags");
              try {
                await deleteDoc(firestoreDoc(db, "users", pending.anonUid));
              } catch {
                // ignore
              }
            } catch {
              cleanupSucceeded = false;
            }

            try {
              const currentPrimary = auth.currentUser;
              if (currentPrimary && currentPrimary.uid === pending.anonUid) {
                await deleteUser(currentPrimary);
              } else {
                cleanupSucceeded = false;
              }
            } catch {
              cleanupSucceeded = false;
            }
          } catch {
            cleanupSucceeded = false;
          }

          // 7) 最後にGoogleログイン状態へ戻す（ここで書斎にログイン済みで戻る）
          try {
            if (googleCredential) {
              await signInWithCredential(auth, googleCredential);
            } else {
              await signInWithPopup(auth, provider);
            }
            setUser(auth.currentUser);

            const finalUid = auth.currentUser?.uid ?? "";
            if (nextUid && finalUid && nextUid !== finalUid) {
              setError(
                "ログイン状態の切り替えに失敗しました（統合先と異なるアカウントでログインしています）。一度ログアウトして、統合先のGoogleアカウントでログインしてください。"
              );
              return false;
            }
          } catch (err) {
            const code = getErrorCode(err);
            setError(
              code
                ? `Googleログインに失敗しました（${code}）。もう一度お試しください。`
                : "Googleログインに失敗しました。もう一度お試しください。"
            );
            return false;
          }

          // 完了したので pending を消してダイアログ/状態を閉じる
          pendingFallbackDataRef.current = null;
          setPendingFallbackMigration(null);

          if (copiedCount > 0) {
            toast.success("ゲストデータをログインアカウントへ移行しました");
          }
          if (!cleanupSucceeded) {
            toast.message(
              "ゲストアカウントの削除に一部失敗しました（データは移行済みです）"
            );
          }

          return true;
        } catch (migrationErr) {
          toast.dismiss(migratingToastId);
          toast.error("データ移行に失敗しました");
          setError(
            migrationErr instanceof Error
              ? migrationErr.message
              : "データ移行に失敗しました"
          );
          return false;
        } finally {
          setFallbackMigrationInProgress(false);
          fallbackMigrationRunningRef.current = false;
        }
      },
      confirmFallbackAccountMismatchProceed: async () => {
        const pending = pendingFallbackDataRef.current;
        const stored = fallbackSecondaryRef.current;
        if (!pending || !stored) return false;

        if (fallbackMigrationRunningRef.current) return false;
        fallbackMigrationRunningRef.current = true;
        setFallbackMigrationInProgress(true);

        setError(null);

        const migratingToastId = toast.message(
          "ゲストデータを移行しています…",
          { duration: Infinity }
        );

        const { secondary, nextUid, googleCredential, selectedEmail } = stored;
        const copiedCount =
          pending.anonTags.length +
          pending.anonBooks.length +
          pending.anonRecords.length;

        try {
          // 3) tags -> books -> records の順で「追加のみ」コピー（secondaryの認証で実行）
          await writeUserSubcollectionDocsMerge(
            secondary.db,
            nextUid,
            "tags",
            pending.anonTags
          );
          await writeUserSubcollectionDocsMerge(
            secondary.db,
            nextUid,
            "books",
            pending.anonBooks
          );
          await writeUserSubcollectionDocsMerge(
            secondary.db,
            nextUid,
            "records",
            pending.anonRecords
          );

          // 以降は通常のフォールバック移行と同じ（ログイン切替→削除→ログイン復帰）
          const auth = getFirebaseAuth();
          const provider = getGoogleProvider();
          const db = getFirestoreDb();

          // 5) primary を Googleログインへ切り替える
          try {
            if (googleCredential) {
              await signInWithCredential(auth, googleCredential);
            } else {
              await signInWithPopup(auth, provider);
            }
            setUser(auth.currentUser);

            const loggedInUid = auth.currentUser?.uid ?? "";
            if (nextUid && loggedInUid && nextUid !== loggedInUid) {
              try {
                await updateCurrentUser(auth, pending.anonUser);
                setUser(pending.anonUser);
              } catch {
                // ignore
              }
              setError(
                "ログインしたアカウントが統合先と一致しませんでした。統合先と同じGoogleアカウントでログインして、もう一度お試しください。"
              );
              toast.dismiss(migratingToastId);
              return false;
            }

            const loggedInEmail = (auth.currentUser?.email ?? "").trim();
            if (
              selectedEmail &&
              loggedInEmail &&
              selectedEmail !== loggedInEmail
            ) {
              try {
                await updateCurrentUser(auth, pending.anonUser);
                setUser(pending.anonUser);
              } catch {
                // ignore
              }
              setError(
                "ログインしたアカウントが移行先と異なります。移行先と同じアカウントでログインしてください。"
              );
              toast.dismiss(migratingToastId);
              return false;
            }
          } catch (err) {
            // `user=null`へ落ちることがあるため、匿名ユーザーへ復帰させる（ベストエフォート）
            try {
              await updateCurrentUser(auth, pending.anonUser);
              setUser(pending.anonUser);
            } catch {
              // ignore
            }

            const code = getErrorCode(err);
            setError(
              code
                ? `Googleログインに失敗しました（${code}）。もう一度お試しください。`
                : "Googleログインに失敗しました。もう一度お試しください。"
            );
            toast.dismiss(migratingToastId);
            return false;
          }

          // 6) ゲスト（anon）アカウントとデータの削除
          let cleanupSucceeded = true;
          try {
            await updateCurrentUser(auth, pending.anonUser);
            setUser(pending.anonUser);

            try {
              for (const subcollection of ACCOUNT_DELETION_SUBCOLLECTIONS) {
                await deleteCollectionDocs(
                  db,
                  "users",
                  pending.anonUid,
                  subcollection
                );
              }
              try {
                await deleteDoc(firestoreDoc(db, "users", pending.anonUid));
              } catch {
                // ignore
              }
            } catch {
              cleanupSucceeded = false;
            }

            try {
              const currentPrimary = auth.currentUser;
              if (currentPrimary && currentPrimary.uid === pending.anonUid) {
                await deleteUser(currentPrimary);
              } else {
                cleanupSucceeded = false;
              }
            } catch {
              cleanupSucceeded = false;
            }
          } catch {
            cleanupSucceeded = false;
          }

          // 7) 最後にGoogleログイン状態へ戻す
          try {
            if (googleCredential) {
              await signInWithCredential(auth, googleCredential);
            } else {
              await signInWithPopup(auth, provider);
            }
            setUser(auth.currentUser);

            const finalUid = auth.currentUser?.uid ?? "";
            if (nextUid && finalUid && nextUid !== finalUid) {
              setError(
                "ログイン状態の切り替えに失敗しました（統合先と異なるアカウントでログインしています）。一度ログアウトして、統合先のGoogleアカウントでログインしてください。"
              );
              toast.dismiss(migratingToastId);
              return false;
            }
          } catch (err) {
            const code = getErrorCode(err);
            setError(
              code
                ? `Googleログインに失敗しました（${code}）。もう一度お試しください。`
                : "Googleログインに失敗しました。もう一度お試しください。"
            );
            toast.dismiss(migratingToastId);
            return false;
          }

          // 完了したので pending / mismatch / secondary を消して状態を閉じる
          pendingFallbackDataRef.current = null;
          setPendingFallbackMigration(null);
          setPendingFallbackAccountMismatch(null);
          fallbackSecondaryRef.current = null;
          try {
            await deleteApp(secondary.app);
          } catch {
            // ignore
          }

          toast.dismiss(migratingToastId);
          if (copiedCount > 0) {
            toast.success("ゲストデータをログインアカウントへ移行しました");
          }
          if (!cleanupSucceeded) {
            toast.message(
              "ゲストアカウントの削除に一部失敗しました（データは移行済みです）"
            );
          }

          return true;
        } catch (err) {
          toast.dismiss(migratingToastId);
          toast.error("データ移行に失敗しました");
          setError(
            err instanceof Error ? err.message : "データ移行に失敗しました"
          );
          return false;
        } finally {
          setFallbackMigrationInProgress(false);
          fallbackMigrationRunningRef.current = false;
        }
      },
      cancelFallbackAccountMismatch: () => {
        setPendingFallbackAccountMismatch(null);
        const stored = fallbackSecondaryRef.current;
        fallbackSecondaryRef.current = null;
        if (stored) {
          void (async () => {
            try {
              await deleteApp(stored.secondary.app);
            } catch {
              // ignore
            }
          })();
        }
        // pendingFallbackMigration は残す（再試行できるようにする）
      },
      cancelFallbackMigration: () => {
        setPendingFallbackAccountMismatch(null);
        const stored = fallbackSecondaryRef.current;
        fallbackSecondaryRef.current = null;
        if (stored) {
          void (async () => {
            try {
              await deleteApp(stored.secondary.app);
            } catch {
              // ignore
            }
          })();
        }
        pendingFallbackDataRef.current = null;
        setPendingFallbackMigration(null);
        setError("統合をキャンセルしました。ゲストのまま利用できます。");
      },
      signOut: async () => {
        setError(null);
        try {
          const auth = getFirebaseAuth();
          await firebaseSignOut(auth);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "ログアウトに失敗しました"
          );
        }
      },

      deleteAccount: async () => {
        setError(null);

        try {
          const auth = getFirebaseAuth();
          const currentUser = auth.currentUser;
          if (!currentUser) {
            throw new Error("ログイン状態が確認できませんでした");
          }

          const uid = currentUser.uid;
          const db = getFirestoreDb();

          // Delete Firestore user data first (so permissions still allow access).
          await deleteFirestoreUserDataForAccountDeletion({
            deleteSubcollection: async (subcollection) => {
              await deleteCollectionDocs(db, "users", uid, subcollection);
            },
            deleteUserDoc: async () => {
              await deleteDoc(firestoreDoc(db, "users", uid));
            },
          });

          await deleteUser(currentUser);
          cleanupLocalStorageForUid(uid, {
            guestCreateNotice: true,
            timerState: true,
          });
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "アカウント削除に失敗しました"
          );
          throw err;
        }
      },
    };
  }, [
    user,
    loading,
    error,
    fallbackMigrationInProgress,
    pendingFallbackAccountMismatch,
    pendingFallbackMigration,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
