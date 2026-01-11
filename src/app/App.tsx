import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "./auth/AuthGate";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/AuthContext";
import { AppProvider } from "./context/AppContext";
import { useApp } from "./context/AppContext";
import { TimerPage } from "./pages/TimerPage";
import { BookCollectionView } from "./pages/BookCollectionView";
import { RecordSingleView } from "./pages/RecordSingleView";
import { SanctumPage } from "./pages/SanctumPage";
import { TagManagementPage } from "./pages/TagManagementPage";
import { TabBar, type Page } from "./components/TabBar";
import { Dialog } from "./components/Dialog";
import { Toast } from "./components/Toast";
import { joinWithBase, stripBase } from "./utils/navigation";
import { isOcrHandwrittenMemoEnabled } from "./ocr/env";
import { OcrHandwrittenMemoRootPage } from "./ocr/OcrHandwrittenMemoRootPage";

type RecordsSubPage = "add" | null;
type SanctumSubPage = "tags" | null;

type RouteState = {
  page: Page;
  recordsSubPage: RecordsSubPage;
  sanctumSubPage: SanctumSubPage;
  ocrActive: boolean;
};

function parseRouteFromPath(pathname: string) {
  const path = stripBase(pathname).replace(/^\/+/, "").trim();
  if (!path)
    return {
      page: "home" as Page,
      recordsSubPage: null,
      sanctumSubPage: null,
      ocrActive: false,
    } satisfies RouteState;

  const [pageRaw, subRaw] = path.split("/");

  if (isOcrHandwrittenMemoEnabled() && pageRaw === "ocr") {
    return {
      page: "home" as Page,
      recordsSubPage: null,
      sanctumSubPage: null,
      ocrActive: true,
    } satisfies RouteState;
  }

  const page: Page =
    pageRaw === "home" ||
    pageRaw === "books" ||
    pageRaw === "records" ||
    pageRaw === "sanctum"
      ? (pageRaw as Page)
      : "home";

  const recordsSubPage: RecordsSubPage =
    page === "records" && subRaw === "add" ? "add" : null;

  const sanctumSubPage: SanctumSubPage =
    page === "sanctum" && subRaw === "tags" ? "tags" : null;

  return {
    page,
    recordsSubPage,
    sanctumSubPage,
    ocrActive: false,
  } satisfies RouteState;
}

function toPathname(
  page: Page,
  recordsSubPage: RecordsSubPage,
  sanctumSubPage: SanctumSubPage,
  ocrActive: boolean
) {
  if (ocrActive) return "/ocr";
  if (page === "home") return "/";
  if (page === "records" && recordsSubPage) return `/records/${recordsSubPage}`;
  if (page === "sanctum" && sanctumSubPage) return `/sanctum/${sanctumSubPage}`;
  return `/${page}`;
}

function AppContent() {
  const { user } = useAuth();
  const {
    guestCreateNoticeOpen,
    closeGuestCreateNotice,
    dismissGuestCreateNotice,
  } = useApp();

  const initialRoute = useMemo<RouteState>(() => {
    if (typeof window === "undefined") {
      return {
        page: "home" as Page,
        recordsSubPage: null,
        sanctumSubPage: null,
        ocrActive: false,
      };
    }

    return parseRouteFromPath(window.location.pathname);
  }, []);

  const [currentPage, setCurrentPage] = useState<Page>(initialRoute.page);
  const [recordsSubPage, setRecordsSubPage] = useState<RecordsSubPage>(
    initialRoute.recordsSubPage
  );

  const [sanctumSubPage, setSanctumSubPage] = useState<SanctumSubPage>(
    initialRoute.sanctumSubPage
  );

  const [ocrActive, setOcrActive] = useState<boolean>(initialRoute.ocrActive);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextPathname = joinWithBase(
      toPathname(currentPage, recordsSubPage, sanctumSubPage, ocrActive)
    );
    if (window.location.pathname !== nextPathname) {
      window.history.pushState(
        null,
        "",
        `${nextPathname}${window.location.search}`
      );
    }
  }, [currentPage, recordsSubPage, sanctumSubPage, ocrActive]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      const { page, recordsSubPage, sanctumSubPage, ocrActive } =
        parseRouteFromPath(window.location.pathname);
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
          {ocrActive ? (
            <OcrHandwrittenMemoRootPage
              onExit={() => {
                setOcrActive(false);
                handleChangePage("home");
              }}
            />
          ) : (
            <>
              {currentPage === "home" ? <TimerPage /> : null}
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
                ) : (
                  <SanctumPage />
                ))}
            </>
          )}
        </div>
      </main>

      {/* Bottom Navigation - iOS Floating Style */}
      <nav className="fixed bottom-0 left-0 right-0 pointer-events-none">
        {ocrActive ? null : (
          <div className="max-w-2xl mx-auto px-4 pb-4">
            <div className="pointer-events-auto -translate-y-6 max-w-[345px] mx-auto">
              <TabBar currentPage={currentPage} onChange={handleChangePage} />
            </div>
          </div>
        )}
      </nav>

      <Dialog
        open={guestCreateNoticeOpen && !!user?.isAnonymous}
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

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthGate>
    </AuthProvider>
  );
}
