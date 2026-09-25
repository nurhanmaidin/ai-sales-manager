"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/context";
import { aiService } from "@/lib/ai/service";
import { runAction } from "./action";

export async function generateLeadReplyAction(leadId: string, variant = 0) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const result = await aiService.generateLeadReply(ctx, leadId, variant);
    revalidatePath(`/leads/${leadId}`);
    return result;
  });
}

export async function rewriteReplyAction(leadId: string, text: string, tone: string) {
  return runAction(async () => {
    const ctx = await requireTenant();
    return aiService.rewriteReply(ctx, leadId, text, tone);
  });
}

export async function askAssistantAction(question: string) {
  return runAction(async () => {
    const ctx = await requireTenant();
    return aiService.ask(ctx, question);
  });
}
