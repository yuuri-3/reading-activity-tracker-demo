import { cloneElement, isValidElement, type ReactElement } from "react";

type TabBarIconElement = ReactElement<{ className?: string; color?: string }>;

export type TabBarItemProps = {
  label: string;
  icon: TabBarIconElement;
  isActive: boolean;
  onClick: () => void;
};

export function TabBarItem({
  label,
  icon,
  isActive,
  onClick,
}: TabBarItemProps) {
  const iconColor = isActive ? "#5e84a6" : "#9ba3b0";
  const coloredIcon = isValidElement(icon)
    ? cloneElement(icon, { color: iconColor })
    : icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 h-14 flex-1 rounded-full px-0 py-2 transition-all ${
        isActive
          ? "text-[#5e84a6] bg-[rgba(94,132,166,0.2)]"
          : "text-[#9ba3b0] active:bg-black/5"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {coloredIcon}
      <span className="text-[10px] leading-[12.5px] font-medium">{label}</span>
    </button>
  );
}
