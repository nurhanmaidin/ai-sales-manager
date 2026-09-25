import { z } from "zod";
import { QuotationStatus } from "@prisma/client";
import { idSchema, requiredDate } from "./crm";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const numeric = (
  label: string,
  { min = 0, max = 9_999_999 }: { min?: number; max?: number } = {}
) =>
  z
    .union([z.number(), z.string()])
    .transform((v, ctx) => {
      const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim() || "0");
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Enter a valid ${label}` });
        return z.NEVER;
      }
      return n;
    })
    .pipe(
      z
        .number()
        .min(min, `${label[0]!.toUpperCase()}${label.slice(1)} can't be less than ${min}`)
        .max(max, `${label} is too large`)
    );

export const quotationItemSchema = z.object({
  description: z.string().trim().min(1, "Describe this item").max(500),
  quantity: numeric("quantity", { min: 0.01, max: 1_000_000 }),
  unit: z.string().trim().min(1).max(20).default("unit"),
  unitPrice: numeric("unit price", { min: 0, max: 99_999_999 }),
});

export const quotationInputSchema = z
  .object({
    title: optionalText(160),
    customerId: idSchema.optional().nullable(),
    leadId: idSchema.optional().nullable(),
    issueDate: requiredDate,
    expiryDate: z
      .union([z.string(), z.date(), z.null(), z.undefined()])
      .transform((v) => (v ? new Date(v) : null))
      .refine((d) => d === null || !Number.isNaN(d.getTime()), "Enter a valid date"),
    discount: numeric("discount", { min: 0, max: 99_999_999 }).default(0),
    taxRate: numeric("tax rate", { min: 0, max: 100 }).default(0),
    notes: optionalText(4000),
    terms: optionalText(4000),
    status: z.enum(["DRAFT", "SENT"]).default("DRAFT"),
    items: z
      .array(quotationItemSchema)
      .min(1, "Add at least one item")
      .max(100, "A quotation can have up to 100 items"),
  })
  .refine((q) => Boolean(q.customerId) || Boolean(q.leadId), {
    message: "Choose who this quotation is for",
    path: ["recipient"],
  })
  .refine((q) => !q.expiryDate || q.expiryDate >= new Date(q.issueDate.toDateString()), {
    message: "Valid-until date must be on or after the issue date",
    path: ["expiryDate"],
  });

export const quotationFiltersSchema = z.object({
  status: z.nativeEnum(QuotationStatus).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
});

export type QuotationInput = z.input<typeof quotationInputSchema>;
