import { useAuth } from "./AuthContext";
import { SignInScreen } from "./components/SignInScreen";

const REDIRECT_FLAG_KEY = "yomzoy_redirect_in_progress";

function isRedirectInProgress(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.localStorage.getItem(REDIRECT_FLAG_KEY) === "1"
    );
  } catch {
    return false;
  }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, error, signInWithGoogle, signInAnonymously } =
    useAuth();
  const redirecting = !user && isRedirectInProgress();

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">読み込み中…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <SignInScreen
        onSignInWithGoogle={() => {
          void signInWithGoogle();
        }}
        onSignInAnonymously={() => {
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
