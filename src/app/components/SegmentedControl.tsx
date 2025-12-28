"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

import { cn } from "./ui/utils";

export type SegmentedControlItem = {
  value: string;
  text: string;
  amount?: number | string;
  disabled?: boolean;
};

export type SegmentedControlProps = {
  items: SegmentedControlItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
};

export function SegmentedControl({
  items,
  value,
  onValueChange,
  className,
  disabled,
}: SegmentedControlProps) {
  function SegmentedControlItem({
    text,
    amount,
    itemValue,
    itemDisabled,
  }: {
    text: string;
    amount?: number | string;
    itemValue: string;
    itemDisabled?: boolean;
  }) {
    return (
      <ToggleGroupPrimitive.Item
        type="button"
        value={itemValue}
        disabled={disabled || itemDisabled}
        className={cn(
          "inline-flex flex-1 min-w-0 items-center justify-center gap-1 px-5 py-2 rounded-xl text-sm leading-none text-foreground transition-[background-color,color,box-shadow]",
          "font-normal",
          "data-[state=on]:bg-card data-[state=on]:font-semibold",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:opacity-50 disabled:pointer-events-none"
        )}
      >
        <span className="shrink-0">{text}</span>
        {amount !== undefined && amount !== null && (
          <span className="shrink-0">
            (<span>{amount}</span>)
          </span>
        )}
      </ToggleGroupPrimitive.Item>
    );
  }

  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        if (!nextValue) return;
        onValueChange(nextValue);
      }}
      className={cn(
        "bg-muted inline-flex items-center rounded-xl p-[3px]",
        className
      )}
      aria-label="Segmented control"
    >
      {items.map((item) => (
        <SegmentedControlItem
          key={item.value}
          text={item.text}
          amount={item.amount}
          itemValue={item.value}
          itemDisabled={item.disabled}
        />
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
