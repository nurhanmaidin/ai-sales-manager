import { describe, expect, it } from "vitest";
import {
  calculateTotals,
  formatQuotationNumber,
  lineTotal,
  nextQuotationNumber,
} from "@/lib/quotations/calculations";
import { formatMoney } from "@/lib/utils/format";

describe("quotation calculations", () => {
  it("computes line totals, subtotal, discount, tax and total", () => {
    const t = calculateTotals(
      [
        { quantity: 120, unitPrice: 85 }, // 10,200
        { quantity: 1, unitPrice: 2600 }, // 2,600
      ],
      800,
      8
    );
    expect(t.lines.map((l) => l.total)).toEqual([10200, 2600]);
    expect(t.subtotal).toBe(12800);
    expect(t.discount).toBe(800);
    expect(t.taxableAmount).toBe(12000);
    expect(t.tax).toBe(960);
    expect(t.total).toBe(12960);
  });

  it("avoids floating point drift", () => {
    const t = calculateTotals([
      { quantity: 3, unitPrice: 0.1 },
      { quantity: 1, unitPrice: 0.2 },
    ]);
    expect(t.subtotal).toBe(0.5);
    expect(lineTotal(12.5, 9.99)).toBe(124.88);
  });

  it("clamps discount to the subtotal and tax rate to 0–100", () => {
    const t = calculateTotals([{ quantity: 1, unitPrice: 100 }], 500, 150);
    expect(t.discount).toBe(100);
    expect(t.total).toBe(0);
    expect(calculateTotals([{ quantity: 1, unitPrice: 100 }], -50, -5).total).toBe(100);
  });

  it("rounds tax to the nearest sen", () => {
    const t = calculateTotals([{ quantity: 1, unitPrice: 99.99 }], 0, 6);
    expect(t.tax).toBe(6);
    expect(t.total).toBe(105.99);
  });

  it("handles an empty quotation", () => {
    expect(calculateTotals([]).total).toBe(0);
  });

  it("generates sequential quotation numbers per year", () => {
    expect(formatQuotationNumber(2026, 7)).toBe("QT-2026-0007");
    expect(nextQuotationNumber(["QT-2026-0001", "QT-2026-0009", "QT-2025-0044"], 2026)).toBe(
      "QT-2026-0010"
    );
    expect(nextQuotationNumber([], 2027)).toBe("QT-2027-0001");
  });

  it("formats MYR as RM 12,800.00", () => {
    expect(formatMoney(12800)).toBe("RM 12,800.00");
    expect(formatMoney("1234.5")).toBe("RM 1,234.50");
    expect(formatMoney(null)).toBe("RM 0.00");
  });
});
