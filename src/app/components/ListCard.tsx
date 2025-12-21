import * as React from "react";

import { cn } from "./ui/utils";

type ListCardProps<TAs extends React.ElementType> = {
  as?: TAs;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<TAs>, "as" | "className">;

export function ListCard<TAs extends React.ElementType = "div">({
  as,
  className,
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
        "bg-[#E0E5EC] rounded-xl border-0 [box-shadow:8px_8px_16px_rgba(163,177,198,0.5),-8px_-8px_16px_rgba(255,255,255,0.7)]",
        "p-4",
        isButton && "w-full text-left hover:bg-accent transition-colors",
        className
      )}
      {...(componentProps as any)}
    />
  );
}
