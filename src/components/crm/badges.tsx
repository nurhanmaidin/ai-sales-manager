import type { LeadPriority, LeadSource, LeadStatus, QuotationStatus } from "@prisma/client";
import {
  CircleDashed,
  Globe,
  Handshake,
  Mail,
  MessageCircle,
  Phone,
  Share2,
  Camera,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  LEAD_STATUS_META,
  PRIORITY_META,
  QUOTATION_STATUS_META,
  SOURCE_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const meta = LEAD_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const meta = QUOTATION_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

const PRIORITY_BARS: Record<LeadPriority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

/** Signal-bar priority indicator: readable at a glance, not loud. */
export function PriorityIndicator({
  priority,
  showLabel = true,
}: {
  priority: LeadPriority;
  showLabel?: boolean;
}) {
  const bars = PRIORITY_BARS[priority];
  const color =
    priority === "HIGH" ? "bg-destructive" : priority === "MEDIUM" ? "bg-warning" : "bg-subtle";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="flex h-3 items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("w-[3px] rounded-sm", i <= bars ? color : "bg-border")}
            style={{ height: `${4 + i * 3}px` }}
          />
        ))}
      </span>
      {showLabel ? (
        PRIORITY_META[priority].label
      ) : (
        <span className="sr-only">{PRIORITY_META[priority].label} priority</span>
      )}
    </span>
  );
}

export const SOURCE_ICONS: Record<LeadSource, LucideIcon> = {
  WHATSAPP: MessageCircle,
  WEBSITE: Globe,
  FACEBOOK: Share2,
  INSTAGRAM: Camera,
  REFERRAL: Handshake,
  PHONE: Phone,
  EMAIL: Mail,
  OTHER: CircleDashed,
};

export function SourceLabel({ source, className }: { source: LeadSource; className?: string }) {
  const Icon = SOURCE_ICONS[source];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", className)}
    >
      <Icon className="size-3.5 shrink-0 text-subtle" aria-hidden />
      {SOURCE_LABELS[source]}
    </span>
  );
}
