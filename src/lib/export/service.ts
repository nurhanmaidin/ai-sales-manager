import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { toNumber } from "@/lib/utils/format";

export const EXPORTABLE = ["leads", "customers", "quotations"] as const;
export type ExportEntity = (typeof EXPORTABLE)[number];

/** RFC 4180 CSV with formula-injection protection for spreadsheet apps. */
export function toCsv(rows: Record<string, unknown>[], headers: string[]) {
  const cell = (value: unknown) => {
    if (value === null || value === undefined) return "";
    let s = value instanceof Date ? value.toISOString() : String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join(
    "\r\n"
  );
}

export async function exportCsv(ctx: TenantContext, entity: ExportEntity) {
  const where = { organizationId: ctx.organizationId };
  switch (entity) {
    case "leads": {
      const rows = await prisma.lead.findMany({ where, orderBy: { createdAt: "desc" } });
      return toCsv(
        rows.map((l) => ({
          ...l,
          estimatedValue: l.estimatedValue === null ? "" : toNumber(l.estimatedValue).toFixed(2),
        })),
        [
          "name",
          "company",
          "email",
          "phone",
          "source",
          "status",
          "priority",
          "estimatedValue",
          "description",
          "lastContactAt",
          "nextFollowUpAt",
          "createdAt",
        ]
      );
    }
    case "customers": {
      const rows = await prisma.customer.findMany({ where, orderBy: { createdAt: "desc" } });
      return toCsv(rows, ["name", "company", "email", "phone", "address", "notes", "createdAt"]);
    }
    case "quotations": {
      const rows = await prisma.quotation.findMany({
        where,
        orderBy: { issueDate: "desc" },
        include: { customer: { select: { name: true } }, lead: { select: { name: true } } },
      });
      return toCsv(
        rows.map((q) => ({
          ...q,
          preparedFor: q.customer?.name ?? q.lead?.name ?? "",
          subtotal: toNumber(q.subtotal).toFixed(2),
          discount: toNumber(q.discount).toFixed(2),
          tax: toNumber(q.tax).toFixed(2),
          total: toNumber(q.total).toFixed(2),
        })),
        [
          "quotationNumber",
          "title",
          "preparedFor",
          "status",
          "issueDate",
          "expiryDate",
          "currency",
          "subtotal",
          "discount",
          "tax",
          "total",
        ]
      );
    }
  }
}
