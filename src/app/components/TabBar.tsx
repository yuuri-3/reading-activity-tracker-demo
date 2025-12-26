import { BookOpen, Clock, House, Search } from "lucide-react";

export type Page = "home" | "books" | "histories" | "search";

export type TabBarProps = {
  currentPage: Page;
  onChange: (page: Page) => void;
};

export function TabBar({ currentPage, onChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 pointer-events-none">
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div className="pointer-events-auto backdrop-blur-2xl bg-white/60 border border-white/40 rounded-full [box-shadow:0_8px_32px_rgba(163,177,198,0.2),0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] -translate-y-6">
          <div className="grid grid-cols-4 gap-1 px-2 py-2">
            <button
              onClick={() => onChange("home")}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-full transition-all ${
                currentPage === "home"
                  ? "text-primary bg-primary/20"
                  : "text-muted-foreground active:bg-black/5"
              }`}
            >
              <House
                className={`size-6 ${
                  currentPage === "home" ? "stroke-[2.5]" : "stroke-2"
                }`}
              />
              <span className="text-[10px] leading-tight">計測</span>
            </button>

            <button
              onClick={() => onChange("books")}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-full transition-all ${
                currentPage === "books"
                  ? "text-primary bg-primary/20"
                  : "text-muted-foreground active:bg-black/5"
              }`}
            >
              <BookOpen
                className={`size-6 ${
                  currentPage === "books" ? "stroke-[2.5]" : "stroke-2"
                }`}
              />
              <span className="text-[10px] leading-tight">本棚</span>
            </button>

            <button
              onClick={() => onChange("histories")}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-full transition-all ${
                currentPage === "histories"
                  ? "text-primary bg-primary/20"
                  : "text-muted-foreground active:bg-black/5"
              }`}
            >
              <Clock
                className={`size-6 ${
                  currentPage === "histories" ? "stroke-[2.5]" : "stroke-2"
                }`}
              />
              <span className="text-[10px] leading-tight">履歴</span>
            </button>

            <button
              onClick={() => onChange("search")}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-full transition-all ${
                currentPage === "search"
                  ? "text-primary bg-primary/20"
                  : "text-muted-foreground active:bg-black/5"
              }`}
            >
              <Search
                className={`size-6 ${
                  currentPage === "search" ? "stroke-[2.5]" : "stroke-2"
                }`}
              />
              <span className="text-[10px] leading-tight">検索</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
