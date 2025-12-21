import { Button } from "../components/ui/button";
import { useAuth } from "./AuthContext";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, error, signInWithGoogle } = useAuth();

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

          <Button
            onClick={() => {
              void signInWithGoogle();
            }}
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
