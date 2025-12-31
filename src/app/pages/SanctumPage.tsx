import { Header } from "../components/Header";
import { IconDelete } from "../components/icons/IconDelete";
import { IconLamp } from "../components/icons/IconLamp";
import { IconLogout } from "../components/icons/IconLogout";
import { IconSparkle } from "../components/icons/IconSparkle";
import { LogoYomzoy } from "../components/icons/LogoYomzoy";

export function SanctumPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0">
        <div className="max-w-2xl mx-auto">
          <Header
            variant="simple"
            pageTitle="書斎"
            icon={<IconLamp size={28} />}
            action={
              <div className="h-9 w-[97px] overflow-hidden">
                <LogoYomzoy className="h-full w-full" />
              </div>
            }
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 pt-5 pb-28">
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-4">
              <p className="text-sm leading-5 text-muted-foreground">
                アカウント
              </p>

              <div className="rounded-[12px] p-4 bg-[var(--background-solid)] [box-shadow:var(--shadow-neumorphism-sm)]">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base">
                      S
                    </div>
                    <p className="text-base leading-6 text-foreground">
                      sample@gmail.com
                    </p>
                  </div>

                  <div className="h-px w-full bg-border" />

                  <button
                    type="button"
                    className="mx-auto flex items-center gap-1.5 px-2 py-1 text-sm text-foreground"
                  >
                    <IconLogout size={24} />
                    ログアウト
                  </button>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <IconSparkle size={24} />
                <p className="text-sm leading-5">Coming soon</p>
              </div>

              <div className="rounded-[12px] px-4 pt-4 pb-5 bg-[var(--background-solid)] [box-shadow:var(--shadow-neumorphism-sm)]">
                <ul className="list-disc pl-5 text-sm leading-6 text-foreground">
                  <li>タグ管理画面</li>
                  <li>書籍の並び順を手動で変更可能に</li>
                  <li>メモの内容をランダムで通知</li>
                  <li>手書きメモを自動読み取り</li>
                </ul>
              </div>
            </section>

            <button
              type="button"
              className="flex items-center gap-1.5 py-3 text-sm text-destructive"
            >
              <IconDelete size={24} />
              アカウントを削除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
