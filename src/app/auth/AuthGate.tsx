import { useEffect } from "react";
import { useAuth } from "./AuthContext";
import { SignInScreen } from "./components/SignInScreen";

const REDIRECT_FLAG_KEY = "yomzoy_redirect_in_progress";
const AUTH_CALLBACK_PATH = "/auth/callback";

function joinWithBase(pathname: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = pathname === "/" ? "" : pathname;
  return `${normalizedBase}${normalizedPath}` || "/";
}

function stripBase(pathname: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;

  if (!normalizedBase || normalizedBase === "/") return pathname;
  return pathname.startsWith(normalizedBase)
    ? pathname.slice(normalizedBase.length) || "/"
    : pathname;
}

function isAuthCallbackPath(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return stripBase(window.location.pathname) === AUTH_CALLBACK_PATH;
  } catch {
    return false;
  }
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

function isRedirectInProgress(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(REDIRECT_FLAG_KEY) === "1"
    );
  } catch {
    return false;
  }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const {
    user,
    loading,
    error,
    fallbackMigrationInProgress,
    signInWithGoogle,
    signInAnonymously,
  } = useAuth();
  const redirecting = !user && isRedirectInProgress();

  // auth callback に戻ってきたら、ログイン完了後は必ず計測画面（/）へ
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!isAuthCallbackPath()) return;
    replacePathname("/");
  }, [loading, user]);

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">読み込み中…</div>
      </div>
    );
  }

  if (fallbackMigrationInProgress) {
    return (
      <div className="size-full flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground text-center whitespace-pre-line">
          {"データを移行しています…\n画面が戻るまでお待ちください…"}
        </div>
      </div>
    );
  }

  if (!user) {
    // redirect から戻った直後などは、callback パスではサインイン画面を見せず待機
    if (isAuthCallbackPath() && (redirecting || !error)) {
      return (
        <div className="size-full flex items-center justify-center p-6">
          <div className="text-sm text-muted-foreground text-center whitespace-pre-line">
            {"ログイン処理中です。\n画面が戻るまでお待ちください…"}
          </div>
        </div>
      );
    }

    return (
      <SignInScreen
        onSignInWithGoogle={() => {
          // redirect/popup どちらでも戻り先が一定になるよう callback へ寄せる
          replacePathname(AUTH_CALLBACK_PATH);
          void signInWithGoogle();
        }}
        onSignInAnonymously={() => {
          replacePathname(AUTH_CALLBACK_PATH);
          void signInAnonymously();
        }}
        disabled={redirecting}
        error={error}
        redirecting={redirecting}
      />
    );
  }

  return <>{children}</>;
}
