import type { ReactNode } from "react";

export type TabBarItemProps = {
  label: string;
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
};

export function TabBarItem({
  label,
  icon,
  isActive,
  onClick,
}: TabBarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 h-14 flex-1 rounded-full px-0 py-2 transition-all ${
        isActive
          ? "text-primary bg-primary/20"
          : "text-muted-foreground active:bg-black/5"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {icon}
      <span className="text-[10px] leading-[12.5px] font-medium">{label}</span>
    </button>
  );
}
