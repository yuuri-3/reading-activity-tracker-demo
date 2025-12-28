import * as React from "react";

import { SelectTrigger } from "./ui/select";
import { cn } from "./ui/utils";

export type NeumorphicSelectTriggerProps = React.ComponentProps<
  typeof SelectTrigger
>;

export function NeumorphicSelectTrigger({
  className,
  size = "default",
  ...props
}: NeumorphicSelectTriggerProps) {
  return (
    <SelectTrigger
      size={size}
      className={cn(
        // Matches Figma node 8:1020 (Select)
        "rounded-[6px] bg-[var(--background-solid)] px-4 py-3 text-sm font-normal leading-5 *:data-[slot=select-value]:font-normal",
        "gap-4",
        "data-[size=default]:h-11",
        className
      )}
      {...props}
    />
  );
}
