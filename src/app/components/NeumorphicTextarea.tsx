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

  const parsePx = React.useCallback((value: string) => {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const resize = React.useCallback(() => {
    if (!autoResize) return;

    const el = innerRef.current;
    if (!el) return;

    const computed = window.getComputedStyle(el);

    const lineHeight = (() => {
      const lh = Number.parseFloat(computed.lineHeight);
      if (Number.isFinite(lh)) return lh;

      const fontSize = Number.parseFloat(computed.fontSize);
      if (Number.isFinite(fontSize)) return fontSize * 1.25;

      return 20;
    })();

    const paddingY =
      parsePx(computed.paddingTop) + parsePx(computed.paddingBottom);
    const borderY =
      parsePx(computed.borderTopWidth) + parsePx(computed.borderBottomWidth);

    const rows = props.rows ?? 2;
    const minHeightRaw = rows * lineHeight + paddingY + borderY;
    const minHeight = Number.isFinite(minHeightRaw) ? minHeightRaw : 0;

    el.style.overflowY = "hidden";
    el.style.minHeight = `${minHeight}px`;
    el.style.height = "auto";
    const nextHeight = Math.max(el.scrollHeight, minHeight);
    el.style.height = `${
      Number.isFinite(nextHeight) ? nextHeight : minHeight
    }px`;
  }, [autoResize, props.rows]);

  React.useLayoutEffect(() => {
    resize();
    const raf = window.requestAnimationFrame(() => {
      resize();
    });
    return () => {
      window.cancelAnimationFrame(raf);
    };
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
