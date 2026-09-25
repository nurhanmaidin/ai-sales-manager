import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { activityService } from "@/lib/activities/service";
import { NotFoundError } from "@/lib/errors";
import { toNumber } from "@/lib/utils/format";
import { customerInputSchema, idSchema } from "@/lib/validators/crm";

async function findOwned(ctx: TenantContext, id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: idSchema.parse(id), organizationId: ctx.organizationId },
  });
  if (!customer) throw new NotFoundError("Customer");
  return customer;
}

export const customerService = {
  async list(ctx: TenantContext, q?: string) {
    const where: Prisma.CustomerWhereInput = { organizationId: ctx.organizationId };
    const query = q?.trim().slice(0, 80);
    if (query) {
      const contains = { contains: query, mode: "insensitive" as const };
      where.OR = [
        { name: contains },
        { company: contains },
        { email: contains },
        { phone: contains },
      ];
    }
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        quotations: { select: { status: true, total: true } },
        activities: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    return customers.map(({ quotations, activities, ...c }) => ({
      ...c,
      quotationCount: quotations.length,
      lifetimeValue: quotations
        .filter((q) => q.status === "ACCEPTED")
        .reduce((sum, q) => sum + toNumber(q.total), 0),
      lastActivityAt: activities[0]?.createdAt ?? c.updatedAt,
    }));
  },

  count(ctx: TenantContext) {
    return prisma.customer.count({ where: { organizationId: ctx.organizationId } });
  },

  async get(ctx: TenantContext, id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: idSchema.parse(id), organizationId: ctx.organizationId },
      include: {
        leadsWon: {
          select: {
            id: true,
            name: true,
            status: true,
            estimatedValue: true,
            createdAt: true,
            description: true,
          },
          orderBy: { createdAt: "desc" },
        },
        quotations: {
          orderBy: { issueDate: "desc" },
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
        followUps: {
          where: { status: { in: ["PENDING", "SNOOZED"] } },
          orderBy: { dueDate: "asc" },
        },
      },
    });
    if (!customer) throw new NotFoundError("Customer");
    return customer;
  },

  async create(ctx: TenantContext, input: unknown) {
    const data = customerInputSchema.parse(input);
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: { ...data, organizationId: ctx.organizationId },
      });
      await activityService.log(tx, ctx, {
        type: "CUSTOMER_CREATED",
        description: "Customer added",
        customerId: customer.id,
      });
      return customer;
    });
  },

  async update(ctx: TenantContext, id: string, input: unknown) {
    const existing = await findOwned(ctx, id);
    const data = customerInputSchema.parse(input);
    return prisma.customer.update({ where: { id: existing.id }, data });
  },

  /** Lightweight options for pickers (quotation builder, follow-up form). */
  options(ctx: TenantContext) {
    return prisma.customer.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true, name: true, company: true, email: true, phone: true, address: true },
      orderBy: { name: "asc" },
    });
  },
};
