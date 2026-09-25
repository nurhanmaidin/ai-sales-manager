// Pure quotation maths. All arithmetic is done in integer cents so totals
// never drift (0.1 + 0.2 problems), then converted back to ringgit.

export interface LineInput {
  quantity: number;
  unitPrice: number;
}

export interface QuotationTotals {
  lines: { total: number }[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxRate: number;
  tax: number;
  total: number;
}

const toCents = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100);
const fromCents = (c: number) => c / 100;

export function lineTotal(quantity: number, unitPrice: number) {
  // quantity may have 2 decimals (e.g. 12.5 sqft): cents × qty, rounded half-up.
  return fromCents(Math.round(toCents(unitPrice) * (Number.isFinite(quantity) ? quantity : 0)));
}

/**
 * @param discount flat discount amount, clamped to [0, subtotal]
 * @param taxRate percentage, e.g. 8 for 8% SST, clamped to [0, 100]
 */
export function calculateTotals(lines: LineInput[], discount = 0, taxRate = 0): QuotationTotals {
  const lineCents = lines.map((l) =>
    Math.round(toCents(l.unitPrice) * (Number.isFinite(l.quantity) ? l.quantity : 0))
  );
  const subtotalCents = lineCents.reduce((sum, c) => sum + c, 0);
  const discountCents = Math.min(Math.max(toCents(discount), 0), subtotalCents);
  const taxableCents = subtotalCents - discountCents;
  const rate = Math.min(Math.max(Number.isFinite(taxRate) ? taxRate : 0, 0), 100);
  const taxCents = Math.round((taxableCents * rate) / 100);

  return {
    lines: lineCents.map((c) => ({ total: fromCents(c) })),
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    taxableAmount: fromCents(taxableCents),
    taxRate: rate,
    tax: fromCents(taxCents),
    total: fromCents(taxableCents + taxCents),
  };
}

/** QT-2026-0007 style numbers, sequential per organization and year. */
export function formatQuotationNumber(year: number, sequence: number) {
  return `QT-${year}-${String(sequence).padStart(4, "0")}`;
}

export function nextQuotationNumber(existing: string[], year: number) {
  const prefix = `QT-${year}-`;
  const max = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)))
    .filter((n) => Number.isInteger(n))
    .reduce((m, n) => Math.max(m, n), 0);
  return formatQuotationNumber(year, max + 1);
}
