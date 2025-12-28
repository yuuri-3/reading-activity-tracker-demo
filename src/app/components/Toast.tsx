import { Toaster as Sonner, ToasterProps } from "sonner";

import { cn } from "./ui/utils";

function SuccessToastIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 15.9981 15.9981"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.99906 15.9981C10.1205 15.9981 12.1551 15.1554 13.6553 13.6553C15.1554 12.1551 15.9981 10.1205 15.9981 7.99906C15.9981 5.87758 15.1554 3.84299 13.6553 2.34287C12.1551 0.842756 10.1205 0 7.99906 0C5.87758 0 3.84299 0.842756 2.34287 2.34287C0.842756 3.84299 0 5.87758 0 7.99906C0 10.1205 0.842756 12.1551 2.34287 13.6553C3.84299 15.1554 5.87758 15.9981 7.99906 15.9981ZM11.8556 6.19027C11.9135 6.11057 11.9552 6.02024 11.9782 5.92445C12.0012 5.82865 12.0051 5.72927 11.9896 5.63196C11.9742 5.53466 11.9398 5.44134 11.8883 5.35734C11.8369 5.27334 11.7693 5.2003 11.6896 5.1424C11.6099 5.08449 11.5196 5.04285 11.4238 5.01985C11.328 4.99686 11.2286 4.99295 11.1313 5.00837C11.034 5.02378 10.9407 5.05821 10.8567 5.10968C10.7727 5.16116 10.6997 5.22868 10.6418 5.30838L7.15916 10.0978L5.27938 8.21804C5.21017 8.14645 5.12739 8.08936 5.03588 8.0501C4.94437 8.01084 4.84596 7.9902 4.74639 7.98938C4.64682 7.98856 4.54808 8.00758 4.45593 8.04533C4.36379 8.08308 4.28009 8.13881 4.20971 8.20925C4.13933 8.27969 4.08369 8.36345 4.04603 8.45563C4.00836 8.54781 3.98943 8.64656 3.99035 8.74614C3.99126 8.84571 4.01199 8.9441 4.05134 9.03557C4.09068 9.12705 4.14785 9.20977 4.21951 9.27891L6.71921 11.7786C6.79583 11.8553 6.88815 11.9144 6.98983 11.952C7.0915 11.9895 7.2001 12.0046 7.30816 11.9961C7.41621 11.9877 7.52115 11.9559 7.61574 11.903C7.71033 11.8501 7.79232 11.7773 7.85608 11.6896L11.8556 6.19027Z"
        fill="#009966"
      />
    </svg>
  );
}

const Toast = ({ ...props }: ToasterProps) => {
  const toastOptions = props.toastOptions;
  const toastClassNames = toastOptions?.classNames;

  const toastBaseClassName =
    // Matches Figma node 15:468 (Toast)
    "relative flex items-center gap-3 border border-white/40 rounded-[8px] px-[17px] py-[13px] w-[360px] [box-shadow:0_8px_32px_rgba(163,177,198,0.2),0_2px_8px_rgba(0,0,0,0.04)] after:content-[''] after:absolute after:inset-0 after:pointer-events-none after:rounded-[8px] after:shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]";

  return (
    <Sonner
      theme="light"
      position={props.position ?? "top-center"}
      offset={props.offset ?? 32}
      className="toaster group"
      icons={{
        ...props.icons,
        success: <SuccessToastIcon />,
      }}
      toastOptions={{
        ...toastOptions,
        // Sonner injects default toast background styles that can override our
        // translucent background. Make it unstyled and fully control visuals.
        unstyled: true,
        style: {
          backgroundColor: "rgba(255,255,255,0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          ...(toastOptions?.style ?? {}),
        },
        classNames: {
          ...toastClassNames,
          toast: cn(toastBaseClassName, toastClassNames?.toast),
          title: cn(
            "text-[14px] font-medium leading-5 tracking-[-0.1504px] text-foreground",
            toastClassNames?.title
          ),
          icon: cn(
            "flex size-5 shrink-0 items-center justify-center",
            toastClassNames?.icon
          ),
          content: cn("min-w-0 flex-1", toastClassNames?.content),
          actionButton: cn(
            // Matches Figma node 15:468 (UndoButton)
            "shrink-0 rounded-[4px] border-0 bg-transparent p-1 text-[14px] font-bold leading-none text-foreground",
            toastClassNames?.actionButton
          ),
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toast };
