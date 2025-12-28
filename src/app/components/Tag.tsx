import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "./ui/utils";

export type TagProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "children"
> & {
  asChild?: boolean;
  text?: string;
  children?: React.ReactNode;
};

export function Tag({
  asChild = false,
  text,
  children,
  className,
  ...props
}: TagProps) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-slot="tag"
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[var(--switch-background)] px-3 py-1 [box-shadow:var(--shadow-neumorphism-inset-xs)]",
        className
      )}
      {...props}
    >
      <span className="pb-0.5 pt-0 text-sm font-normal leading-none text-foreground whitespace-nowrap">
        {children ?? text ?? "タグ1"}
      </span>
    </Comp>
  );
}
