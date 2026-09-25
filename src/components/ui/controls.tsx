"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { inputClasses } from "./input";

/** Segmented radio control — used for priority and similar small enums. */
export function Segmented<T extends string>({
  id,
  value,
  onChange,
  options,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex w-full rounded-md border border-input bg-muted p-0.5", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[5px] text-sm font-medium transition-all",
              selected
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Currency-prefixed amount input. */
export const MoneyInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { symbol?: string }
>(({ symbol = "RM", className, ...props }, ref) => (
  <div className="relative">
    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
      {symbol}
    </span>
    <input
      ref={ref}
      inputMode="decimal"
      className={cn(inputClasses, "tabular pl-10", className)}
      {...props}
    />
  </div>
));
MoneyInput.displayName = "MoneyInput";
