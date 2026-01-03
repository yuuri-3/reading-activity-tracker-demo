import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "./auth/AuthGate";
import { AuthProvider } from "./auth/AuthContext";
import { AppProvider } from "./context/AppContext";
import { TimerPage } from "./pages/TimerPage";
import { BookCollectionView } from "./pages/BookCollectionView";
import { RecordSingleView } from "./pages/RecordSingleView";
import { SanctumPage } from "./pages/SanctumPage";
import { TagManagementPage } from "./pages/TagManagementPage";
import { TabBar, type Page } from "./components/TabBar";
import { Toast } from "./components/Toast";

type RecordsSubPage = "add" | null;
type SanctumSubPage = "tags" | null;

function AppContent() {
  const initialRoute = useMemo(() => {
    const raw = (typeof window !== "undefined" ? window.location.hash : "")
      .replace(/^#/, "")
      .trim();

    const [pageRaw, subRaw] = raw.split("/");
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

    return { page, recordsSubPage, sanctumSubPage };
  }, []);

  const [currentPage, setCurrentPage] = useState<Page>(initialRoute.page);
  const [recordsSubPage, setRecordsSubPage] = useState<RecordsSubPage>(
    initialRoute.recordsSubPage
  );

  const [sanctumSubPage, setSanctumSubPage] = useState<SanctumSubPage>(
    initialRoute.sanctumSubPage
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextHash =
      currentPage === "records" && recordsSubPage
        ? `#records/${recordsSubPage}`
        : currentPage === "sanctum" && sanctumSubPage
        ? `#sanctum/${sanctumSubPage}`
        : `#${currentPage}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, [currentPage, recordsSubPage, sanctumSubPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHashChange = () => {
      const raw = window.location.hash.replace(/^#/, "").trim();
      const [pageRaw, subRaw] = raw.split("/");

      if (
        pageRaw === "home" ||
        pageRaw === "books" ||
        pageRaw === "records" ||
        pageRaw === "sanctum"
      ) {
        const nextPage = pageRaw as Page;
        setCurrentPage(nextPage);
        setRecordsSubPage(
          nextPage === "records" && subRaw === "add" ? "add" : null
        );
        setSanctumSubPage(
          nextPage === "sanctum" && subRaw === "tags" ? "tags" : null
        );
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const handleChangePage = (next: Page) => {
    setCurrentPage(next);
    setRecordsSubPage(null);
    setSanctumSubPage(null);
  };

  const handleChangeRecordsSubPage = (next: RecordsSubPage) => {
    setCurrentPage("records");
    setRecordsSubPage(next);
    setSanctumSubPage(null);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col">
      {/* Main Content */}
      <main className="flex-1 w-full pb-24">
        <div className="w-full">
          {currentPage === "home" && <TimerPage />}
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
