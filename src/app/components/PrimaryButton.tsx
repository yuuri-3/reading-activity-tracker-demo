import * as React from "react";
import { Play } from "lucide-react";

import { Button } from "./ui/button";
import { cn } from "./ui/utils";

export type PrimaryButtonProps = React.ComponentPropsWithoutRef<
  typeof Button
> & {
  text?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
};

type IconElement = React.ReactElement<
  React.SVGProps<SVGSVGElement> & { className?: string }
>;

const isIconElement = (node: React.ReactNode): node is IconElement =>
  React.isValidElement(node);

const defaultIcon = (
  <Play
    strokeWidth={1.5}
    aria-hidden="true"
    className="size-4 text-[#5F6678]"
  />
);

const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  (
    {
      text = "計測を開始する",
      icon = defaultIcon,
      iconPosition = "left",
      children,
      className,
      variant = "default",
      size = "lg",
      ...props
    },
    ref
  ) => {
    const showIcon = icon !== null && icon !== false;
    const content = children ?? text;

    let iconNode: React.ReactNode = null;

    if (showIcon) {
      iconNode = isIconElement(icon)
        ? React.cloneElement(icon, {
            className: cn("size-4 text-[#5F6678]", icon.props.className),
            strokeWidth: icon.props.strokeWidth ?? 1.5,
            "aria-hidden": icon.props["aria-hidden"] ?? true,
          })
        : icon;
    }

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "rounded-full bg-[#E7EDF5] text-[#5B6373] font-medium tracking-[0.01em]",
          "shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.9)]",
          "hover:brightness-[0.97]",
          "active:[box-shadow:inset_4px_4px_8px_rgba(163,177,198,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.75)]",
          showIcon && iconPosition === "right" && "flex-row-reverse",
          showIcon ? "gap-2" : "gap-0",
          className
        )}
        {...props}
      >
        {iconNode && <span className="text-inherit">{iconNode}</span>}
        {content && <span className="text-inherit">{content}</span>}
      </Button>
    );
  }
);

PrimaryButton.displayName = "PrimaryButton";

export { PrimaryButton };
