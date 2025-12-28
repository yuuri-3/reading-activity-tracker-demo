import { useState } from "react";
import { AuthGate } from "./auth/AuthGate";
import { AuthProvider } from "./auth/AuthContext";
import { AppProvider } from "./context/AppContext";
import { HomePage } from "./pages/HomePage";
import { BooksPage } from "./pages/BooksPage";
import { HistoriesPage } from "./pages/HistoriesPage";
import { SearchPage } from "./pages/SearchPage";
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
          {currentPage === "histories" && <HistoriesPage />}
          {currentPage === "search" && <SearchPage />}
        </div>
      </main>

      {/* Bottom Navigation - iOS Floating Style */}
      <TabBar currentPage={currentPage} onChange={setCurrentPage} />

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
