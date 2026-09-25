import Link from "next/link";
import type { PipelineStage } from "@/lib/dashboard/metrics";
import { LEAD_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { formatMoneyCompact, pluralize } from "@/lib/utils/format";

function RowTag({ href, ...props }: React.HTMLAttributes<HTMLElement> & { href?: string }) {
  return href ? <Link href={href} tabIndex={-1} {...props} /> : <div {...props} />;
}

/**
 * Stage-by-stage pipeline. Bars encode lead count in a single hue; value is
 * printed beside each bar, so nothing relies on color alone.
 */
export function PipelineChart({
  stages,
  currency,
  linked = true,
}: {
  stages: PipelineStage[];
  currency: string;
  /** Rows link to the filtered leads list (off for marketing previews). */
  linked?: boolean;
}) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <div>
      <table className="sr-only">
        <caption>Sales pipeline by stage</caption>
        <thead>
          <tr>
            <th scope="col">Stage</th>
            <th scope="col">Leads</th>
            <th scope="col">Estimated value</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.status}>
              <th scope="row">{LEAD_STATUS_META[s.status].label}</th>
              <td>{s.count}</td>
              <td>{formatMoneyCompact(s.value, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ol aria-hidden className="space-y-1">
        {stages.map((s) => {
          const closed = s.status === "WON" || s.status === "LOST";
          const pct = (s.count / max) * 100;
          return (
            <li key={s.status}>
              <RowTag
                href={linked ? `/leads?status=${s.status}` : undefined}
                title={`${LEAD_STATUS_META[s.status].label}: ${pluralize(s.count, "lead")}, ${formatMoneyCompact(s.value, currency)}`}
                className={cn(
                  "group grid grid-cols-[112px_minmax(0,1fr)_88px] items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-canvas",
                  s.status === "WON" && "mt-2 border-t pt-3"
                )}
              >
                <span
                  className={cn("truncate text-sm", s.count ? "text-foreground" : "text-subtle")}
                >
                  {LEAD_STATUS_META[s.status].label}
                </span>
                <span className="flex h-6 items-center gap-2">
                  <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500",
                        s.status === "WON"
                          ? "bg-success"
                          : s.status === "LOST"
                            ? "bg-subtle/60"
                            : "bg-primary/80 group-hover:bg-primary"
                      )}
                      style={{ width: `${s.count ? Math.max(pct, 3) : 0}%` }}
                    />
                  </span>
                  <span
                    className={cn(
                      "tabular w-5 text-right text-sm font-medium",
                      !s.count && "text-subtle"
                    )}
                  >
                    {s.count}
                  </span>
                </span>
                <span
                  className={cn(
                    "tabular text-right text-sm",
                    closed || !s.value ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {s.value ? formatMoneyCompact(s.value, currency) : "—"}
                </span>
              </RowTag>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
