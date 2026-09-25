import type { ActivityType } from "@prisma/client";
import {
  ArrowRightLeft,
  BellPlus,
  CircleCheck,
  FilePen,
  FilePlus2,
  History,
  PenLine,
  Sparkles,
  StickyNote,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatRelative } from "@/lib/utils/format";

const ACTIVITY_META: Record<ActivityType, { icon: LucideIcon; tone: string }> = {
  LEAD_CREATED: { icon: UserPlus, tone: "text-primary bg-primary-soft" },
  LEAD_UPDATED: { icon: PenLine, tone: "text-muted-foreground bg-muted" },
  STATUS_CHANGED: { icon: ArrowRightLeft, tone: "text-info bg-info-soft" },
  NOTE_ADDED: { icon: StickyNote, tone: "text-muted-foreground bg-muted" },
  AI_REPLY_GENERATED: { icon: Sparkles, tone: "text-primary bg-primary-soft" },
  QUOTATION_CREATED: { icon: FilePlus2, tone: "text-warning bg-warning-soft" },
  QUOTATION_STATUS_CHANGED: { icon: FilePen, tone: "text-warning bg-warning-soft" },
  FOLLOW_UP_SCHEDULED: { icon: BellPlus, tone: "text-info bg-info-soft" },
  FOLLOW_UP_COMPLETED: { icon: CircleCheck, tone: "text-success bg-success-soft" },
  CUSTOMER_CREATED: { icon: UserCheck, tone: "text-success bg-success-soft" },
};

export interface TimelineActivity {
  id: string;
  type: ActivityType;
  description: string;
  createdAt: Date;
  user: { name: string | null; email: string } | null;
}

export function ActivityTimeline({ activities }: { activities: TimelineActivity[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState
        compact
        icon={<History />}
        title="No activity yet"
        description="Status changes, notes, quotations and follow-ups will appear here."
      />
    );
  }

  return (
    <ol className="relative">
      {activities.map((activity, index) => {
        const meta = ACTIVITY_META[activity.type];
        const Icon = meta.icon;
        const last = index === activities.length - 1;
        return (
          <li key={activity.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className="absolute left-[13px] top-7 h-[calc(100%-1.5rem)] w-px bg-border"
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                meta.tone
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm leading-5 text-foreground">{activity.description}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activity.user?.name ?? activity.user?.email ?? "System"} ·{" "}
                <time
                  dateTime={activity.createdAt.toISOString()}
                  title={formatDateTime(activity.createdAt)}
                >
                  {formatRelative(activity.createdAt)}
                </time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
