import { IconBase } from "./IconBase";
import type { IconProps } from "./types";

export function IconAdd({ size = 6, color }: IconProps) {
  return (
    <IconBase size={size} color={color} viewBox="0 0 24 24">
      <path
        d="M12 3.5016C12.5521 3.5016 12.999 3.9485 12.999 4.5006V11.0011H19.4995C20.0515 11.0011 20.4984 11.448 20.4984 12C20.4984 12.5521 20.0515 12.999 19.4995 12.999H12.999V19.4995C12.999 20.0515 12.5521 20.4984 12 20.4984C11.448 20.4984 11.0011 20.0515 11.0011 19.4995V12.999H4.5006C3.9485 12.999 3.5016 12.5521 3.5016 12C3.5016 11.448 3.9485 11.0011 4.5006 11.0011H11.0011V4.5006C11.0011 3.9485 11.448 3.5016 12 3.5016Z"
        fill="currentColor"
      />
    </IconBase>
  );
}
