import { GoogleSignInButton } from "./GoogleSignInButton";
import { PrimaryButton } from "../../components/PrimaryButton";

export type SignInScreenProps = {
  onSignInWithGoogle: () => void;
  onSignInAnonymously: () => void;
  disabled?: boolean;
  error?: string | null;
  redirecting?: boolean;
};

export function SignInScreen({
  onSignInWithGoogle,
  onSignInAnonymously,
  disabled = false,
  error,
  redirecting = false,
}: SignInScreenProps) {
  return (
    <div className="size-full flex flex-col items-center justify-center">
      <div className="w-full max-w-[393px] px-6">
        <div className="flex flex-col items-center gap-[80px] pb-[200px]">
          <div className="flex flex-col items-center gap-8">
            <img
              src="/logo-new.svg"
              alt="Yomzoy"
              className="block w-[186px] h-[141px] object-contain"
            />
            <p className="pl-3 text-[16px] leading-none text-foreground text-center">
              読む時間を、残していく。
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <GoogleSignInButton
              onClick={onSignInWithGoogle}
              disabled={disabled}
            />

            <PrimaryButton
              type="button"
              onClick={onSignInAnonymously}
              disabled={disabled}
              className="w-full max-w-[280px]"
            >
              ログインせず利用する
            </PrimaryButton>

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
