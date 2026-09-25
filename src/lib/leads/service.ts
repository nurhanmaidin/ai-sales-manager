import { subDays } from "date-fns";
import { LeadStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { activityService } from "@/lib/activities/service";
import { LEAD_STATUS_META, SOURCE_LABELS } from "@/lib/constants";
import { AppError, NotFoundError } from "@/lib/errors";
import {
  idSchema,
  leadFiltersSchema,
  leadInputSchema,
  leadUpdateSchema,
  type LeadFilters,
} from "@/lib/validators/crm";

const CREATED_WINDOWS = { "7d": 7, "30d": 30, "90d": 90 } as const;

async function findOwned(ctx: TenantContext, id: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: idSchema.parse(id), organizationId: ctx.organizationId },
  });
  if (!lead) throw new NotFoundError("Lead");
  return lead;
}

export const leadService = {
  parseFilters(raw: Record<string, string | string[] | undefined>): LeadFilters {
    const flat = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined])
    );
    return leadFiltersSchema.parse(flat);
  },

  list(ctx: TenantContext, filters: LeadFilters = {}) {
    const where: Prisma.LeadWhereInput = { organizationId: ctx.organizationId };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.source) where.source = filters.source;
    if (filters.created) {
      where.createdAt = { gte: subDays(new Date(), CREATED_WINDOWS[filters.created]) };
    }
    if (filters.q) {
      const contains = { contains: filters.q, mode: "insensitive" as const };
      where.OR = [
        { name: contains },
        { company: contains },
        { email: contains },
        { phone: contains },
        { description: contains },
      ];
    }
    return prisma.lead.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 500,
    });
  },

  count(ctx: TenantContext) {
    return prisma.lead.count({ where: { organizationId: ctx.organizationId } });
  },

  async get(ctx: TenantContext, id: string) {
    const lead = await prisma.lead.findFirst({
      where: { id: idSchema.parse(id), organizationId: ctx.organizationId },
      include: {
        customer: { select: { id: true, name: true } },
        quotations: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            quotationNumber: true,
            title: true,
            status: true,
            total: true,
            currency: true,
            issueDate: true,
          },
        },
        followUps: { orderBy: { dueDate: "asc" } },
        notes: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });
    if (!lead) throw new NotFoundError("Lead");
    return lead;
  },

  async create(ctx: TenantContext, input: unknown) {
    const data = leadInputSchema.parse(input);
    const { followUpTask, nextFollowUpAt, ...leadData } = data;

    return prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          ...leadData,
          organizationId: ctx.organizationId,
          assignedUserId: ctx.userId,
          nextFollowUpAt,
        },
      });
      await activityService.log(tx, ctx, {
        type: "LEAD_CREATED",
        description: `Lead created from ${SOURCE_LABELS[leadData.source]}`,
        leadId: lead.id,
      });
      if (nextFollowUpAt) {
        const task = followUpTask ?? `Follow up with ${lead.name}`;
        await tx.followUp.create({
          data: {
            organizationId: ctx.organizationId,
            leadId: lead.id,
            task,
            dueDate: nextFollowUpAt,
            priority: lead.priority,
          },
        });
        await activityService.log(tx, ctx, {
          type: "FOLLOW_UP_SCHEDULED",
          description: `Follow-up scheduled: ${task}`,
          leadId: lead.id,
        });
      }
      return lead;
    });
  },

  async update(ctx: TenantContext, id: string, input: unknown) {
    const existing = await findOwned(ctx, id);
    const data = leadUpdateSchema.parse(input);

    return prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({ where: { id: existing.id }, data });
      await activityService.log(tx, ctx, {
        type: "LEAD_UPDATED",
        description: "Lead details updated",
        leadId: lead.id,
        customerId: lead.convertedCustomerId,
      });
      if (existing.status !== lead.status) {
        await activityService.log(tx, ctx, {
          type: "STATUS_CHANGED",
          description: `Status changed from ${LEAD_STATUS_META[existing.status].label} to ${LEAD_STATUS_META[lead.status].label}`,
          leadId: lead.id,
          customerId: lead.convertedCustomerId,
          metadata: { from: existing.status, to: lead.status },
        });
      }
      return lead;
    });
  },

  async changeStatus(ctx: TenantContext, id: string, rawStatus: unknown) {
    const status = z.nativeEnum(LeadStatus).parse(rawStatus);
    const existing = await findOwned(ctx, id);
    if (existing.status === status) return existing;

    return prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id: existing.id },
        data: {
          status,
          ...(status === "CONTACTED" && !existing.lastContactAt
            ? { lastContactAt: new Date() }
            : {}),
        },
      });
      await activityService.log(tx, ctx, {
        type: "STATUS_CHANGED",
        description: `Status changed from ${LEAD_STATUS_META[existing.status].label} to ${LEAD_STATUS_META[status].label}`,
        leadId: lead.id,
        customerId: lead.convertedCustomerId,
        metadata: { from: existing.status, to: status },
      });
      return lead;
    });
  },

  async markContacted(ctx: TenantContext, id: string) {
    const existing = await findOwned(ctx, id);
    return prisma.lead.update({ where: { id: existing.id }, data: { lastContactAt: new Date() } });
  },

  async remove(ctx: TenantContext, id: string) {
    const existing = await findOwned(ctx, id);
    await prisma.$transaction([
      // Quotations are business records; keep them and detach from the lead.
      prisma.quotation.updateMany({
        where: { leadId: existing.id, organizationId: ctx.organizationId },
        data: { leadId: null },
      }),
      prisma.lead.delete({ where: { id: existing.id } }),
    ]);
    return existing;
  },

  /**
   * Converts a WON lead into a Customer and re-links the lead's quotations,
   * follow-ups, activities, and notes so the relationship history carries over.
   * Idempotent: returns the existing customer if already converted.
   */
  async convertToCustomer(ctx: TenantContext, id: string) {
    const lead = await findOwned(ctx, id);
    if (lead.convertedCustomerId) {
      const existing = await prisma.customer.findFirst({
        where: { id: lead.convertedCustomerId, organizationId: ctx.organizationId },
      });
      if (existing) return existing;
    }
    if (lead.status !== "WON") {
      throw new AppError(
        "Only won leads can be converted to customers. Mark the lead as won first."
      );
    }

    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          organizationId: ctx.organizationId,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
        },
      });
      await tx.lead.update({ where: { id: lead.id }, data: { convertedCustomerId: customer.id } });

      const scope = { leadId: lead.id, organizationId: ctx.organizationId };
      await tx.quotation.updateMany({
        where: { ...scope, customerId: null },
        data: { customerId: customer.id },
      });
      await tx.followUp.updateMany({
        where: { ...scope, customerId: null },
        data: { customerId: customer.id },
      });
      await tx.activity.updateMany({
        where: { ...scope, customerId: null },
        data: { customerId: customer.id },
      });
      await tx.note.updateMany({
        where: { ...scope, customerId: null },
        data: { customerId: customer.id },
      });

      await activityService.log(tx, ctx, {
        type: "CUSTOMER_CREATED",
        description: `Converted to customer from won lead`,
        leadId: lead.id,
        customerId: customer.id,
      });
      return customer;
    });
  },
};
