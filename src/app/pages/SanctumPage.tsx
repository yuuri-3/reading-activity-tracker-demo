import { Header } from "../components/Header";
import { Dialog } from "../components/Dialog";
import { IconDelete } from "../components/icons/IconDelete";
import { IconLamp } from "../components/icons/IconLamp";
import { IconLogout } from "../components/icons/IconLogout";
import { IconSparkle } from "../components/icons/IconSparkle";
import { IconTag } from "../components/icons/IconTag";
import { IconForward } from "../components/icons/IconForward";
import { LogoYomzoy } from "../components/icons/LogoYomzoy";
import { useAuth } from "../auth/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { PrimaryButton } from "../components/PrimaryButton";

export function SanctumPage() {
  const { user, signOut, deleteAccount, signInWithGoogle, error } = useAuth();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const isAnonymous = !!user?.isAnonymous;

  const email = user?.email ?? "";
  const displayName = user?.displayName ?? "";
  const photoURL = user?.photoURL ?? "";

  const fallbackInitial = (() => {
    const src = (displayName || email).trim();
    return src ? src[0].toUpperCase() : "?";
  })();

  return (
    <div className="w-full">
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

        <div className="px-6 pt-5 pb-28">
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-4">
              <p className="text-sm leading-5 text-muted-foreground">
                アカウント
              </p>

              <div className="rounded-[12px] p-4 bg-[var(--background-solid)] [box-shadow:var(--shadow-neumorphism-sm)]">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base overflow-hidden">
                      {photoURL ? (
                        <img
                          src={photoURL}
                          alt={displayName || email || "ユーザー"}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        fallbackInitial
                      )}
                    </div>
                    <p className="text-base leading-6 text-foreground">
                      {isAnonymous ? "ゲスト" : email || ""}
                    </p>
                  </div>

                  <div className="h-px w-full bg-border" />

                  {isAnonymous && (
                    <div className="flex flex-col items-center gap-2">
                      <PrimaryButton
                        type="button"
                        onClick={() => setIsLinkDialogOpen(true)}
                        className="w-full"
                        disabled={isLinking}
                      >
                        Google でログイン
                      </PrimaryButton>

                      {error && (
                        <div className="text-sm text-destructive whitespace-pre-wrap text-center">
                          {error}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="mx-auto flex items-center gap-1.5 px-2 py-1 text-sm text-foreground"
                    onClick={() => {
                      void signOut();
                    }}
                  >
                    <IconLogout size={24} />
                    ログアウト
                  </button>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <p className="text-sm leading-5 text-muted-foreground">機能</p>

              <a
                href="#sanctum/tags"
                className="rounded-[12px] px-4 py-4 bg-[var(--background-solid)] [box-shadow:var(--shadow-neumorphism-sm)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconTag size={20} className="text-muted-foreground" />
                    <p className="text-base leading-6 text-foreground">
                      タグ管理
                    </p>
                  </div>

                  <IconForward size={20} className="text-muted-foreground" />
                </div>
              </a>
            </section>

            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <IconSparkle size={24} />
                <p className="text-sm leading-5">Coming soon</p>
              </div>

              <div className="rounded-[12px] px-4 pt-4 pb-5 bg-[var(--background-solid)] [box-shadow:var(--shadow-neumorphism-sm)]">
                <ul className="list-disc pl-5 text-sm leading-6 text-foreground">
                  <li>手書きメモの写真を自動読み取り</li>
                  <li>書籍登録をバーコード読み取りで簡単に</li>
                  <li>書籍の並び順を手動で変更可能に</li>
                  <li>記録検索をタグによって絞り込む</li>
                  <li>メモの内容をランダムで通知</li>
                  <li>読了フラグとSNSでの共有機能</li>
                  <li>合計時間の計測範囲を任意で変更可能に</li>
                </ul>
              </div>
            </section>

            <Dialog
              open={isDeleteDialogOpen}
              onOpenChange={(open) => {
                if (isDeleting) return;
                setIsDeleteDialogOpen(open);
              }}
              title="アカウントを削除"
              description="この操作は取り消せません。書籍・記録などのデータも削除されます。"
              formPatternType="AddRecord"
              cancelLabel="キャンセル"
              confirmLabel={isDeleting ? "削除中…" : "削除する"}
              disableEscapeClose={isDeleting}
              disableOutsideClose={isDeleting}
              onCancel={() => setIsDeleteDialogOpen(false)}
              onConfirm={() => {
                if (isDeleting) return;

                void (async () => {
                  setIsDeleting(true);
                  try {
                    await deleteAccount();
                    toast.success("アカウントを削除しました");
                    setIsDeleteDialogOpen(false);
                  } catch (err) {
                    const code = (err as { code?: unknown })?.code;
                    if (code === "auth/requires-recent-login") {
                      toast.error(
                        "安全のため再ログインが必要です。再ログインしてください。"
                      );
                      try {
                        await signOut();
                      } catch {
                        // ignore
                      }
                      setIsDeleteDialogOpen(false);
                    } else {
                      toast.error("アカウント削除に失敗しました");
                    }
                  } finally {
                    setIsDeleting(false);
                  }
                })();
              }}
              cancelButtonProps={{ disabled: isDeleting }}
              confirmButtonProps={{
                disabled: isDeleting,
                className: "text-destructive",
              }}
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-1.5 py-3 text-sm text-destructive"
                >
                  <IconDelete size={24} />
                  アカウントを削除
                </button>
              }
            >
              <div className="flex flex-col gap-2 text-sm leading-6 text-foreground">
                <p>
                  削除すると、同じアカウントでログインしてもデータを復元できません。
                </p>
                <p className="text-muted-foreground">
                  ※削除に失敗する場合は、いったんログアウト→再ログイン後にお試しください。
                </p>
              </div>
            </Dialog>

            <Dialog
              open={isLinkDialogOpen}
              onOpenChange={(open) => {
                if (isLinking) return;
                setIsLinkDialogOpen(open);
              }}
              title="ゲストデータを統合します"
              description="この端末のゲストデータを、これからログインするアカウントに統合します。"
              cancelLabel="キャンセル"
              confirmLabel={isLinking ? "処理中…" : "続行"}
              disableEscapeClose={isLinking}
              disableOutsideClose={isLinking}
              onCancel={() => setIsLinkDialogOpen(false)}
              onConfirm={() => {
                if (isLinking) return;

                void (async () => {
                  setIsLinking(true);
                  try {
                    setIsLinkDialogOpen(false);
                    await signInWithGoogle();
                  } finally {
                    setIsLinking(false);
                  }
                })();
              }}
              cancelButtonProps={{ disabled: isLinking }}
              confirmButtonProps={{ disabled: isLinking }}
            >
              <div className="text-sm leading-6 text-foreground">
                統合後は同じ端末・同じアカウントでログインすると、ゲスト中に作成した本棚や記録が引き続き表示されます。
              </div>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
