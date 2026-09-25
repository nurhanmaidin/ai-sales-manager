import type { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";

type Db = Prisma.TransactionClient | typeof prisma;

export interface ActivityInput {
  type: ActivityType;
  description: string;
  leadId?: string | null;
  customerId?: string | null;
  quotationId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

const activityInclude = { user: { select: { name: true, email: true } } } as const;

export const activityService = {
  log(db: Db, ctx: TenantContext, input: ActivityInput) {
    return db.activity.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        type: input.type,
        description: input.description,
        leadId: input.leadId ?? null,
        customerId: input.customerId ?? null,
        quotationId: input.quotationId ?? null,
        metadata: input.metadata,
      },
    });
  },

  listForLead(ctx: TenantContext, leadId: string, take = 50) {
    return prisma.activity.findMany({
      where: { organizationId: ctx.organizationId, leadId },
      include: activityInclude,
      orderBy: { createdAt: "desc" },
      take,
    });
  },

  listForCustomer(ctx: TenantContext, customerId: string, take = 50) {
    return prisma.activity.findMany({
      where: { organizationId: ctx.organizationId, customerId },
      include: activityInclude,
      orderBy: { createdAt: "desc" },
      take,
    });
  },
};
