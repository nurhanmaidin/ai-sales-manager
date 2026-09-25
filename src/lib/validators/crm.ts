import { z } from "zod";
import { LeadPriority, LeadSource, LeadStatus } from "@prisma/client";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(160)
  .optional()
  .nullable()
  .refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email address")
  .transform((v) => (v ? v : null));

const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .optional()
  .nullable()
  .refine((v) => !v || /^\+?[0-9][0-9\s-]{6,18}$/.test(v), "Enter a valid phone number")
  .transform((v) => (v ? v : null));

/** Accepts "", null, numbers or numeric strings (with commas) and yields number | null. */
export const optionalMoney = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid amount" });
      return z.NEVER;
    }
    if (n > 9_999_999_999) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount is too large" });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });

const optionalDate = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid date" });
      return z.NEVER;
    }
    return d;
  });

export const requiredDate = z.union([z.string(), z.date()]).transform((v, ctx) => {
  const d = new Date(v);
  if (!v || Number.isNaN(d.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a date" });
    return z.NEVER;
  }
  return d;
});

export const idSchema = z.string().min(1).max(64);

export const leadInputSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer's name").max(120),
  company: optionalText(120),
  email: optionalEmail,
  phone: optionalPhone,
  source: z.nativeEnum(LeadSource).default("OTHER"),
  description: optionalText(5000),
  estimatedValue: optionalMoney,
  status: z.nativeEnum(LeadStatus).default("NEW"),
  priority: z.nativeEnum(LeadPriority).default("MEDIUM"),
  nextFollowUpAt: optionalDate,
  followUpTask: optionalText(200),
});

export const leadUpdateSchema = leadInputSchema.omit({ followUpTask: true, nextFollowUpAt: true });

export const leadFiltersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  status: z.nativeEnum(LeadStatus).optional().catch(undefined),
  priority: z.nativeEnum(LeadPriority).optional().catch(undefined),
  source: z.nativeEnum(LeadSource).optional().catch(undefined),
  created: z.enum(["7d", "30d", "90d"]).optional().catch(undefined),
});

export const customerInputSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer's name").max(120),
  company: optionalText(120),
  email: optionalEmail,
  phone: optionalPhone,
  address: optionalText(500),
  notes: optionalText(5000),
});

export const noteInputSchema = z
  .object({
    content: z.string().trim().min(1, "Write something first").max(5000),
    leadId: idSchema.optional(),
    customerId: idSchema.optional(),
  })
  .refine((v) => Boolean(v.leadId) !== Boolean(v.customerId), {
    message: "A note must belong to exactly one lead or customer",
  });

export const followUpInputSchema = z
  .object({
    task: z.string().trim().min(2, "Describe the follow-up").max(200),
    dueDate: requiredDate,
    priority: z.nativeEnum(LeadPriority).default("MEDIUM"),
    leadId: idSchema.optional().nullable(),
    customerId: idSchema.optional().nullable(),
  })
  .refine((v) => Boolean(v.leadId) || Boolean(v.customerId), {
    message: "Choose a lead or customer for this follow-up",
    path: ["leadId"],
  });

export const followUpUpdateSchema = z.object({
  task: z.string().trim().min(2, "Describe the follow-up").max(200),
  dueDate: requiredDate,
  priority: z.nativeEnum(LeadPriority),
});

export const snoozeSchema = z.object({
  preset: z.enum(["1h", "tomorrow", "3d", "1w"]),
});

export type LeadInput = z.input<typeof leadInputSchema>;
export type LeadUpdateInput = z.input<typeof leadUpdateSchema>;
export type LeadFilters = z.infer<typeof leadFiltersSchema>;
export type CustomerInput = z.input<typeof customerInputSchema>;
export type FollowUpInput = z.input<typeof followUpInputSchema>;
