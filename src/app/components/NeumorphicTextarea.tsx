import * as React from "react";

import { Textarea } from "./ui/textarea";
import { cn } from "./ui/utils";

export type NeumorphicTextareaProps = React.ComponentProps<typeof Textarea>;

const NeumorphicTextarea = React.forwardRef<
  HTMLTextAreaElement,
  NeumorphicTextareaProps
>(({ className, ...props }, ref) => {
  return (
    <Textarea
      ref={ref}
      data-slot="neumorphic-textarea"
      className={cn("rounded-[6px] px-4 py-3", className)}
      {...props}
    />
  );
});

NeumorphicTextarea.displayName = "NeumorphicTextarea";

export { NeumorphicTextarea };
