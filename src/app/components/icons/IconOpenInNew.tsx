import type { IconProps } from "./types";

export function IconOpenInNew({ className, size = 18, color }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      style={color ? { color } : undefined}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1.77778 16C1.28889 16 0.87037 15.8259 0.522222 15.4778C0.174074 15.1296 0 14.7111 0 14.2222V1.77778C0 1.28889 0.174074 0.87037 0.522222 0.522222C0.87037 0.174074 1.28889 0 1.77778 0H8V1.77778H1.77778V14.2222H14.2222V8H16V14.2222C16 14.7111 15.8259 15.1296 15.4778 15.4778C15.1296 15.8259 14.7111 16 14.2222 16H1.77778ZM5.95556 11.2889L4.71111 10.0444L12.9778 1.77778H9.77778V0H16V6.22222H14.2222V3.02222L5.95556 11.2889Z"
        fill="currentColor"
        transform="translate(3 3) scale(0.75)"
      />
    </svg>
  );
}
