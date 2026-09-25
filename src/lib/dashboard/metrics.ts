import { endOfDay, startOfDay, startOfMonth, subDays } from "date-fns";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { LEAD_STATUSES, OPEN_LEAD_STATUSES, PENDING_QUOTATION_STATUSES } from "@/lib/constants";
import { toNumber } from "@/lib/utils/format";

export interface PipelineStage {
  status: LeadStatus;
  count: number;
  value: number;
}

export interface PipelineMetrics {
  currency: string;
  totalLeads: number;
  openLeads: number;
  pipelineValue: number;
  highestOpen: { id: string; name: string; value: number } | null;
  newLeadsThisWeek: number;
  newLeadsPrevWeek: number;
  pendingQuotations: number;
  pendingQuotationValue: number;
  followUpsDueToday: number;
  overdueFollowUps: number;
  staleLeads: number;
  acceptedValueThisMonth: number;
  stages: PipelineStage[];
}

/** Real aggregates for the dashboard and AI insights — never fabricated. */
export async function getPipelineMetrics(
  ctx: TenantContext,
  now = new Date()
): Promise<PipelineMetrics> {
  const organizationId = ctx.organizationId;
  const weekAgo = subDays(now, 7);
  const twoWeeksAgo = subDays(now, 14);
  const openFollowUp = { in: ["PENDING", "SNOOZED"] as ("PENDING" | "SNOOZED")[] };

  const [
    org,
    stageGroups,
    highestOpen,
    newThisWeek,
    newPrevWeek,
    pendingQuotes,
    dueToday,
    overdue,
    stale,
    acceptedThisMonth,
  ] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { currency: true },
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
      _sum: { estimatedValue: true },
    }),
    prisma.lead.findFirst({
      where: { organizationId, status: { in: OPEN_LEAD_STATUSES }, estimatedValue: { not: null } },
      orderBy: { estimatedValue: "desc" },
      select: { id: true, name: true, estimatedValue: true },
    }),
    prisma.lead.count({ where: { organizationId, createdAt: { gte: weekAgo } } }),
    prisma.lead.count({ where: { organizationId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.quotation.aggregate({
      where: { organizationId, status: { in: PENDING_QUOTATION_STATUSES } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.followUp.count({
      where: {
        organizationId,
        status: openFollowUp,
        dueDate: { gte: startOfDay(now), lte: endOfDay(now) },
      },
    }),
    prisma.followUp.count({
      where: { organizationId, status: openFollowUp, dueDate: { lt: startOfDay(now) } },
    }),
    prisma.lead.count({
      where: {
        organizationId,
        status: { in: OPEN_LEAD_STATUSES },
        nextFollowUpAt: null,
        OR: [
          { lastContactAt: { lt: weekAgo } },
          { lastContactAt: null, createdAt: { lt: weekAgo } },
        ],
      },
    }),
    prisma.quotation.aggregate({
      where: { organizationId, status: "ACCEPTED", updatedAt: { gte: startOfMonth(now) } },
      _sum: { total: true },
    }),
  ]);

  const stages: PipelineStage[] = LEAD_STATUSES.map((status) => {
    const g = stageGroups.find((x) => x.status === status);
    return { status, count: g?._count._all ?? 0, value: toNumber(g?._sum.estimatedValue) };
  });
  const open = stages.filter((s) => OPEN_LEAD_STATUSES.includes(s.status));

  return {
    currency: org.currency,
    totalLeads: stages.reduce((sum, s) => sum + s.count, 0),
    openLeads: open.reduce((sum, s) => sum + s.count, 0),
    pipelineValue: open.reduce((sum, s) => sum + s.value, 0),
    highestOpen: highestOpen
      ? { id: highestOpen.id, name: highestOpen.name, value: toNumber(highestOpen.estimatedValue) }
      : null,
    newLeadsThisWeek: newThisWeek,
    newLeadsPrevWeek: newPrevWeek,
    pendingQuotations: pendingQuotes._count._all,
    pendingQuotationValue: toNumber(pendingQuotes._sum.total),
    followUpsDueToday: dueToday,
    overdueFollowUps: overdue,
    staleLeads: stale,
    acceptedValueThisMonth: toNumber(acceptedThisMonth._sum.total),
    stages,
  };
}
