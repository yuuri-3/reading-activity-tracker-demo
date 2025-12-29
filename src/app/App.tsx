import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "./auth/AuthGate";
import { AuthProvider } from "./auth/AuthContext";
import { AppProvider } from "./context/AppContext";
import { TimerPage } from "./pages/TimerPage";
import { BookCollectionView } from "./pages/BookCollectionView";
import { RecordSingleView } from "./pages/RecordSingleView";
import { TabBar, type Page } from "./components/TabBar";
import { Toast } from "./components/Toast";

function AppContent() {
  const initialPage = useMemo<Page>(() => {
    const raw = (typeof window !== "undefined" ? window.location.hash : "")
      .replace(/^#/, "")
      .trim();
    return raw === "home" || raw === "books" || raw === "records"
      ? (raw as Page)
      : "home";
  }, []);

  const [currentPage, setCurrentPage] = useState<Page>(initialPage);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextHash = `#${currentPage}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, [currentPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHashChange = () => {
      const raw = window.location.hash.replace(/^#/, "").trim();
      if (raw === "home" || raw === "books" || raw === "records") {
        setCurrentPage(raw as Page);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return (
    <div className="size-full flex flex-col">
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-2xl mx-auto h-full">
          {currentPage === "home" && <TimerPage />}
          {currentPage === "books" && <BookCollectionView />}
          {currentPage === "records" && <RecordSingleView />}
        </div>
      </main>

      {/* Bottom Navigation - iOS Floating Style */}
      <nav className="fixed bottom-0 left-0 right-0 pointer-events-none">
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <div className="pointer-events-auto -translate-y-6 max-w-[345px] mx-auto">
            <TabBar currentPage={currentPage} onChange={setCurrentPage} />
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
