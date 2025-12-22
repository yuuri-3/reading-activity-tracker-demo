import * as React from "react";

import { cn } from "./ui/utils";

export type FormLabelProps = React.ComponentPropsWithoutRef<"div"> & {
  /** Label text. If `children` is provided, it takes precedence. */
  text?: React.ReactNode;
  /** Whether to show the optional badge text. */
  showOptionalLabel?: boolean;
  /** Optional badge text content. */
  optionalText?: React.ReactNode;
};

export function FormLabel({
  className,
  text,
  children,
  showOptionalLabel = true,
  optionalText = "Optional",
  ...props
}: FormLabelProps) {
  const labelContent = children ?? text;

  return (
    <div
      data-slot="form-label"
      className={cn(
        "inline-flex items-baseline gap-1.5 whitespace-nowrap leading-[14px]",
        className
      )}
      {...props}
    >
      <span className="text-foreground text-sm font-medium leading-[14px]">
        {labelContent}
      </span>
      {showOptionalLabel && (
        <span className="text-muted-foreground text-[13px] font-normal leading-[14px]">
          {optionalText}
        </span>
      )}
    </div>
  );
}
