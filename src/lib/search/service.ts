import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { LEAD_STATUS_META, QUOTATION_STATUS_META } from "@/lib/constants";
import { formatMoney } from "@/lib/utils/format";

export interface SearchResult {
  id: string;
  type: "lead" | "customer" | "quotation";
  title: string;
  subtitle: string;
  href: string;
}

export const searchService = {
  async search(ctx: TenantContext, rawQuery: string): Promise<SearchResult[]> {
    const q = rawQuery.trim().slice(0, 80);
    if (q.length < 1) return [];
    const contains = { contains: q, mode: "insensitive" as const };
    const organizationId = ctx.organizationId;

    const [leads, customers, quotations] = await Promise.all([
      prisma.lead.findMany({
        where: {
          organizationId,
          OR: [{ name: contains }, { company: contains }, { email: contains }, { phone: contains }],
        },
        select: { id: true, name: true, company: true, status: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.customer.findMany({
        where: {
          organizationId,
          OR: [{ name: contains }, { company: contains }, { email: contains }, { phone: contains }],
        },
        select: { id: true, name: true, company: true, email: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.quotation.findMany({
        where: {
          organizationId,
          OR: [
            { quotationNumber: contains },
            { title: contains },
            { customer: { name: contains } },
            { lead: { name: contains } },
          ],
        },
        select: {
          id: true,
          quotationNumber: true,
          title: true,
          total: true,
          currency: true,
          status: true,
          customer: { select: { name: true } },
          lead: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    return [
      ...leads.map((l) => ({
        id: l.id,
        type: "lead" as const,
        title: l.name,
        subtitle: [l.company, LEAD_STATUS_META[l.status].label].filter(Boolean).join(" · "),
        href: `/leads/${l.id}`,
      })),
      ...customers.map((c) => ({
        id: c.id,
        type: "customer" as const,
        title: c.name,
        subtitle: c.company ?? c.email ?? "Customer",
        href: `/customers/${c.id}`,
      })),
      ...quotations.map((q) => ({
        id: q.id,
        type: "quotation" as const,
        title: `${q.quotationNumber}${q.title ? ` — ${q.title}` : ""}`,
        subtitle: [
          q.customer?.name ?? q.lead?.name,
          formatMoney(q.total, q.currency),
          QUOTATION_STATUS_META[q.status].label,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/quotations/${q.id}`,
      })),
    ];
  },
};
