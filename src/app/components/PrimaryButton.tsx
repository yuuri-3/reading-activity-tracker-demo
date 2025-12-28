import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./ui/utils";

const primaryButtonVariants = cva(
  // Matches Figma node 9:15 (PrimaryButton)
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] pl-5 pr-6 py-3 text-[14px] font-normal leading-[1.3] tracking-[0.25px] text-foreground transition-[filter,box-shadow] disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--background-solid)] [box-shadow:var(--shadow-neumorphism-sm)] active:[box-shadow:var(--shadow-neumorphism-inset)]",
      },
      iconPosition: {
        start: "",
        end: "flex-row-reverse",
      },
    },
    defaultVariants: {
      variant: "default",
      iconPosition: "start",
    },
  }
);

export type PrimaryButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof primaryButtonVariants> & {
    asChild?: boolean;
    icon?: React.ReactNode;
  };

const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  (
    {
      className,
      variant,
      iconPosition,
      icon,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-slot="primary-button"
        className={cn(
          primaryButtonVariants({ variant, iconPosition }),
          "[&_svg]:shrink-0 [&_svg]:size-4",
          className
        )}
        {...props}
      >
        {icon}
        {children}
      </Comp>
    );
  }
);

PrimaryButton.displayName = "PrimaryButton";

export { PrimaryButton, primaryButtonVariants };
