export type IconSizeToken =
  | 3
  | 3.5
  | 4
  | 4.5
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

export type IconProps = {
  /** Tailwind spacing token (e.g. 6 = w-6/h-6) */
  size?: IconSizeToken;
  /** CSS color value (e.g. "var(--foreground)", "currentColor") */
  color?: string;
};
