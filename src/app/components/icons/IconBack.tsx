import { IconBase } from "./IconBase";
import type { IconProps } from "./types";

export function IconBack({ size = 6, color }: IconProps) {
  return (
    <IconBase size={size} color={color} viewBox="0 0 24 24">
      <path
        d="M13.4103 5.4112C13.7357 5.0859 14.2626 5.0859 14.588 5.4112C14.9133 5.7366 14.9133 6.2636 14.588 6.589L9.177 12L14.588 17.411C14.9133 17.7364 14.9133 18.2634 14.588 18.5888C14.2626 18.9142 13.7357 18.9142 13.4103 18.5888L7.4104 12.5889C7.0851 12.2635 7.0851 11.7366 7.4104 11.4112L13.4103 5.4112Z"
        fill="currentColor"
      />
    </IconBase>
  );
}
