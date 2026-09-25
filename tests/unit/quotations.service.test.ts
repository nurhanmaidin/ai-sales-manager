import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { leadService } from "@/lib/leads/service";
import { canTransition, quotationService } from "@/lib/quotations/service";
import { AppError, NotFoundError } from "@/lib/errors";
import { createTenant } from "./helpers";

let ctx: TenantContext;
let leadId: string;

const baseInput = () => ({
  leadId,
  issueDate: new Date().toISOString(),
  expiryDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  discount: "800",
  taxRate: "8",
  items: [
    { description: "Kitchen cabinets", quantity: "120", unit: "sqft", unitPrice: "85" },
    { description: "Countertop", quantity: 1, unit: "lot", unitPrice: 2600 },
  ],
});

beforeAll(async () => {
  ctx = await createTenant("Quotation Co");
  leadId = (await leadService.create(ctx, { name: "Lim Mei Ling" })).id;
});

describe("quotationService", () => {
  it("computes totals on the server and ignores client-supplied totals", async () => {
    const q = await quotationService.create(ctx, { ...baseInput(), total: 1, subtotal: 1 });
    expect(Number(q.subtotal)).toBe(12800);
    expect(Number(q.discount)).toBe(800);
    expect(Number(q.tax)).toBe(960);
    expect(Number(q.total)).toBe(12960);
    expect(q.currency).toBe("MYR");
    const items = await prisma.quotationItem.findMany({
      where: { quotationId: q.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(items.map((i) => Number(i.total))).toEqual([10200, 2600]);
  });

  it("numbers quotations sequentially per organization", async () => {
    const year = new Date().getFullYear();
    const a = await quotationService.create(ctx, baseInput());
    const b = await quotationService.create(ctx, baseInput());
    const seq = (n: string) => Number(n.split("-")[2]);
    expect(a.quotationNumber.startsWith(`QT-${year}-`)).toBe(true);
    expect(seq(b.quotationNumber)).toBe(seq(a.quotationNumber) + 1);

    const other = await createTenant("Other Quotation Co");
    const otherLead = await leadService.create(other, { name: "Someone" });
    const first = await quotationService.create(other, { ...baseInput(), leadId: otherLead.id });
    expect(first.quotationNumber).toBe(`QT-${year}-0001`);
  });

  it("validates items and recipient", async () => {
    await expect(quotationService.create(ctx, { ...baseInput(), items: [] })).rejects.toThrow();
    await expect(quotationService.create(ctx, { ...baseInput(), leadId: null })).rejects.toThrow();
    await expect(
      quotationService.create(ctx, {
        ...baseInput(),
        items: [{ description: "x", quantity: "-1", unit: "unit", unitPrice: "5" }],
      })
    ).rejects.toThrow();
  });

  it("enforces the status lifecycle and advances the lead", async () => {
    const q = await quotationService.create(ctx, baseInput());
    expect(q.status).toBe("DRAFT");
    await expect(quotationService.changeStatus(ctx, q.id, "ACCEPTED")).rejects.toBeInstanceOf(
      AppError
    );

    await quotationService.changeStatus(ctx, q.id, "SENT");
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: leadId } })).status).toBe(
      "QUOTATION_SENT"
    );

    await quotationService.changeStatus(ctx, q.id, "VIEWED");
    await quotationService.changeStatus(ctx, q.id, "ACCEPTED");
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: leadId } })).status).toBe("WON");

    const activity = await prisma.activity.findMany({
      where: { quotationId: q.id, type: "QUOTATION_STATUS_CHANGED" },
    });
    expect(activity).toHaveLength(3);

    expect(canTransition("DRAFT", "SENT")).toBe(true);
    expect(canTransition("ACCEPTED", "REJECTED")).toBe(false);
  });

  it("locks accepted quotations and duplicates them as drafts", async () => {
    const q = await quotationService.create(ctx, { ...baseInput(), status: "SENT" });
    await quotationService.changeStatus(ctx, q.id, "ACCEPTED");
    await expect(quotationService.update(ctx, q.id, baseInput())).rejects.toBeInstanceOf(AppError);

    const copy = await quotationService.duplicate(ctx, q.id);
    expect(copy.status).toBe("DRAFT");
    expect(copy.quotationNumber).not.toBe(q.quotationNumber);
    expect(Number(copy.total)).toBe(Number(q.total));
  });

  it("replaces items and recalculates on update", async () => {
    const q = await quotationService.create(ctx, baseInput());
    const updated = await quotationService.update(ctx, q.id, {
      ...baseInput(),
      discount: 0,
      taxRate: 0,
      items: [{ description: "Painting", quantity: 2, unit: "day", unitPrice: 450 }],
    });
    expect(Number(updated.total)).toBe(900);
    expect(await prisma.quotationItem.count({ where: { quotationId: q.id } })).toBe(1);
  });

  it("is isolated per organization", async () => {
    const q = await quotationService.create(ctx, baseInput());
    const intruder = await createTenant("Intruder Co");
    await expect(quotationService.get(intruder, q.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(quotationService.changeStatus(intruder, q.id, "SENT")).rejects.toBeInstanceOf(
      NotFoundError
    );
    await expect(quotationService.remove(intruder, q.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(quotationService.create(intruder, baseInput())).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(await quotationService.list(intruder)).toHaveLength(0);
  });
});
