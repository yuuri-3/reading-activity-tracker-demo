import * as React from "react";

import { cn } from "./ui/utils";

type ListCardProps<TAs extends React.ElementType> = {
  as?: TAs;
  className?: string;
  shadow?: "md" | "sm";
} & Omit<React.ComponentPropsWithoutRef<TAs>, "as" | "className">;

export function ListCard<TAs extends React.ElementType = "div">({
  as,
  className,
  shadow = "md",
  ...props
}: ListCardProps<TAs>) {
  const Component = (as ?? "div") as React.ElementType;
  const isButton = Component === "button";

  const componentProps =
    isButton && (props as any).type == null
      ? ({ ...props, type: "button" } as typeof props)
      : props;

  return (
    <Component
      data-slot="list-card"
      className={cn(
        // `ui/card.tsx` のニューモフィズム感と合わせる
        "bg-[var(--background-solid)] rounded-[12px] border-0",
        shadow === "md"
          ? "[box-shadow:var(--shadow-neumorphism)]"
          : "[box-shadow:var(--shadow-neumorphism-sm)]",
        "p-4",
        isButton && "w-full text-left hover:bg-accent transition-colors",
        className
      )}
      {...(componentProps as any)}
    />
  );
}
