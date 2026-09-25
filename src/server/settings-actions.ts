"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/context";
import { accountService } from "@/lib/account/service";
import { getAIProvider } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { runAction } from "./action";

export async function updateAccountProfileAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    await accountService.updateProfile(ctx, input);
    revalidatePath("/", "layout");
  });
}

export async function changePasswordAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    if (!rateLimit(`password:${ctx.userId}`, 5, 10 * 60_000).ok) {
      throw new AppError("Too many attempts. Please try again in a few minutes.", "RATE_LIMITED");
    }
    await accountService.changePassword(ctx, input);
  });
}

export async function updateNotificationPrefsAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const prefs = await accountService.updateNotificationPrefs(ctx, input);
    revalidatePath("/", "layout");
    return prefs;
  });
}

/** Runs a real request through the configured AI provider to confirm it works. */
export async function testAIConnectionAction() {
  return runAction(async () => {
    const ctx = await requireTenant();
    if (!rateLimit(`ai:${ctx.userId}`, 30, 60_000).ok) {
      throw new AppError("Please wait a moment before testing again.", "RATE_LIMITED");
    }
    const provider = getAIProvider();
    const started = Date.now();
    const result = await provider.generateLeadReply({
      leadName: "Test Customer",
      businessName: "your business",
      enquiryText: "Hi, how much to renovate a 100 sqft bathroom? Budget RM15k.",
    });
    return { provider: provider.name, ms: Date.now() - started, sample: result.summary };
  });
}
