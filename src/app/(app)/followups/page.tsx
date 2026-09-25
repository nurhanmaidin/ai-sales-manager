import type { Metadata } from "next";
import Link from "next/link";
import { format, isToday, isTomorrow } from "date-fns";
import { AlarmClock, BellRing, CalendarCheck, CalendarClock, CheckCircle2 } from "lucide-react";
import { requireTenantPage } from "@/lib/auth/context";
import { followUpService, type FollowUpView } from "@/lib/followups/service";
import { quotationService } from "@/lib/quotations/service";
import { accountService } from "@/lib/account/service";
import { cn } from "@/lib/utils/cn";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { AddFollowUpButton } from "@/components/followups/add-followup-button";
import { FollowUpRow } from "@/components/followups/followup-row";
import { toFollowUpRow } from "@/components/followups/followup-mapper";

export const metadata: Metadata = { title: "Follow-ups" };

const VIEWS: { key: FollowUpView; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "overdue", label: "Overdue" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

const EMPTY: Record<FollowUpView, { icon: React.ReactNode; title: string; description: string }> = {
  today: {
    icon: <CalendarCheck />,
    title: "You're all caught up for today",
    description: "Nothing else is due today. Nice work.",
  },
  overdue: {
    icon: <CheckCircle2 />,
    title: "Nothing overdue",
    description: "Every follow-up is on schedule.",
  },
  upcoming: {
    icon: <CalendarClock />,
    title: "No upcoming follow-ups",
    description: "Schedule the next step for your open leads so none go cold.",
  },
  completed: {
    icon: <BellRing />,
    title: "No completed follow-ups yet",
    description: "Completed follow-ups appear here as a record of your outreach.",
  },
};

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, d MMM");
}

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const ctx = await requireTenantPage();
  const { view: rawView } = await searchParams;
  const view: FollowUpView = VIEWS.some((v) => v.key === rawView)
    ? (rawView as FollowUpView)
    : "today";

  const [items, counts, recipients, prefs] = await Promise.all([
    followUpService.list(ctx, view),
    followUpService.counts(ctx),
    quotationService.recipientOptions(ctx),
    accountService.getNotificationPrefs(ctx.userId),
  ]);

  const targets = [
    ...recipients.customers.map((c) => ({
      value: `customer:${c.id}`,
      label: `${c.name} (customer)`,
    })),
    ...recipients.leads.map((l) => ({ value: `lead:${l.id}`, label: `${l.name} (lead)` })),
  ];

  // Upcoming and completed lists read best grouped by day.
  const groups = new Map<string, typeof items>();
  for (const f of items) {
    const key =
      view === "upcoming"
        ? dayLabel(f.dueDate)
        : view === "completed" && f.completedAt
          ? dayLabel(f.completedAt)
          : "";
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description={
          counts.today + counts.overdue === 0
            ? "Nothing due right now."
            : `${counts.today} due today${counts.overdue ? ` · ${counts.overdue} overdue` : ""}`
        }
        actions={
          <AddFollowUpButton
            targets={targets}
            label="Schedule follow-up"
            variant="primary"
            size="md"
          />
        }
      />

      <nav aria-label="Follow-up views" className="mb-5 flex gap-1 overflow-x-auto border-b">
        {VIEWS.map((v) => {
          const active = v.key === view;
          const n = counts[v.key];
          return (
            <Link
              key={v.key}
              href={v.key === "today" ? "/followups" : `/followups?view=${v.key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {v.label}
              <span
                className={cn(
                  "tabular rounded-full px-1.5 text-2xs font-semibold",
                  v.key === "overdue" && n > 0
                    ? "bg-warning-soft text-warning"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {n}
              </span>
            </Link>
          );
        })}
      </nav>

      {view === "today" && prefs.overdueBanner && counts.overdue > 0 && (
        <Link
          href="/followups?view=overdue"
          className="mb-4 flex items-center gap-3 rounded-lg border border-warning/25 bg-warning-soft/60 px-4 py-3 text-sm transition-colors hover:bg-warning-soft"
        >
          <AlarmClock className="size-4 shrink-0 text-warning" aria-hidden />
          <span className="flex-1">
            You also have <strong className="font-semibold">{counts.overdue} overdue</strong>{" "}
            follow-up{counts.overdue === 1 ? "" : "s"} from earlier.
          </span>
          <span className="font-medium text-warning">Review</span>
        </Link>
      )}

      {items.length === 0 ? (
        <Card>
          <EmptyState
            {...EMPTY[view]}
            action={
              view === "upcoming" || view === "today" ? (
                <AddFollowUpButton targets={targets} label="Schedule follow-up" />
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([label, group]) => (
            <section key={label || "all"}>
              {label && (
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{label}</h2>
              )}
              <Card className="divide-y overflow-hidden">
                {group.map((f) => (
                  <FollowUpRow key={f.id} item={toFollowUpRow(f)} />
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
