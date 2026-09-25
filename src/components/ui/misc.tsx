import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("skeleton h-4", className)} {...props} />;
}

export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      className={cn("shrink-0 bg-border", vertical ? "h-full w-px" : "h-px w-full", className)}
    />
  );
}

const AVATAR_TINTS = [
  "bg-[hsl(234_50%_94%)] text-[hsl(234_45%_36%)]",
  "bg-[hsl(170_40%_92%)] text-[hsl(170_50%_26%)]",
  "bg-[hsl(28_70%_93%)] text-[hsl(24_60%_34%)]",
  "bg-[hsl(262_45%_94%)] text-[hsl(262_35%_40%)]",
  "bg-[hsl(200_55%_93%)] text-[hsl(205_55%_32%)]",
  "bg-[hsl(340_45%_94%)] text-[hsl(340_40%_38%)]",
];

function tintFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length];
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    xs: "size-5 text-[9px]",
    sm: "size-7 text-2xs",
    md: "size-8 text-xs",
    lg: "size-10 text-sm",
    xl: "size-14 text-lg",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        tintFor(name ?? ""),
        sizes[size],
        className
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border bg-background px-1 font-sans text-2xs font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  );
}

export function IconTile({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-destructive-soft text-destructive",
    info: "bg-info-soft text-info",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
