import { LogoWithSymbol } from "../../components/icons/LogoWithSymbol";
import { GoogleSignInButton } from "./GoogleSignInButton";

export type SignInScreenProps = {
  onSignInWithGoogle: () => void;
  disabled?: boolean;
  error?: string | null;
  redirecting?: boolean;
};

export function SignInScreen({
  onSignInWithGoogle,
  disabled = false,
  error,
  redirecting = false,
}: SignInScreenProps) {
  return (
    <div className="size-full flex flex-col items-center justify-center">
      <div className="w-full max-w-[393px] px-6">
        <div className="flex flex-col items-center gap-[80px] pb-[200px]">
          <div className="flex flex-col items-center gap-8">
            <LogoWithSymbol />
            <p className="pl-3 text-[16px] leading-none text-foreground text-center">
              読む時間を、残していく。
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <GoogleSignInButton
              onClick={onSignInWithGoogle}
              disabled={disabled}
            />

            {error && (
              <div className="text-sm text-destructive whitespace-pre-wrap text-center">
                {error}
              </div>
            )}

            {redirecting && (
              <div className="text-sm text-muted-foreground text-center">
                ログイン処理中です。画面が戻るまでお待ちください…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
