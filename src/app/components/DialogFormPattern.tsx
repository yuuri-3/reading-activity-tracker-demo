import * as React from "react";

import { cn } from "./ui/utils";

export type DialogFormPatternProps = React.ComponentPropsWithoutRef<"div"> & {
  /** Figma: Type=RegistBook | AddRecord */
  type?: "RegistBook" | "AddRecord";
};

export function DialogFormPattern({
  type = "RegistBook",
  className,
  children,
  ...props
}: DialogFormPatternProps) {
  return (
    <div
      data-slot="dialog-form-pattern"
      data-type={type}
      className={cn(
        "flex w-full flex-col items-stretch",
        type === "AddRecord" ? "gap-4 pb-6" : "gap-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
