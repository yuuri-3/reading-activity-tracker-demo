import { GoogleSignInButton } from "./GoogleSignInButton";
import { IconInfo } from "../../components/icons/IconInfo";
import logoPngUrl from "../../assets/logo.png";

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
    <div className="min-h-dvh w-full bg-gradient-to-b from-[#e8edf2] to-[#dde3ea] overflow-y-auto">
      <div className="w-full max-w-[393px] px-6 pt-[104px] pb-16 mx-auto flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-[80px]">
          <div className="flex flex-col items-center gap-8">
            <img
              src={logoPngUrl}
              alt="Yomzoy"
              className="block w-[11.625rem] h-auto aspect-[186/141]"
            />
            <p className="pl-3 text-[16px] leading-none text-[#5a6372] text-center">
              読む時間を、残していく。
            </p>
          </div>

          <div className="w-full flex flex-col items-center gap-8">
            <GoogleSignInButton
              onClick={onSignInWithGoogle}
              disabled={disabled}
            />

            <div className="w-full flex items-center gap-4">
              <div className="h-px flex-1 bg-[#b7c7da]" />
              <p className="text-[12px] leading-[18px] text-[#5a6372] text-center">
                もしくは
              </p>
              <div className="h-px flex-1 bg-[#b7c7da]" />
            </div>

            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={onSignInAnonymously}
                disabled={disabled}
                className="bg-[rgba(242,242,242,0.7)] rounded-[40px] px-6 py-3 text-[14px] font-medium leading-[1.3] text-[#5a6372] text-center disabled:opacity-50 disabled:pointer-events-none"
              >
                ログインせず利用する
              </button>

              <div className="flex flex-col items-center gap-1">
                <IconInfo size={5} color="#7a8a9d" />
                <p className="text-[11px] leading-[1.5] text-[#7a8a9d] text-center whitespace-pre-line">
                  {
                    "ログインせずに利用している間は、\n機種変更時などに保存データが消失します。"
                  }
                </p>
              </div>
            </div>

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
