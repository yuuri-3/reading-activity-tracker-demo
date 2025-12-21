import { Button } from "../components/ui/button";
import { useAuth } from "./AuthContext";

const REDIRECT_FLAG_KEY = "reading_activity_tracker_redirect_in_progress";

function isRedirectInProgress(): boolean {
  try {
    return typeof window !== "undefined" &&
      window.localStorage.getItem(REDIRECT_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, error, signInWithGoogle } = useAuth();
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
      <div className="size-full flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div>
            <h1 className="mb-2">ログイン</h1>
            <p className="text-sm text-muted-foreground">
              続けるにはGoogleでログインしてください
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive whitespace-pre-wrap">
              {error}
            </div>
          )}

          {redirecting && (
            <div className="text-sm text-muted-foreground">
              ログイン処理中です。画面が戻るまでお待ちください…
            </div>
          )}

          <Button
            onClick={() => {
              void signInWithGoogle();
            }}
            disabled={redirecting}
          >
            Googleでログイン
          </Button>

          <p className="text-xs text-muted-foreground">
            ポップアップがブロックされる場合は、ブラウザ設定をご確認ください。
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
