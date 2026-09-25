"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { LEAD_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { changeLeadStatusAction } from "@/server/crm-actions";

const STAGES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "WON",
];

/** Clickable pipeline progress. Lost is handled from the actions menu. */
export function StatusStepper({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(status);
  const currentIndex = STAGES.indexOf(optimistic);
  const lost = optimistic === "LOST";

  function move(next: LeadStatus) {
    if (next === optimistic) return;
    startTransition(async () => {
      setOptimistic(next);
      const result = await changeLeadStatusAction(leadId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Moved to ${LEAD_STATUS_META[next].label}`);
      router.refresh();
    });
  }

  return (
    <nav
      aria-label="Pipeline stage"
      className={cn("overflow-x-auto", pending && "cursor-progress")}
    >
      <ol className="flex min-w-[560px] gap-1">
        {STAGES.map((stage, i) => {
          const done = !lost && i < currentIndex;
          const current = !lost && i === currentIndex;
          const won = current && stage === "WON";
          return (
            <li key={stage} className="flex-1">
              <button
                type="button"
                onClick={() => move(stage)}
                disabled={pending}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "group flex w-full flex-col gap-1.5 rounded-md px-1 pb-1 pt-0.5 text-left transition-colors hover:bg-accent/60 disabled:cursor-progress"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-full rounded-full transition-colors duration-300",
                    won
                      ? "bg-success"
                      : done || current
                        ? "bg-primary"
                        : "bg-border group-hover:bg-input"
                  )}
                />
                <span
                  className={cn(
                    "flex items-center gap-1 whitespace-nowrap text-xs",
                    current
                      ? "font-semibold text-foreground"
                      : done
                        ? "text-muted-foreground"
                        : "text-subtle"
                  )}
                >
                  {done && <Check className="size-3 text-primary" aria-hidden />}
                  {LEAD_STATUS_META[stage].label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {lost && (
        <p className="mt-2 text-xs text-muted-foreground">
          This lead is marked as lost. Choose a stage above to reopen it.
        </p>
      )}
    </nav>
  );
}
