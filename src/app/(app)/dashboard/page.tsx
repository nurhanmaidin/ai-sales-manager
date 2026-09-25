import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlarmClock,
  ArrowRight,
  BellRing,
  Check,
  CircleCheck,
  FilePlus2,
  FileText,
  Snowflake,
  UserRoundX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getWorkspace, requireTenantPage } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { getPipelineMetrics } from "@/lib/dashboard/metrics";
import { getAttentionItems, type AttentionItem } from "@/lib/dashboard/attention";
import { followUpService } from "@/lib/followups/service";
import { accountService } from "@/lib/account/service";
import {
  firstName,
  formatMoney,
  formatMoneyCompact,
  formatRelative,
  pluralize,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, IconTile, Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/states";
import { LeadStatusBadge } from "@/components/crm/badges";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { AIInsights } from "@/components/ai/ai-insights";
import { AddLeadButton } from "@/components/leads/add-lead-button";
import { FollowUpRow } from "@/components/followups/followup-row";
import { toFollowUpRow } from "@/components/followups/followup-mapper";

export const metadata: Metadata = { title: "Dashboard" };

const ATTENTION_META: Record<
  AttentionItem["kind"],
  { icon: LucideIcon; tone: "warning" | "info" | "primary" | "neutral" }
> = {
  overdue_followup: { icon: AlarmClock, tone: "warning" },
  expiring_quotation: { icon: FileText, tone: "warning" },
  stale_quotation: { icon: FileText, tone: "info" },
  uncontacted_lead: { icon: UserRoundX, tone: "primary" },
  cold_lead: { icon: Snowflake, tone: "neutral" },
};

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function InsightsSkeleton() {
  return (
    <Card className="space-y-3 p-5" aria-hidden>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
    </Card>
  );
}

export default async function DashboardPage() {
  const ctx = await requireTenantPage();
  const workspace = await getWorkspace();
  const currency = workspace?.organization.currency ?? "MYR";
  const where = { organizationId: ctx.organizationId };

  const [
    metrics,
    attention,
    upcoming,
    recentLeads,
    quotationCount,
    aiReplyCount,
    followUpCount,
    prefs,
  ] = await Promise.all([
    getPipelineMetrics(ctx),
    getAttentionItems(ctx),
    followUpService.upcomingWindow(ctx, 7, 6),
    prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.quotation.count({ where }),
    prisma.aIInteraction.count({ where: { ...where, type: "LEAD_REPLY" } }),
    prisma.followUp.count({ where }),
    accountService.getNotificationPrefs(ctx.userId),
  ]);

  const dueNow = metrics.followUpsDueToday + metrics.overdueFollowUps;
  const trend =
    metrics.newLeadsPrevWeek > 0
      ? {
          delta: Math.round(
            ((metrics.newLeadsThisWeek - metrics.newLeadsPrevWeek) / metrics.newLeadsPrevWeek) * 100
          ),
          label: "vs previous 7 days",
        }
      : undefined;

  const checklist = [
    { done: metrics.totalLeads > 0, label: "Add your first lead", href: "/leads?new=1" },
    {
      done: aiReplyCount > 0,
      label: "Generate an AI reply",
      href: recentLeads[0] ? `/leads/${recentLeads[0].id}` : "/leads",
    },
    { done: quotationCount > 0, label: "Create a quotation", href: "/quotations/new" },
    { done: followUpCount > 0, label: "Schedule a follow-up", href: "/followups" },
  ];
  const setupComplete = checklist.every((c) => c.done);

  const summary =
    dueNow > 0
      ? `You have ${pluralize(metrics.followUpsDueToday, "follow-up")} due today${
          metrics.overdueFollowUps ? ` and ${metrics.overdueFollowUps} overdue` : ""
        }.`
      : metrics.totalLeads > 0
        ? "You're on top of every follow-up today."
        : "Let's get your first lead in.";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d MMMM")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {greeting()}, {firstName(workspace?.user.name) || "there"}
          </h1>
          <p className="mt-1 text-md text-muted-foreground">{summary}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/quotations/new">
              <FilePlus2 aria-hidden /> New quotation
            </Link>
          </Button>
          <AddLeadButton currency={currency} />
        </div>
      </header>

      {!setupComplete && (
        <Card className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="lg:w-64">
              <h2 className="text-md font-semibold">Get set up in 4 steps</h2>
              <p className="text-sm text-muted-foreground">
                {checklist.filter((c) => c.done).length} of 4 done — about five minutes in total.
              </p>
            </div>
            <ol className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {checklist.map((c, i) => (
                <li key={c.label}>
                  <Link
                    href={c.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      c.done
                        ? "border-success/20 bg-success-soft/50 text-muted-foreground"
                        : "hover:border-primary/30 hover:bg-primary-soft/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full text-2xs font-semibold",
                        c.done ? "bg-success text-white" : "border text-muted-foreground"
                      )}
                    >
                      {c.done ? <Check className="size-3" strokeWidth={3} aria-hidden /> : i + 1}
                    </span>
                    <span className={cn(c.done && "line-through decoration-subtle")}>
                      {c.label}
                    </span>
                    <span className="sr-only">{c.done ? "(done)" : "(to do)"}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard
          label="New leads"
          value={String(metrics.newLeadsThisWeek)}
          hint="Last 7 days"
          href="/leads?created=7d"
          trend={trend}
        />
        <KpiCard
          label="Open opportunities"
          value={String(metrics.openLeads)}
          hint="Across all stages"
          href="/leads"
        />
        <KpiCard
          label="Pending quotations"
          value={String(metrics.pendingQuotations)}
          hint={
            metrics.pendingQuotations
              ? `${formatMoneyCompact(metrics.pendingQuotationValue, currency)} awaiting`
              : "None awaiting reply"
          }
          href="/quotations?status=SENT"
        />
        <KpiCard
          label="Follow-ups due"
          value={String(dueNow)}
          hint={metrics.overdueFollowUps ? `${metrics.overdueFollowUps} overdue` : "Today"}
          href="/followups"
          tone={metrics.overdueFollowUps ? "warning" : undefined}
        />
        <div className="col-span-2 lg:col-span-1">
          <KpiCard
            label="Pipeline value"
            value={formatMoneyCompact(metrics.pipelineValue, currency)}
            hint="Open leads, estimated"
            href="/leads"
          />
        </div>
      </section>

      <div
        className={cn(
          "grid gap-6",
          prefs.dashboardInsights && "lg:grid-cols-[minmax(0,1fr)_380px]"
        )}
      >
        <Card>
          <CardHeader
            title="Needs your attention"
            description={attention.length ? "The most urgent things first." : undefined}
          />
          {attention.length === 0 ? (
            <EmptyState
              compact
              icon={<CircleCheck />}
              title="Nothing needs you right now"
              description="No overdue follow-ups, unanswered quotations or cold leads."
            />
          ) : (
            <ul className="divide-y border-t">
              {attention.map((item) => {
                const meta = ATTENTION_META[item.kind];
                const Icon = meta.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="group flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-canvas"
                    >
                      <IconTile tone={meta.tone}>
                        <Icon />
                      </IconTile>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary opacity-80 group-hover:opacity-100 sm:inline-flex">
                        {item.action} <ArrowRight className="size-3.5" aria-hidden />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {prefs.dashboardInsights && (
          <Suspense fallback={<InsightsSkeleton />}>
            <AIInsights />
          </Suspense>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Sales pipeline"
            description={`${formatMoney(metrics.pipelineValue, currency)} open across ${pluralize(metrics.openLeads, "lead")}`}
            action={
              <Link href="/leads" className="text-sm font-medium text-primary hover:underline">
                View leads
              </Link>
            }
          />
          <div className="px-3 pb-4">
            {metrics.totalLeads === 0 ? (
              <EmptyState
                compact
                icon={<Users />}
                title="No leads in your pipeline yet"
                description="Your stages fill in as you add and progress leads."
              />
            ) : (
              <PipelineChart stages={metrics.stages} currency={currency} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming follow-ups"
            description="Overdue and next 7 days"
            action={
              <Link href="/followups" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              compact
              icon={<BellRing />}
              title="No follow-ups this week"
              description="Schedule next steps from any lead to see them here."
            />
          ) : (
            <div className="divide-y border-t">
              {upcoming.map((f) => (
                <FollowUpRow key={f.id} item={toFollowUpRow(f)} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent leads"
          action={
            <Link href="/leads" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          }
        />
        {recentLeads.length === 0 ? (
          <EmptyState
            compact
            icon={<Users />}
            title="No leads yet"
            description="New enquiries will show up here."
            action={<AddLeadButton currency={currency} variant="secondary" size="sm" />}
          />
        ) : (
          <ul className="divide-y border-t">
            {recentLeads.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/leads/${l.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-canvas"
                >
                  <Avatar name={l.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.description?.split(/[.!?]/)[0] ?? l.company ?? "No enquiry details"}
                    </p>
                  </div>
                  <span className="tabular hidden text-sm font-medium sm:block">
                    {l.estimatedValue ? formatMoney(l.estimatedValue, currency) : ""}
                  </span>
                  <LeadStatusBadge status={l.status} />
                  <span className="hidden w-24 text-right text-xs text-muted-foreground md:block">
                    {formatRelative(l.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
