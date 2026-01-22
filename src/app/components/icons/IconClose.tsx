import { IconBase } from "./IconBase";
import type { IconProps } from "./types";

export function IconClose({ size = 6, color }: IconProps) {
  return (
    <IconBase size={size} color={color} viewBox="0 0 24 24">
      <g transform="translate(6 6) scale(0.8571429)">
        <path
          d="M13 1L1 13M1 1L13 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </IconBase>
  );
}
