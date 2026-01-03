import type { IconProps } from "./types";

export function IconForward({ className, size = 20, color }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      style={color ? { color } : undefined}
      viewBox="0 0 6.66656 11.6661"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M0.244078 0.244078C0.569515 -0.0813592 1.09651 -0.0813592 1.42195 0.244078L6.42254 5.24369C6.74787 5.56913 6.74794 6.09713 6.42254 6.42254L1.42195 11.4221C1.09654 11.7475 0.56949 11.7475 0.244078 11.4221C-0.0813592 11.0967 -0.0813592 10.5687 0.244078 10.2433L4.65377 5.83262L0.244078 1.42195C-0.0813592 1.09651 -0.0813592 0.569515 0.244078 0.244078Z"
        fill="currentColor"
      />
    </svg>
  );
}
