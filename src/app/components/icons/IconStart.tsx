import { IconBase } from "./IconBase";
import type { IconProps } from "./types";

export function IconStart({ size = 6, color }: IconProps) {
  return (
    <IconBase size={size} color={color} viewBox="0 0 24 24">
      <g transform="translate(6 3.1667) scale(0.9130)">
        <path
          d="M0.666667 0.666667L14.6667 9.66667L0.666667 18.6667V0.666667Z"
          stroke="currentColor"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </IconBase>
  );
}
