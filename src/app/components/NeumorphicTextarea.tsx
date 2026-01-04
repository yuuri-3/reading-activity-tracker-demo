import * as React from "react";

import { Textarea } from "./ui/textarea";
import { cn } from "./ui/utils";

export type NeumorphicTextareaProps = React.ComponentProps<typeof Textarea> & {
  autoResize?: boolean;
};

const NeumorphicTextarea = React.forwardRef<
  HTMLTextAreaElement,
  NeumorphicTextareaProps
>(({ className, autoResize, onInput, onChange, ...props }, forwardedRef) => {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const resize = React.useCallback(() => {
    if (!autoResize) return;

    const el = innerRef.current;
    if (!el) return;

    el.style.overflowY = "hidden";
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, el.clientHeight)}px`;
  }, [autoResize]);

  React.useLayoutEffect(() => {
    resize();
  }, [resize, props.value, props.rows]);

  return (
    <Textarea
      ref={(node) => {
        innerRef.current = node;
        if (!forwardedRef) return;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
          return;
        }
        (
          forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>
        ).current = node;
      }}
      data-slot="neumorphic-textarea"
      className={cn("rounded-[6px] px-4 py-3", className)}
      {...props}
      onInput={(e) => {
        resize();
        onInput?.(e);
      }}
      onChange={(e) => {
        resize();
        onChange?.(e);
      }}
    />
  );
});

NeumorphicTextarea.displayName = "NeumorphicTextarea";

export { NeumorphicTextarea };
