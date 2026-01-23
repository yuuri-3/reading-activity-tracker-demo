import type { CSSProperties, ReactNode } from "react";

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

  // Avoid setting SVG `width`/`height` attributes with CSS variables.
  // Some browsers won't resolve `var(...)` in attributes and will fall back to
  // default SVG dimensions, making icons look gigantic.
  const style: CSSProperties = {
    inlineSize: sizeCss,
    blockSize: sizeCss,
    ...(color ? { color } : {}),
  };

  return (
    <svg
      style={style}
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
