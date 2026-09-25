import { addDays, addHours, addWeeks, endOfDay, setHours, setMinutes, startOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { activityService } from "@/lib/activities/service";
import { NotFoundError } from "@/lib/errors";
import {
  followUpInputSchema,
  followUpUpdateSchema,
  idSchema,
  snoozeSchema,
} from "@/lib/validators/crm";

type Db = Prisma.TransactionClient | typeof prisma;

export type FollowUpView = "today" | "upcoming" | "overdue" | "completed";

const OPEN = { in: ["PENDING", "SNOOZED"] as ("PENDING" | "SNOOZED")[] };

export function followUpViewWhere(view: FollowUpView, now = new Date()): Prisma.FollowUpWhereInput {
  switch (view) {
    case "overdue":
      return { status: OPEN, dueDate: { lt: startOfDay(now) } };
    case "today":
      return { status: OPEN, dueDate: { gte: startOfDay(now), lte: endOfDay(now) } };
    case "upcoming":
      return { status: OPEN, dueDate: { gt: endOfDay(now) } };
    case "completed":
      return { status: "COMPLETED" };
  }
}

/** Computes the new due date for a snooze preset. */
export function snoozeUntil(preset: "1h" | "tomorrow" | "3d" | "1w", now = new Date()) {
  const morning = (d: Date) => setMinutes(setHours(d, 9), 0);
  switch (preset) {
    case "1h":
      return addHours(now, 1);
    case "tomorrow":
      return morning(addDays(now, 1));
    case "3d":
      return morning(addDays(now, 3));
    case "1w":
      return morning(addWeeks(now, 1));
  }
}

/** Keeps Lead.nextFollowUpAt in sync with its earliest open follow-up. */
async function syncLeadNextFollowUp(db: Db, leadId: string | null) {
  if (!leadId) return;
  const next = await db.followUp.findFirst({
    where: { leadId, status: OPEN },
    orderBy: { dueDate: "asc" },
    select: { dueDate: true },
  });
  await db.lead.update({ where: { id: leadId }, data: { nextFollowUpAt: next?.dueDate ?? null } });
}

async function findOwned(ctx: TenantContext, id: string) {
  const followUp = await prisma.followUp.findFirst({
    where: { id: idSchema.parse(id), organizationId: ctx.organizationId },
  });
  if (!followUp) throw new NotFoundError("Follow-up");
  return followUp;
}

const listInclude = {
  lead: { select: { id: true, name: true, company: true, phone: true, status: true } },
  customer: { select: { id: true, name: true, company: true, phone: true } },
} as const;

export const followUpService = {
  list(ctx: TenantContext, view: FollowUpView, take = 200) {
    return prisma.followUp.findMany({
      where: { organizationId: ctx.organizationId, ...followUpViewWhere(view) },
      include: listInclude,
      orderBy: view === "completed" ? { completedAt: "desc" } : { dueDate: "asc" },
      take,
    });
  },

  async counts(ctx: TenantContext) {
    const base = { organizationId: ctx.organizationId };
    const [today, upcoming, overdue, completed] = await Promise.all([
      prisma.followUp.count({ where: { ...base, ...followUpViewWhere("today") } }),
      prisma.followUp.count({ where: { ...base, ...followUpViewWhere("upcoming") } }),
      prisma.followUp.count({ where: { ...base, ...followUpViewWhere("overdue") } }),
      prisma.followUp.count({ where: { ...base, ...followUpViewWhere("completed") } }),
    ]);
    return { today, upcoming, overdue, completed };
  },

  /** Open follow-ups due within the next `days` days (including overdue). */
  upcomingWindow(ctx: TenantContext, days = 7, take = 6) {
    return prisma.followUp.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: OPEN,
        dueDate: { lte: endOfDay(addDays(new Date(), days)) },
      },
      include: listInclude,
      orderBy: { dueDate: "asc" },
      take,
    });
  },

  async create(ctx: TenantContext, input: unknown) {
    const data = followUpInputSchema.parse(input);

    let leadId: string | null = null;
    let customerId: string | null = null;
    if (data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: data.leadId, organizationId: ctx.organizationId },
        select: { id: true, convertedCustomerId: true },
      });
      if (!lead) throw new NotFoundError("Lead");
      leadId = lead.id;
      customerId = lead.convertedCustomerId;
    }
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!customer) throw new NotFoundError("Customer");
      customerId = customer.id;
    }

    return prisma.$transaction(async (tx) => {
      const followUp = await tx.followUp.create({
        data: {
          organizationId: ctx.organizationId,
          task: data.task,
          dueDate: data.dueDate,
          priority: data.priority,
          leadId,
          customerId,
        },
      });
      await syncLeadNextFollowUp(tx, leadId);
      await activityService.log(tx, ctx, {
        type: "FOLLOW_UP_SCHEDULED",
        description: `Follow-up scheduled: ${data.task}`,
        leadId,
        customerId,
      });
      return followUp;
    });
  },

  async update(ctx: TenantContext, id: string, input: unknown) {
    const existing = await findOwned(ctx, id);
    const data = followUpUpdateSchema.parse(input);
    return prisma.$transaction(async (tx) => {
      const followUp = await tx.followUp.update({ where: { id: existing.id }, data });
      await syncLeadNextFollowUp(tx, existing.leadId);
      return followUp;
    });
  },

  async complete(ctx: TenantContext, id: string) {
    const existing = await findOwned(ctx, id);
    if (existing.status === "COMPLETED") return existing;
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const followUp = await tx.followUp.update({
        where: { id: existing.id },
        data: { status: "COMPLETED", completedAt: now },
      });
      if (existing.leadId) {
        await tx.lead.update({ where: { id: existing.leadId }, data: { lastContactAt: now } });
      }
      await syncLeadNextFollowUp(tx, existing.leadId);
      await activityService.log(tx, ctx, {
        type: "FOLLOW_UP_COMPLETED",
        description: `Follow-up completed: ${existing.task}`,
        leadId: existing.leadId,
        customerId: existing.customerId,
      });
      return followUp;
    });
  },

  async reopen(ctx: TenantContext, id: string) {
    const existing = await findOwned(ctx, id);
    return prisma.$transaction(async (tx) => {
      const followUp = await tx.followUp.update({
        where: { id: existing.id },
        data: { status: "PENDING", completedAt: null },
      });
      await syncLeadNextFollowUp(tx, existing.leadId);
      return followUp;
    });
  },

  async snooze(ctx: TenantContext, id: string, input: unknown) {
    const existing = await findOwned(ctx, id);
    const { preset } = snoozeSchema.parse(input);
    return prisma.$transaction(async (tx) => {
      const followUp = await tx.followUp.update({
        where: { id: existing.id },
        data: { status: "SNOOZED", dueDate: snoozeUntil(preset) },
      });
      await syncLeadNextFollowUp(tx, existing.leadId);
      return followUp;
    });
  },

  async remove(ctx: TenantContext, id: string) {
    const existing = await findOwned(ctx, id);
    await prisma.$transaction(async (tx) => {
      await tx.followUp.delete({ where: { id: existing.id } });
      await syncLeadNextFollowUp(tx, existing.leadId);
    });
    return existing;
  },
};
