import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "./auth/AuthGate";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/AuthContext";
import { AppProvider } from "./context/AppContext";
import { useApp } from "./context/AppContext";
import {
  GuestCreateNoticeProvider,
  useGuestCreateNotice,
} from "./context/GuestCreateNoticeContext";
import { SearchProvider } from "./context/SearchContext";
import { TimerProvider } from "./timer/TimerContext";
import { TimerPage } from "./pages/TimerPage";
import { BookCollectionView } from "./pages/BookCollectionView";
import { RecordSingleView } from "./pages/RecordSingleView";
import { SanctumPage } from "./pages/SanctumPage";
import { TagManagementPage } from "./pages/TagManagementPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TabBar, type Page } from "./components/TabBar";
import { Dialog } from "./components/Dialog";
import { Toast } from "./components/Toast";
import { joinWithBase } from "./utils/navigation";
import { useVisualViewportHeight } from "./utils/useVisualViewportHeight";
import { isOcrHandwrittenMemoEnabled } from "./ocr/env";
import { OcrHandwrittenMemoRootPage } from "./ocr/OcrHandwrittenMemoRootPage";
import {
  parseRouteFromPathname,
  toPathname,
  type RecordsSubPage,
  type RouteState,
  type SanctumSubPage,
} from "./utils/router";

