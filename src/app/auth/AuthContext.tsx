import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "../firebase/firebase";

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

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const auth = getFirebaseAuth();

      // signInWithRedirect の結果を拾ってエラー表示できるようにする
      void (async () => {
        try {
          await getRedirectResult(auth);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Googleログインに失敗しました"
          );
        }
      })();

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
      signInWithGoogle: async () => {
        setError(null);
        try {
          const auth = getFirebaseAuth();
          const provider = getGoogleProvider();

          // モバイル（特にiOS）ではpopupが不安定なためredirectを優先
          if (isLikelyMobile()) {
            await signInWithRedirect(auth, provider);
            return;
          }

          await signInWithPopup(auth, provider);
        } catch (err) {
          const code = getErrorCode(err);

          // popup環境依存エラーはredirectでフォールバック
          if (
            code === "auth/popup-blocked" ||
            code === "auth/popup-closed-by-user" ||
            code === "auth/web-storage-unsupported" ||
            isMissingInitialStateError(err)
          ) {
            try {
              const auth = getFirebaseAuth();
              const provider = getGoogleProvider();
              await signInWithRedirect(auth, provider);
              return;
            } catch (redirectErr) {
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
