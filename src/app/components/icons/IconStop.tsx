import { IconBase } from "./IconBase";
import type { IconProps } from "./types";

export function IconStop({ size = 6, color }: IconProps) {
  return (
    <IconBase size={size} color={color} viewBox="0 0 24 24">
      <g transform="translate(2.3336 2.3336)">
        <path
          d="M16.6664 0.666413H2.66641C1.56184 0.666413 0.666413 1.56184 0.666413 2.66641V16.6664C0.666413 17.771 1.56184 18.6664 2.66641 18.6664H16.6664C17.771 18.6664 18.6664 17.771 18.6664 16.6664V2.66641C18.6664 1.56184 17.771 0.666413 16.6664 0.666413Z"
          stroke="currentColor"
          strokeWidth="1.33283"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </IconBase>
  );
}
