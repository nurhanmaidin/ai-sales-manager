import { Prisma, QuotationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { activityService } from "@/lib/activities/service";
import { LEAD_STATUS_META, OPEN_LEAD_STATUSES, QUOTATION_STATUS_META } from "@/lib/constants";
import { AppError, NotFoundError } from "@/lib/errors";
import { idSchema } from "@/lib/validators/crm";
import { quotationFiltersSchema, quotationInputSchema } from "@/lib/validators/quotation";
import { calculateTotals, nextQuotationNumber } from "./calculations";

/** Allowed status transitions — the quotation lifecycle. */
export const QUOTATION_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["VIEWED", "ACCEPTED", "REJECTED", "EXPIRED", "DRAFT"],
  VIEWED: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["SENT"],
  REJECTED: ["SENT"],
  EXPIRED: ["SENT"],
};

export const EDITABLE_STATUSES: QuotationStatus[] = ["DRAFT", "SENT", "VIEWED"];

export function canTransition(from: QuotationStatus, to: QuotationStatus) {
  return QUOTATION_TRANSITIONS[from].includes(to);
}

const LEAD_STAGE_ORDER = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

async function findOwned(ctx: TenantContext, id: string) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: idSchema.parse(id), organizationId: ctx.organizationId },
  });
  if (!quotation) throw new NotFoundError("Quotation");
  return quotation;
}

/** Resolves recipient ids inside the tenant; a converted lead also links its customer. */
async function resolveRecipient(
  ctx: TenantContext,
  customerId?: string | null,
  leadId?: string | null
) {
  let resolvedLeadId: string | null = null;
  let resolvedCustomerId: string | null = null;
  if (leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: ctx.organizationId },
      select: { id: true, convertedCustomerId: true },
    });
    if (!lead) throw new NotFoundError("Lead");
    resolvedLeadId = lead.id;
    resolvedCustomerId = lead.convertedCustomerId;
  }
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundError("Customer");
    resolvedCustomerId = customer.id;
  }
  return { leadId: resolvedLeadId, customerId: resolvedCustomerId };
}

/** Moves a lead forward when its quotation is sent or accepted (never backwards). */
async function advanceLead(
  tx: Prisma.TransactionClient,
  ctx: TenantContext,
  leadId: string | null,
  target: "QUOTATION_SENT" | "WON"
) {
  if (!leadId) return;
  const lead = await tx.lead.findUnique({ where: { id: leadId } });
  if (!lead || !OPEN_LEAD_STATUSES.includes(lead.status)) return;
  if (LEAD_STAGE_ORDER.indexOf(lead.status) >= LEAD_STAGE_ORDER.indexOf(target)) return;
  await tx.lead.update({
    where: { id: leadId },
    data: { status: target, lastContactAt: new Date() },
  });
  await activityService.log(tx, ctx, {
    type: "STATUS_CHANGED",
    description: `Status changed from ${LEAD_STATUS_META[lead.status].label} to ${LEAD_STATUS_META[target].label}`,
    leadId,
    customerId: lead.convertedCustomerId,
    metadata: { from: lead.status, to: target },
  });
}

function itemRows(
  items: { description: string; quantity: number; unit: string; unitPrice: number }[],
  totals: ReturnType<typeof calculateTotals>
) {
  return items.map((item, i) => ({
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    total: totals.lines[i]!.total,
    sortOrder: i,
  }));
}

const listSelect = {
  id: true,
  quotationNumber: true,
  title: true,
  status: true,
  total: true,
  currency: true,
  issueDate: true,
  expiryDate: true,
  customer: { select: { id: true, name: true, company: true } },
  lead: { select: { id: true, name: true, company: true } },
} satisfies Prisma.QuotationSelect;

