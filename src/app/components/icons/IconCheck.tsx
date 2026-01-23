import { IconBase } from "./IconBase";
import type { IconProps } from "./types";

export function IconCheck({ size = 6, color }: IconProps) {
  return (
    <IconBase size={size} color={color} viewBox="0 0 24 24">
      <g transform="translate(4.3846 6.5) scale(0.8461538)">
        <path
          d="M17 1L6 12L1 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </IconBase>
  );
}
