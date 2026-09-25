"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/context";
import { getAIProvider } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { quotationService } from "@/lib/quotations/service";
import { runAction } from "./action";

function revalidateQuotation(q: { id: string; leadId: string | null; customerId: string | null }) {
  revalidatePath("/quotations");
  revalidatePath(`/quotations/${q.id}`);
  revalidatePath("/dashboard");
  if (q.leadId) revalidatePath(`/leads/${q.leadId}`);
  if (q.customerId) revalidatePath(`/customers/${q.customerId}`);
}

export async function createQuotationAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const q = await quotationService.create(ctx, input);
    revalidateQuotation(q);
    return { id: q.id, quotationNumber: q.quotationNumber };
  });
}

export async function updateQuotationAction(id: string, input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const q = await quotationService.update(ctx, id, input);
    revalidateQuotation(q);
    return { id: q.id };
  });
}

export async function changeQuotationStatusAction(id: string, status: string) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const q = await quotationService.changeStatus(ctx, id, status);
    revalidateQuotation(q);
    return { status: q.status };
  });
}

export async function duplicateQuotationAction(id: string) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const q = await quotationService.duplicate(ctx, id);
    revalidateQuotation(q);
    return { id: q.id };
  });
}

export async function deleteQuotationAction(id: string) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const q = await quotationService.remove(ctx, id);
    revalidateQuotation(q);
  });
}

/** AI-written line item description from a short hint, e.g. "kitchen cabinets". */
export async function suggestItemDescriptionAction(hint: string) {
  return runAction(async () => {
    const ctx = await requireTenant();
    if (!rateLimit(`ai:${ctx.userId}`, 30, 60_000).ok) {
      throw new AppError("You're generating a lot quickly — please wait a moment.", "RATE_LIMITED");
    }
    const itemHint = z
      .string()
      .trim()
      .min(2, "Type a few words first, e.g. “kitchen cabinets”.")
      .max(200)
      .parse(hint);
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: ctx.organizationId },
      select: { businessType: true },
    });
    return getAIProvider().generateQuotationDescription({
      itemHint,
      businessType: org.businessType,
    });
  });
}
