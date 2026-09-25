import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function KpiCard({
  label,
  value,
  hint,
  href,
  trend,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  href: string;
  /** Only pass when there is a real comparison period. */
  trend?: { delta: number; label: string };
  tone?: "warning";
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border bg-card px-4 py-3.5 shadow-card transition-[border-color,box-shadow] hover:border-foreground/15 hover:shadow-popover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <span className="text-sm text-muted-foreground group-hover:text-foreground">{label}</span>
      <span
        className={cn(
          "tabular mt-1.5 text-2xl font-semibold tracking-tight",
          tone === "warning" && "text-warning"
        )}
      >
        {value}
      </span>
      <span className="mt-1 flex items-center gap-1.5 text-xs text-subtle">
        {trend && trend.delta !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              trend.delta > 0 ? "text-success" : "text-muted-foreground"
            )}
          >
            {trend.delta > 0 ? (
              <ArrowUpRight className="size-3" aria-hidden />
            ) : (
              <ArrowDownRight className="size-3" aria-hidden />
            )}
            {Math.abs(trend.delta)}%
            <span className="sr-only">{trend.delta > 0 ? "increase" : "decrease"}</span>
          </span>
        )}
        <span className="truncate">{trend ? trend.label : hint}</span>
      </span>
    </Link>
  );
}
