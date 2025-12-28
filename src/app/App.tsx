import { useState } from "react";
import { AuthGate } from "./auth/AuthGate";
import { AuthProvider } from "./auth/AuthContext";
import { AppProvider } from "./context/AppContext";
import { HomePage } from "./pages/HomePage";
import { BooksPage } from "./pages/BooksPage";
import { RecordList } from "./pages/RecordList";
import { TabBar, type Page } from "./components/TabBar";
import { Toast } from "./components/ui/sonner";

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  return (
    <div className="size-full flex flex-col">
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-2xl mx-auto h-full">
          {currentPage === "home" && <HomePage />}
          {currentPage === "books" && <BooksPage />}
          {currentPage === "histories" && <RecordList />}
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
