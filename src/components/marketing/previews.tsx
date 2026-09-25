import {
  AlarmClock,
  ArrowRight,
  Check,
  CircleHelp,
  FileText,
  MessageCircle,
  Sparkles,
  UserRoundX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, IconTile } from "@/components/ui/misc";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import type { PipelineStage } from "@/lib/dashboard/metrics";
import { cn } from "@/lib/utils/cn";

// Product previews rendered with the app's real components and fictional
// sample data — what customers see is exactly what the product looks like.

export function BrowserFrame({
  children,
  className,
  url = "app.aisalesmanager.my",
}: {
  children: React.ReactNode;
  className?: string;
  url?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-background shadow-[0_24px_60px_-20px_rgb(16_24_40/0.22),0_2px_6px_rgb(16_24_40/0.05)]",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b bg-canvas px-4 py-2.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="mx-auto rounded-md bg-background px-3 py-0.5 text-2xs text-subtle">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

export const SAMPLE_STAGES: PipelineStage[] = [
  { status: "NEW", count: 4, value: 62500 },
  { status: "CONTACTED", count: 3, value: 41200 },
  { status: "QUALIFIED", count: 3, value: 118000 },
  { status: "QUOTATION_SENT", count: 2, value: 69800 },
  { status: "NEGOTIATION", count: 1, value: 48000 },
  { status: "WON", count: 5, value: 184900 },
  { status: "LOST", count: 1, value: 9000 },
];

export function DashboardPreview() {
  const kpis = [
    { label: "New leads", value: "12", hint: "↗ 20% vs last week" },
    { label: "Open opportunities", value: "13", hint: "Across all stages" },
    { label: "Pending quotations", value: "2", hint: "RM 70.6k awaiting" },
    { label: "Pipeline value", value: "RM 339.5k", hint: "Open leads" },
  ];
  const attention = [
    {
      icon: AlarmClock,
      tone: "warning" as const,
      title: "Follow up with Nurul Aisyah",
      detail: "Send bathroom design references · 2 days overdue",
    },
    {
      icon: UserRoundX,
      tone: "primary" as const,
      title: "Siti Hajar hasn't been contacted",
      detail: "New enquiry from 3 days ago",
    },
    {
      icon: FileText,
      tone: "info" as const,
      title: "No reply on QT-2026-0007",
      detail: "Ahmad Faizal · RM 7,981.20 · sent 9 days ago",
    },
  ];
  return (
    <div className="space-y-4 bg-background p-5 text-left sm:p-6">
      <div>
        <p className="text-xs text-muted-foreground">Thursday, 24 September</p>
        <p className="text-lg font-semibold tracking-tight">Good morning, Aisyah</p>
        <p className="text-sm text-muted-foreground">
          You have 2 follow-ups due today and 2 overdue.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border bg-card px-3 py-2.5 shadow-card">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="tabular mt-1 text-lg font-semibold tracking-tight">{k.value}</p>
            <p className="text-2xs text-subtle">{k.hint}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card shadow-card">
        <p className="px-4 pb-2 pt-3 text-sm font-semibold">Needs your attention</p>
        <ul className="divide-y border-t">
          {attention.map((a) => (
            <li key={a.title} className="flex items-center gap-3 px-4 py-2.5">
              <IconTile tone={a.tone} className="size-7">
                <a.icon />
              </IconTile>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{a.title}</p>
                <p className="truncate text-2xs text-muted-foreground">{a.detail}</p>
              </div>
              <ArrowRight className="size-3.5 text-primary" aria-hidden />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AIResponsePreview() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card text-left shadow-[0_24px_60px_-24px_rgb(16_24_40/0.25)]">
      <div className="flex items-center gap-3 border-b bg-gradient-to-b from-primary-soft/70 to-transparent px-5 py-3.5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-3.5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold">AI Response</p>
          <p className="text-xs text-muted-foreground">Tan Wei Ming · via WhatsApp</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-sm leading-relaxed">
          Tan Wei Ming is enquiring about a{" "}
          <strong className="font-semibold">kitchen renovation</strong> for a condo in PJ. They have
          indicated a budget of around RM25,000.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-canvas/60 p-3">
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Important details
            </p>
            {[
              "Kitchen renovation",
              "Size: ~120 sqft",
              "Budget: around RM25,000",
              "Location: PJ",
            ].map((d) => (
              <p key={d} className="flex items-center gap-1.5 text-xs">
                <Check className="size-3 text-success" aria-hidden /> {d}
              </p>
            ))}
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning-soft/50 p-3">
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Missing information
            </p>
            {["Preferred timeline", "Cabinet materials", "Kitchen layout"].map((d) => (
              <p key={d} className="flex items-center gap-1.5 text-xs">
                <CircleHelp className="size-3 text-warning" aria-hidden /> {d}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-lg border p-3 text-xs leading-relaxed text-foreground">
          Hi Tan, thank you for reaching out to BrightBuild Renovation! We&apos;d be glad to help
          with your kitchen renovation. To prepare an accurate quotation, could you share your
          preferred timeline and cabinet materials? We&apos;d also be happy to arrange a free site
          visit.
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Copy", "Make friendly", "Make formal", "Shorten"].map((a, i) => (
            <span
              key={a}
              className={cn(
                "rounded-md px-2.5 py-1 text-2xs font-medium",
                i === 0 ? "bg-primary text-primary-foreground" : "border text-muted-foreground"
              )}
            >
              {a}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-2xs font-medium text-muted-foreground">
            <MessageCircle className="size-3" aria-hidden /> WhatsApp
          </span>
        </div>
      </div>
    </div>
  );
}

export function PipelinePreview() {
  return (
    <div className="rounded-xl border bg-card p-4 text-left shadow-card">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-sm font-semibold">Sales pipeline</p>
        <Badge tone="primary">RM 339.5k open</Badge>
      </div>
      <PipelineChart stages={SAMPLE_STAGES} currency="MYR" linked={false} />
    </div>
  );
}

export function FollowUpPreview() {
  const items = [
    {
      name: "Lim Mei Ling",
      task: "Check if quotation was reviewed",
      due: "Today, 4:00 PM",
      overdue: false,
    },
    {
      name: "Ahmad Faizal",
      task: "Follow up on waterproofing quote",
      due: "Yesterday",
      overdue: true,
    },
    {
      name: "Chong Kah Wai",
      task: "Confirm revised scope",
      due: "Tomorrow, 10:00 AM",
      overdue: false,
    },
  ];
  return (
    <ul className="divide-y rounded-xl border bg-card text-left shadow-card">
      {items.map((i) => (
        <li key={i.task} className="flex items-center gap-3 px-4 py-3">
          <span className="size-4 shrink-0 rounded-full border-[1.5px] border-input" aria-hidden />
          <Avatar name={i.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{i.task}</p>
            <p
              className={cn(
                "text-xs",
                i.overdue ? "font-medium text-warning" : "text-muted-foreground"
              )}
            >
              {i.name} · {i.due}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
