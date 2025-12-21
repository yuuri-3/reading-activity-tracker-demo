import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "../firebase/firebase";

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
          await signInWithPopup(auth, provider);
        } catch (err) {
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