function AppContent() {
  const { user } = useAuth();
  const { migrationIssues } = useApp();
  const {
    guestCreateNoticeOpen,
    closeGuestCreateNotice,
    dismissGuestCreateNotice,
  } = useGuestCreateNotice();

  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  const isMigrationBlocked = migrationIssues.length > 0;

  const initialRoute = useMemo<RouteState>(() => {
    if (typeof window === "undefined") {
      return {
        page: "home" as Page,
        recordsSubPage: null,
        sanctumSubPage: null,
        ocrActive: false,
      };
    }

    return parseRouteFromPathname(window.location.pathname, {
      ocrEnabled: isOcrHandwrittenMemoEnabled(),
    });
  }, []);

  const [currentPage, setCurrentPage] = useState<Page>(initialRoute.page);
  const [recordsSubPage, setRecordsSubPage] = useState<RecordsSubPage>(
    initialRoute.recordsSubPage,
  );

  const [sanctumSubPage, setSanctumSubPage] = useState<SanctumSubPage>(
    initialRoute.sanctumSubPage,
  );

  const [ocrActive, setOcrActive] = useState<boolean>(initialRoute.ocrActive);
  const visualViewportHeight = useVisualViewportHeight();
  const [focusedTextInput, setFocusedTextInput] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const isTextInput = (element: Element | null) => {
      if (element instanceof HTMLTextAreaElement) return true;
      if (element instanceof HTMLElement && element.isContentEditable) {
        return true;
      }
      if (!(element instanceof HTMLInputElement)) return false;

      return ![
        "button",
        "checkbox",
        "color",
        "file",
        "hidden",
        "image",
        "radio",
        "range",
        "reset",
        "submit",
      ].includes(element.type);
    };

    const onFocusIn = (event: FocusEvent) => {
      setFocusedTextInput(isTextInput(event.target as Element | null));
    };
    const onFocusOut = () => {
      // focusin for the next field can follow focusout, so read the active
      // element on the next frame instead of hiding the bar between fields.
      window.requestAnimationFrame(() => {
        setFocusedTextInput(isTextInput(document.activeElement));
      });
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const isKeyboardInputMode =
    focusedTextInput &&
    visualViewportHeight > 0 &&
    typeof window !== "undefined" &&
    visualViewportHeight < window.innerHeight - 100;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextPathname = joinWithBase(
      toPathname({
        page: currentPage,
        recordsSubPage,
        sanctumSubPage,
        ocrActive,
      }),
    );
    if (window.location.pathname !== nextPathname) {
      window.history.pushState(
        null,
        "",
        `${nextPathname}${window.location.search}`,
      );
    }
  }, [currentPage, recordsSubPage, sanctumSubPage, ocrActive]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      const { page, recordsSubPage, sanctumSubPage, ocrActive } =
        parseRouteFromPathname(window.location.pathname, {
          ocrEnabled: isOcrHandwrittenMemoEnabled(),
        });
      setCurrentPage(page);
      setRecordsSubPage(recordsSubPage);
      setSanctumSubPage(sanctumSubPage);
      setOcrActive(ocrActive);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const handleChangePage = (next: Page) => {
    setCurrentPage(next);
    setRecordsSubPage(null);
    setSanctumSubPage(null);
    setOcrActive(false);
  };

  const handleChangeRecordsSubPage = (next: RecordsSubPage) => {
    setCurrentPage("records");
    setRecordsSubPage(next);
    setSanctumSubPage(null);
    setOcrActive(false);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col">
      {/* Main Content */}
      <main className="flex-1 w-full pb-24">
        <div className="w-full">
          {isMigrationBlocked ? (
            <div className="max-w-2xl mx-auto px-6 pt-8 pb-28">
              <div className="rounded-xl border border-[#f2c94c] bg-[#fff8dd] px-5 py-4 text-foreground">
                <p className="text-[14px] font-semibold leading-6">
                  データ移行が完了していないため、アプリを停止しています
                </p>
                <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                  Timestamp化/書籍メモのサブコレ移行（TK-011）の漏れが検出されました（
                  {migrationIssues.length}
                  件）。旧形式のフォールバックは行わず、新形式のみを正として扱います。
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-foreground px-3 py-2 text-[13px] font-medium text-background"
                    onClick={() => setMigrationDialogOpen(true)}
                  >
                    詳細を見る
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-[13px] font-medium text-foreground"
                    onClick={() => {
                      const lines = migrationIssues.map(
                        (i) => `${i.kind}\t${i.refPath}\t${i.reason}`,
                      );
                      const text = lines.join("\n");
                      try {
                        void navigator.clipboard?.writeText(text);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    一覧をコピー
                  </button>
                </div>

                <div className="mt-5 rounded-lg border border-foreground/10 bg-background/70 px-4 py-3">
                  <p className="text-[13px] font-medium leading-5">
                    対応の目安
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-[13px] leading-5 text-muted-foreground">
                    <li>バックフィル（Admin SDK）を再実行し、失敗0件を確認</li>
                    <li>
                      失敗が残る場合は、対象ドキュメントの値を修正して再実行
                    </li>
                    <li>0件になったら、この画面は自動的に解除されます</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : ocrActive ? (
            <OcrHandwrittenMemoRootPage
              onExit={() => {
                setOcrActive(false);
                handleChangePage("home");
              }}
            />
          ) : (
            <>
              {currentPage === "home" ? (
                <TimerPage
                  showOcrEntry={isOcrHandwrittenMemoEnabled()}
                  onOpenOcr={() => {
                    setOcrActive(true);
                  }}
                />
              ) : null}
              {currentPage === "books" && <BookCollectionView />}
              {currentPage === "records" && (
                <RecordSingleView
                  subPage={recordsSubPage}
                  onSubPageChange={handleChangeRecordsSubPage}
                />
              )}
              {currentPage === "sanctum" &&
                (sanctumSubPage === "tags" ? (
                  <TagManagementPage />
                ) : sanctumSubPage === "privacy" ? (
                  <PrivacyPolicyPage />
                ) : (
                  <SanctumPage />
                ))}
            </>
          )}
        </div>
      </main>

      {/* Bottom Navigation - iOS Floating Style */}
      <nav className="fixed bottom-0 left-0 right-0 pointer-events-none">
        {ocrActive || isMigrationBlocked || isKeyboardInputMode ? null : (
          <div className="max-w-2xl mx-auto px-4 pb-4">
            <div className="pointer-events-auto -translate-y-6 max-w-[345px] mx-auto">
              <TabBar currentPage={currentPage} onChange={handleChangePage} />
            </div>
          </div>
        )}
      </nav>

      <Dialog
        open={migrationDialogOpen}
        onOpenChange={setMigrationDialogOpen}
        title="データ移行の未完了（要確認）"
        description="Timestamp化やmemosサブコレ移行が完了していないデータが検出されました。種類/IDを確認し、バックフィルや修正を行ってください。"
        formPatternType="AddRecord"
        cancelLabel="閉じる"
        confirmLabel="コピー"
        onCancel={() => setMigrationDialogOpen(false)}
        onConfirm={() => {
          const lines = migrationIssues.map((i) => `${i.kind}\t${i.refPath}`);
          const text = lines.join("\n");
          try {
            void navigator.clipboard?.writeText(text);
          } catch {
            // ignore
          }
        }}
      >
        <div className="flex flex-col gap-2 text-sm leading-6 text-foreground">
          <ul className="list-disc pl-5">
            {migrationIssues.slice(0, 50).map((i) => (
              <li key={`${i.kind}:${i.refPath}`}>
                <span className="font-medium">{i.kind}</span> — {i.refPath}
              </li>
            ))}
          </ul>
          {migrationIssues.length > 50 ? (
            <p className="text-muted-foreground">
              ※表示は先頭50件のみ（全{migrationIssues.length}件）
            </p>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={
          guestCreateNoticeOpen && !!user?.isAnonymous && !isMigrationBlocked
        }
        onOpenChange={(open) => {
          if (open) return;
          closeGuestCreateNotice();
        }}
        title="ログインしてデータを守りませんか？"
        description={
          "ゲストのままだと、端末変更やアプリ削除でデータが消える可能性があります。ログインすると別端末でも使えます。"
        }
        formPatternType="AddRecord"
        cancelLabel="表示しない"
        confirmLabel="書斎でログイン"
        onCancel={dismissGuestCreateNotice}
        onConfirm={() => {
          closeGuestCreateNotice();
          handleChangePage("sanctum");
        }}
      >
        <div className="flex flex-col gap-2 text-sm leading-6 text-foreground">
          <p>
            ゲスト利用はこの端末のみに保存されるため、端末を変えると引き継げません。
          </p>
          <p className="text-muted-foreground">
            ※書斎ページの「Googleアカウントに連携する」からログインできます。
          </p>
        </div>
      </Dialog>

      <Toast />
    </div>
  );
}

function AppProviders() {
  const { user } = useAuth();

  return (
    <GuestCreateNoticeProvider user={user}>
      <SearchProvider>
        <TimerProvider {...(user?.uid ? { uid: user.uid } : {})}>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </TimerProvider>
      </SearchProvider>
    </GuestCreateNoticeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppProviders />
      </AuthGate>
    </AuthProvider>
  );
}
