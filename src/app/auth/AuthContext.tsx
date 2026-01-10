import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  browserLocalPersistence,
  deleteUser,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  type Auth,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  linkWithPopup,
  linkWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  collection,
  getDocs,
  writeBatch,
  doc as firestoreDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  getFirebaseAuth,
  getFirestoreDb,
  getGoogleProvider,
} from "../firebase/firebase";

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

function getErrorCode(err: unknown): string | undefined {
  const maybe = err as { code?: unknown };
  return typeof maybe?.code === "string" ? maybe.code : undefined;
}

function isMissingInitialStateError(err: unknown): boolean {
  return err instanceof Error && /missing initial state/i.test(err.message);
}

const REDIRECT_FLAG_KEY = "yomzoy_redirect_in_progress";

function setRedirectFlag(value: boolean) {
  try {
    if (typeof window === "undefined") return;
    if (value) {
      window.localStorage.setItem(REDIRECT_FLAG_KEY, "1");
    } else {
      window.localStorage.removeItem(REDIRECT_FLAG_KEY);
    }
  } catch {
    // ignore (storage may be unavailable)
  }
}

function getRedirectFlag(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.localStorage.getItem(REDIRECT_FLAG_KEY) === "1"
    );
  } catch {
    return false;
  }
}

async function startRedirect(auth: Auth) {
  const provider = getGoogleProvider();
  setRedirectFlag(true);
  await signInWithRedirect(auth, provider);
}

async function startLinkRedirect(auth: Auth, user: User) {
  const provider = getGoogleProvider();
  setRedirectFlag(true);
  await linkWithRedirect(user, provider);
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInAnonymously: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export type MockAuthProviderProps = {
  children: ReactNode;
  user?: User | null;
  loading?: boolean;
  error?: string | null;
  signInAnonymously?: () => Promise<void>;
  signInWithGoogle?: () => Promise<void>;
  signOut?: () => Promise<void>;
  deleteAccount?: () => Promise<void>;
};

// Storybook 等で Firebase を初期化せずに useAuth を動かすための Provider。
export function MockAuthProvider({
  children,
  user = null,
  loading = false,
  error = null,
  signInAnonymously,
  signInWithGoogle,
  signOut,
  deleteAccount,
}: MockAuthProviderProps) {
  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      loading,
      error,
      signInAnonymously: signInAnonymously ?? (async () => {}),
      signInWithGoogle: signInWithGoogle ?? (async () => {}),
      signOut: signOut ?? (async () => {}),
      deleteAccount: deleteAccount ?? (async () => {}),
    };
  }, [
    deleteAccount,
    error,
    loading,
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

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      loading,
      error,
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
        try {
          const auth = getFirebaseAuth();
          const provider = getGoogleProvider();

          const currentUser = auth.currentUser;
          if (currentUser?.isAnonymous) {
            try {
              // Prefer linking so uid stays the same.
              await linkWithPopup(currentUser, provider);
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
                setError(
                  "統合できませんでした。ゲストのまま利用できます。\n\n（必要なら、別のGoogleアカウントでお試しください）"
                );
                return;
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
          await deleteCollectionDocs(db, "users", uid, "records");
          await deleteCollectionDocs(db, "users", uid, "books");

          // Optional: delete user document (may not exist).
          try {
            await deleteDoc(firestoreDoc(db, "users", uid));
          } catch {
            // ignore
          }

          await deleteUser(currentUser);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "アカウント削除に失敗しました"
          );
          throw err;
        }
      },
    };
  }, [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
