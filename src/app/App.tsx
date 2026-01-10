import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "./auth/AuthGate";
import { AuthProvider } from "./auth/AuthContext";
import { AppProvider } from "./context/AppContext";
import { TimerPage } from "./pages/TimerPage";
import { BookCollectionView } from "./pages/BookCollectionView";
import { RecordSingleView } from "./pages/RecordSingleView";
import { SanctumPage } from "./pages/SanctumPage";
import { TagManagementPage } from "./pages/TagManagementPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TabBar, type Page } from "./components/TabBar";
import { Toast } from "./components/Toast";

type RecordsSubPage = "add" | null;
type SanctumSubPage = "tags" | null;
type PrivacyPolicySubPage = "privacy-policy" | null;

type RouteState = {
  page: Page;
  recordsSubPage: RecordsSubPage;
  sanctumSubPage: SanctumSubPage;
  privacyPolicySubPage: PrivacyPolicySubPage;
};

function joinWithBase(pathname: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = pathname === "/" ? "" : pathname;
  return `${normalizedBase}${normalizedPath}` || "/";
}

function stripBase(pathname: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;

  if (!normalizedBase || normalizedBase === "/") return pathname;
  return pathname.startsWith(normalizedBase)
    ? pathname.slice(normalizedBase.length) || "/"
    : pathname;
}

function parseRouteFromPath(pathname: string) {
  const path = stripBase(pathname).replace(/^\/+/, "").trim();
  if (!path)
    return {
      page: "home" as Page,
      recordsSubPage: null,
      sanctumSubPage: null,
      privacyPolicySubPage: null,
    } satisfies RouteState;

  const [pageRaw, subRaw] = path.split("/");

  if (pageRaw === "privacy-policy") {
    return {
      page: "home" as Page,
      recordsSubPage: null,
      sanctumSubPage: null,
      privacyPolicySubPage: "privacy-policy" as const,
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
    privacyPolicySubPage: null,
  } satisfies RouteState;
}

function toPathname(
  page: Page,
  recordsSubPage: RecordsSubPage,
  sanctumSubPage: SanctumSubPage,
  privacyPolicySubPage: PrivacyPolicySubPage
) {
  if (privacyPolicySubPage) return "/privacy-policy";
  if (page === "home") return "/";
  if (page === "records" && recordsSubPage) return `/records/${recordsSubPage}`;
  if (page === "sanctum" && sanctumSubPage) return `/sanctum/${sanctumSubPage}`;
  return `/${page}`;
}

function AppContent() {
  const initialRoute = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        page: "home" as Page,
        recordsSubPage: null,
        sanctumSubPage: null,
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

  const [privacyPolicySubPage, setPrivacyPolicySubPage] =
    useState<PrivacyPolicySubPage>(initialRoute.privacyPolicySubPage);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextPathname = joinWithBase(
      toPathname(
        currentPage,
        recordsSubPage,
        sanctumSubPage,
        privacyPolicySubPage
      )
    );
    if (window.location.pathname !== nextPathname) {
      window.history.pushState(
        null,
        "",
        `${nextPathname}${window.location.search}`
      );
    }
  }, [currentPage, recordsSubPage, sanctumSubPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      const { page, recordsSubPage, sanctumSubPage, privacyPolicySubPage } =
        parseRouteFromPath(window.location.pathname);
      setCurrentPage(page);
      setRecordsSubPage(recordsSubPage);
      setSanctumSubPage(sanctumSubPage);
      setPrivacyPolicySubPage(privacyPolicySubPage);
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
    setPrivacyPolicySubPage(null);
  };

  const handleChangeRecordsSubPage = (next: RecordsSubPage) => {
    setCurrentPage("records");
    setRecordsSubPage(next);
    setSanctumSubPage(null);
    setPrivacyPolicySubPage(null);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col">
      {/* Main Content */}
      <main className="flex-1 w-full pb-24">
        <div className="w-full">
          {privacyPolicySubPage === "privacy-policy" ? (
            <PrivacyPolicyPage onClose={() => setPrivacyPolicySubPage(null)} />
          ) : currentPage === "home" ? (
            <TimerPage />
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
            ) : (
              <SanctumPage />
            ))}
        </div>
      </main>

      {/* Bottom Navigation - iOS Floating Style */}
      <nav className="fixed bottom-0 left-0 right-0 pointer-events-none">
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <div className="pointer-events-auto -translate-y-6 max-w-[345px] mx-auto">
            <TabBar currentPage={currentPage} onChange={handleChangePage} />
          </div>
        </div>
      </nav>

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
