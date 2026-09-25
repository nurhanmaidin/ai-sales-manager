import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { toNumber } from "@/lib/utils/format";
import type { AssistantSnapshot } from "./types";

/**
 * Builds the grounded context the AI Assistant is allowed to answer from —
 * strictly this organization's own records.
 */
export async function buildAssistantSnapshot(ctx: TenantContext): Promise<AssistantSnapshot> {
  const organizationId = ctx.organizationId;
  const [org, leads, customers, quotations, followUps] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true, currency: true },
    }),
    prisma.lead.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.customer.findMany({
      where: { organizationId },
      take: 500,
      include: { quotations: { select: { status: true, total: true } } },
    }),
    prisma.quotation.findMany({
      where: { organizationId },
      orderBy: { issueDate: "desc" },
      take: 500,
      include: { customer: { select: { name: true } }, lead: { select: { name: true } } },
    }),
    prisma.followUp.findMany({
      where: { organizationId, status: { in: ["PENDING", "SNOOZED"] } },
      orderBy: { dueDate: "asc" },
      take: 500,
      include: {
        lead: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    businessName: org.name,
    currency: org.currency,
    leads: leads.map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      status: l.status,
      priority: l.priority,
      source: l.source,
      estimatedValue: l.estimatedValue === null ? null : toNumber(l.estimatedValue),
      createdAt: l.createdAt.toISOString(),
      lastContactAt: l.lastContactAt?.toISOString() ?? null,
      nextFollowUpAt: l.nextFollowUpAt?.toISOString() ?? null,
    })),
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      quotationCount: c.quotations.length,
      lifetimeValue: c.quotations
        .filter((q) => q.status === "ACCEPTED")
        .reduce((sum, q) => sum + toNumber(q.total), 0),
    })),
    quotations: quotations.map((q) => ({
      id: q.id,
      number: q.quotationNumber,
      title: q.title,
      status: q.status,
      total: toNumber(q.total),
      contactName: q.customer?.name ?? q.lead?.name ?? null,
      issueDate: q.issueDate.toISOString(),
      expiryDate: q.expiryDate?.toISOString() ?? null,
    })),
    followUps: followUps.map((f) => ({
      id: f.id,
      task: f.task,
      dueDate: f.dueDate.toISOString(),
      status: f.status,
      priority: f.priority,
      contactName: f.customer?.name ?? f.lead?.name ?? null,
      href: f.customer ? `/customers/${f.customer.id}` : f.lead ? `/leads/${f.lead.id}` : null,
    })),
  };
}
