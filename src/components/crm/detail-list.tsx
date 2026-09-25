import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function DetailList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <dl className={cn("divide-y divide-border/70", className)}>{children}</dl>;
}

export function DetailRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground [&_svg]:size-3.5 [&_svg]:text-subtle">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm text-foreground [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}
