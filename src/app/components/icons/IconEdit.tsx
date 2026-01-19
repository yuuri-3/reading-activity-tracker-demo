import { IconBase } from "./IconBase";
import type { IconProps } from "./types";

export function IconEdit({ size = 6, color }: IconProps) {
  return (
    <IconBase size={size} color={color} viewBox="0 0 24 24">
      {/* Figma: 24px frame with inner padding (~16px glyph). */}
      <g transform="translate(4 4) scale(0.9230769231)">
        <path
          d="M16.0057 4.5164C16.4287 4.09353 16.6663 3.51996 16.6664 2.92185C16.6665 2.32375 16.429 1.75011 16.0061 1.32713C15.5832 0.904156 15.0097 0.666488 14.4116 0.666413C13.8135 0.666338 13.2398 0.903862 12.8169 1.32673L2.13997 12.0062C1.95423 12.1914 1.81686 12.4194 1.73997 12.6702L0.68316 16.1519C0.662484 16.2211 0.660923 16.2946 0.678641 16.3646C0.696359 16.4346 0.732697 16.4985 0.783798 16.5495C0.834899 16.6005 0.898859 16.6367 0.96889 16.6543C1.03892 16.6719 1.11241 16.6703 1.18156 16.6495L4.664 15.5935C4.91453 15.5173 5.14254 15.3807 5.328 15.1958L16.0057 4.5164Z"
          stroke="currentColor"
          strokeWidth="1.33283"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </IconBase>
  );
}
