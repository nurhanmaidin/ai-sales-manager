import { differenceInCalendarDays, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { OPEN_LEAD_STATUSES, PENDING_QUOTATION_STATUSES } from "@/lib/constants";
import { formatMoney } from "@/lib/utils/format";

export interface AttentionItem {
  id: string;
  kind:
    | "overdue_followup"
    | "stale_quotation"
    | "expiring_quotation"
    | "uncontacted_lead"
    | "cold_lead";
  title: string;
  detail: string;
  href: string;
  action: string;
  severity: number; // higher = more urgent
}

/** Items that need the owner's attention now, derived from real records only. */
export async function getAttentionItems(
  ctx: TenantContext,
  now = new Date(),
  limit = 6
): Promise<AttentionItem[]> {
  const organizationId = ctx.organizationId;
  const [overdue, quotes, uncontacted, cold] = await Promise.all([
    prisma.followUp.findMany({
      where: {
        organizationId,
        status: { in: ["PENDING", "SNOOZED"] },
        dueDate: { lt: startOfDay(now) },
      },
      include: {
        lead: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: limit,
    }),
    prisma.quotation.findMany({
      where: { organizationId, status: { in: PENDING_QUOTATION_STATUSES } },
      include: { customer: { select: { name: true } }, lead: { select: { name: true } } },
      orderBy: { issueDate: "asc" },
      take: 20,
    }),
    prisma.lead.findMany({
      where: {
        organizationId,
        status: "NEW",
        lastContactAt: null,
        createdAt: { lt: subDays(now, 1) },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    }),
    prisma.lead.findMany({
      where: {
        organizationId,
        status: { in: OPEN_LEAD_STATUSES.filter((s) => s !== "NEW") },
        nextFollowUpAt: null,
        lastContactAt: { lt: subDays(now, 7) },
      },
      orderBy: { lastContactAt: "asc" },
      take: limit,
    }),
  ]);

  const items: AttentionItem[] = [];

  for (const f of overdue) {
    const days = Math.max(1, differenceInCalendarDays(now, f.dueDate));
    const who = f.customer ?? f.lead;
    items.push({
      id: `f-${f.id}`,
      kind: "overdue_followup",
      title: who ? `Follow up with ${who.name}` : f.task,
      detail: `${f.task} · ${days} day${days === 1 ? "" : "s"} overdue`,
      href: f.customer
        ? `/customers/${f.customer.id}`
        : f.lead
          ? `/leads/${f.lead.id}`
          : "/followups?view=overdue",
      action: "Open",
      severity: 100 + days,
    });
  }

  for (const q of quotes) {
    const who = q.customer?.name ?? q.lead?.name ?? "customer";
    const expiresIn = q.expiryDate ? differenceInCalendarDays(q.expiryDate, now) : null;
    const age = differenceInCalendarDays(now, q.issueDate);
    if (expiresIn !== null && expiresIn >= 0 && expiresIn <= 3) {
      items.push({
        id: `qe-${q.id}`,
        kind: "expiring_quotation",
        title: `${q.quotationNumber} expires ${expiresIn === 0 ? "today" : `in ${expiresIn} day${expiresIn === 1 ? "" : "s"}`}`,
        detail: `${who} · ${formatMoney(q.total, q.currency)}`,
        href: `/quotations/${q.id}`,
        action: "Review",
        severity: 90 - expiresIn,
      });
    } else if (age >= 5) {
      items.push({
        id: `qs-${q.id}`,
        kind: "stale_quotation",
        title: `No reply on ${q.quotationNumber}`,
        detail: `${who} · ${formatMoney(q.total, q.currency)} · sent ${age} days ago`,
        href: `/quotations/${q.id}`,
        action: "Follow up",
        severity: 60 + Math.min(age, 20),
      });
    }
  }

  for (const l of uncontacted) {
    const days = differenceInCalendarDays(now, l.createdAt);
    items.push({
      id: `u-${l.id}`,
      kind: "uncontacted_lead",
      title: `${l.name} hasn't been contacted`,
      detail: `New enquiry from ${days} day${days === 1 ? "" : "s"} ago`,
      href: `/leads/${l.id}`,
      action: "Reply",
      severity: 70 + days,
    });
  }

  for (const l of cold) {
    const days = l.lastContactAt ? differenceInCalendarDays(now, l.lastContactAt) : 0;
    items.push({
      id: `c-${l.id}`,
      kind: "cold_lead",
      title: `${l.name} is going cold`,
      detail: `No contact in ${days} days and no follow-up scheduled`,
      href: `/leads/${l.id}`,
      action: "Schedule",
      severity: 40 + days,
    });
  }

  return items.sort((a, b) => b.severity - a.severity).slice(0, limit);
}
