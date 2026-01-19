import type { ReactNode } from "react";

import type { IconProps } from "./types";

type IconBaseProps = IconProps & {
  viewBox: string;
  children: ReactNode;
};

export function IconBase({
  size = 6,
  color,
  viewBox,
  children,
}: IconBaseProps) {
  const sizeVarKey = String(size).replace(".", "_");
  const sizeFallbackRem = `${size * 0.25}rem`;
  const sizeCss = `var(--spacing-${sizeVarKey}, ${sizeFallbackRem})`;

  return (
    <svg
      width={sizeCss}
      height={sizeCss}
      style={color ? { color } : undefined}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}
