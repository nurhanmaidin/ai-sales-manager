import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const inputClasses =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-base shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-subtle hover:border-foreground/20 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-[0_0_0_3px_hsl(var(--destructive)/0.15)]";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} className={cn(inputClasses, className)} ref={ref} {...props} />
  )
);
Input.displayName = "Input";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(inputClasses, "h-auto min-h-[88px] resize-y py-2 leading-relaxed", className)}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Input, Textarea };
