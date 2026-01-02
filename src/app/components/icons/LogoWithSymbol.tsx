import clsx from "clsx";

import logoSymbolUrl from "../../assets/logo-symbol.svg";
import logoWordmarkUrl from "../../assets/logo-wordmark.svg";

export type LogoWithSymbolProps = {
  className?: string;
};

export function LogoWithSymbol({ className }: LogoWithSymbolProps) {
  return (
    <div
      className={clsx("relative w-[186px] h-[141px]", className)}
      aria-label="Yomzoy"
    >
      <div className="absolute inset-[0_9.29%_50.59%_16.82%]">
        <img
          src={logoSymbolUrl}
          alt=""
          aria-hidden="true"
          className="block size-full"
        />
      </div>

      <div className="absolute inset-[59.35%_0_0_0]">
        <img
          src={logoWordmarkUrl}
          alt=""
          aria-hidden="true"
          className="block size-full"
        />
      </div>
    </div>
  );
}
