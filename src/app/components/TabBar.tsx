import { TabBarItem } from "./TabBarItem";
import { IconBookshelf } from "./icons/IconBookshelf";
import { IconRecord } from "./icons/IconRecord";
import { IconTimer } from "./icons/IconTimer";

export type Page = "home" | "books" | "records";

export type TabBarProps = {
  currentPage: Page;
  onChange: (page: Page) => void;
};

export function TabBar({ currentPage, onChange }: TabBarProps) {
  return (
    <div className="relative w-full backdrop-blur-[2px] bg-white/60 border border-white/40 rounded-full shadow-[0_8px_32px_rgba(163,177,198,0.2),0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-1 p-2">
        <TabBarItem
          label="計測"
          isActive={currentPage === "home"}
          onClick={() => onChange("home")}
          icon={<IconTimer size={24} color="currentColor" />}
        />

        <TabBarItem
          label="本棚"
          isActive={currentPage === "books"}
          onClick={() => onChange("books")}
          icon={<IconBookshelf size={24} color="currentColor" />}
        />

        <TabBarItem
          label="記録"
          isActive={currentPage === "records"}
          onClick={() => onChange("records")}
          icon={<IconRecord size={24} color="currentColor" />}
        />
      </div>

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] rounded-full" />
    </div>
  );
}
