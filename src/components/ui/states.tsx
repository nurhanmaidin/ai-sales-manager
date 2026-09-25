import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Intentional empty state: icon, a clear sentence, and the next action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-16",
        className
      )}
    >
      <div
        aria-hidden
        className={cn(
          "mb-4 flex items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-xs",
          compact ? "size-10 [&_svg]:size-4" : "size-12 [&_svg]:size-5"
        )}
      >
        {icon}
      </div>
      <h3 className={cn("font-semibold text-foreground", compact ? "text-base" : "text-md")}>
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-md text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Inline, friendly error block — never a stack trace. */
export function InlineError({ title, description }: { title: string; description?: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm"
    >
      <p className="font-medium text-destructive">{title}</p>
      {description && <p className="mt-0.5 text-destructive/80">{description}</p>}
    </div>
  );
}