export const quotationService = {
  calculateTotals,

  parseFilters(raw: Record<string, string | string[] | undefined>) {
    const flat = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined])
    );
    return quotationFiltersSchema.parse(flat);
  },

  list(ctx: TenantContext, filters: z.infer<typeof quotationFiltersSchema> = {}) {
    const where: Prisma.QuotationWhereInput = { organizationId: ctx.organizationId };
    if (filters.status) where.status = filters.status;
    if (filters.q) {
      const contains = { contains: filters.q, mode: "insensitive" as const };
      where.OR = [
        { quotationNumber: contains },
        { title: contains },
        { customer: { name: contains } },
        { lead: { name: contains } },
      ];
    }
    return prisma.quotation.findMany({
      where,
      select: listSelect,
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: 500,
    });
  },

  async statusCounts(ctx: TenantContext) {
    const groups = await prisma.quotation.groupBy({
      by: ["status"],
      where: { organizationId: ctx.organizationId },
      _count: { _all: true },
      _sum: { total: true },
    });
    return groups;
  },

  async get(ctx: TenantContext, id: string) {
    const quotation = await prisma.quotation.findFirst({
      where: { id: idSchema.parse(id), organizationId: ctx.organizationId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        customer: true,
        lead: true,
        organization: true,
        activities: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });
    if (!quotation) throw new NotFoundError("Quotation");
    return quotation;
  },

  async create(ctx: TenantContext, input: unknown) {
    const data = quotationInputSchema.parse(input);
    const recipient = await resolveRecipient(ctx, data.customerId, data.leadId);
    const totals = calculateTotals(data.items, data.discount, data.taxRate);
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: ctx.organizationId },
      select: { currency: true },
    });

    // Retry on the rare race where two quotations claim the same number.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const year = data.issueDate.getFullYear();
          const existing = await tx.quotation.findMany({
            where: {
              organizationId: ctx.organizationId,
              quotationNumber: { startsWith: `QT-${year}-` },
            },
            select: { quotationNumber: true },
          });
          const quotation = await tx.quotation.create({
            data: {
              organizationId: ctx.organizationId,
              quotationNumber: nextQuotationNumber(
                existing.map((e) => e.quotationNumber),
                year
              ),
              title: data.title,
              customerId: recipient.customerId,
              leadId: recipient.leadId,
              issueDate: data.issueDate,
              expiryDate: data.expiryDate,
              subtotal: totals.subtotal,
              discount: totals.discount,
              taxRate: totals.taxRate,
              tax: totals.tax,
              total: totals.total,
              currency: org.currency,
              notes: data.notes,
              terms: data.terms,
              status: data.status,
              items: { create: itemRows(data.items, totals) },
            },
          });
          await activityService.log(tx, ctx, {
            type: "QUOTATION_CREATED",
            description: `Quotation ${quotation.quotationNumber} created`,
            leadId: recipient.leadId,
            customerId: recipient.customerId,
            quotationId: quotation.id,
          });
          if (data.status === "SENT")
            await advanceLead(tx, ctx, recipient.leadId, "QUOTATION_SENT");
          return quotation;
        });
      } catch (error) {
        const conflict =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!conflict || attempt === 2) throw error;
      }
    }
    throw new AppError("Couldn't assign a quotation number. Please try again.");
  },

  async update(ctx: TenantContext, id: string, input: unknown) {
    const existing = await findOwned(ctx, id);
    if (!EDITABLE_STATUSES.includes(existing.status)) {
      throw new AppError(
        `${QUOTATION_STATUS_META[existing.status].label} quotations are locked. Duplicate it to make a revised version.`
      );
    }
    const data = quotationInputSchema.parse(input);
    const recipient = await resolveRecipient(ctx, data.customerId, data.leadId);
    const totals = calculateTotals(data.items, data.discount, data.taxRate);

    return prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: existing.id } });
      const nextStatus = existing.status === "DRAFT" ? data.status : existing.status;
      const quotation = await tx.quotation.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          customerId: recipient.customerId,
          leadId: recipient.leadId,
          issueDate: data.issueDate,
          expiryDate: data.expiryDate,
          subtotal: totals.subtotal,
          discount: totals.discount,
          taxRate: totals.taxRate,
          tax: totals.tax,
          total: totals.total,
          notes: data.notes,
          terms: data.terms,
          status: nextStatus,
          items: { create: itemRows(data.items, totals) },
        },
      });
      if (existing.status === "DRAFT" && nextStatus === "SENT") {
        await activityService.log(tx, ctx, {
          type: "QUOTATION_STATUS_CHANGED",
          description: `Quotation ${quotation.quotationNumber} marked as sent`,
          leadId: recipient.leadId,
          customerId: recipient.customerId,
          quotationId: quotation.id,
        });
        await advanceLead(tx, ctx, recipient.leadId, "QUOTATION_SENT");
      }
      return quotation;
    });
  },

  async changeStatus(ctx: TenantContext, id: string, rawStatus: unknown) {
    const status = z.nativeEnum(QuotationStatus).parse(rawStatus);
    const existing = await findOwned(ctx, id);
    if (existing.status === status) return existing;
    if (!canTransition(existing.status, status)) {
      throw new AppError(
        `A ${QUOTATION_STATUS_META[existing.status].label.toLowerCase()} quotation can't be marked as ${QUOTATION_STATUS_META[status].label.toLowerCase()}.`
      );
    }
    return prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.update({ where: { id: existing.id }, data: { status } });
      await activityService.log(tx, ctx, {
        type: "QUOTATION_STATUS_CHANGED",
        description: `Quotation ${quotation.quotationNumber} marked as ${QUOTATION_STATUS_META[status].label.toLowerCase()}`,
        leadId: quotation.leadId,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        metadata: { from: existing.status, to: status },
      });
      if (status === "SENT") await advanceLead(tx, ctx, quotation.leadId, "QUOTATION_SENT");
      if (status === "ACCEPTED") await advanceLead(tx, ctx, quotation.leadId, "WON");
      return quotation;
    });
  },

  async duplicate(ctx: TenantContext, id: string) {
    const source = await prisma.quotation.findFirst({
      where: { id: idSchema.parse(id), organizationId: ctx.organizationId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!source) throw new NotFoundError("Quotation");
    const issueDate = new Date();
    const validity = source.expiryDate
      ? source.expiryDate.getTime() - source.issueDate.getTime()
      : 30 * 86_400_000;
    return this.create(ctx, {
      title: source.title ? `${source.title} (revised)` : null,
      customerId: source.customerId,
      leadId: source.leadId,
      issueDate,
      expiryDate: new Date(issueDate.getTime() + validity),
      discount: Number(source.discount),
      taxRate: Number(source.taxRate),
      notes: source.notes,
      terms: source.terms,
      status: "DRAFT",
      items: source.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
      })),
    });
  },

  async remove(ctx: TenantContext, id: string) {
    const existing = await findOwned(ctx, id);
    await prisma.quotation.delete({ where: { id: existing.id } });
    return existing;
  },

  /** Recipients for the builder: customers and open leads, tenant-scoped. */
  async recipientOptions(ctx: TenantContext) {
    const [customers, leads] = await Promise.all([
      prisma.customer.findMany({
        where: { organizationId: ctx.organizationId },
        select: { id: true, name: true, company: true, email: true, phone: true, address: true },
        orderBy: { name: "asc" },
      }),
      prisma.lead.findMany({
        where: {
          organizationId: ctx.organizationId,
          convertedCustomerId: null,
          status: { not: "LOST" },
        },
        select: {
          id: true,
          name: true,
          company: true,
          email: true,
          phone: true,
          description: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { customers, leads };
  },
};
