import * as React from "react";

import { cn } from "./ui/utils";

import { FormLabel, type FormLabelProps } from "./FormLabel";

export type FieldItemProps = React.ComponentPropsWithoutRef<"div"> & {
  labelProps?: Omit<FormLabelProps, "className">;
  labelClassName?: string;
  fieldClassName?: string;
  /** Instance-swappable field element (Figma slot). */
  instance?: React.ReactNode | null;
};

export function FieldItem({
  className,
  labelProps,
  labelClassName,
  fieldClassName,
  instance = null,
  ...props
}: FieldItemProps) {
  return (
    <div
      data-slot="field-item"
      className={cn("flex w-[291px] flex-col items-start gap-2", className)}
      {...props}
    >
      <FormLabel
        {...labelProps}
        className={cn(
          "shrink-0",
          // Align with Figma: baseline + 6px gap and 14px line height
          "inline-flex items-baseline gap-1.5 whitespace-nowrap leading-[14px]",
          labelClassName
        )}
      />
      <div className={cn("w-full", fieldClassName)}>{instance}</div>
    </div>
  );
}
