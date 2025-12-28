import * as React from "react";

import { Input } from "./ui/input";
import { cn } from "./ui/utils";

export type NeumorphicInputProps = React.ComponentProps<typeof Input>;

const NeumorphicInput = React.forwardRef<
  HTMLInputElement,
  NeumorphicInputProps
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-slot="neumorphic-input"
      className={cn(
        // Matches Figma field styling (e.g. SelectTrigger)
        "h-11 rounded-[6px] bg-[var(--background-solid)] px-4 py-3 text-sm leading-5",
        className
      )}
      {...props}
    />
  );
});

NeumorphicInput.displayName = "NeumorphicInput";

export { NeumorphicInput };
