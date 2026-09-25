"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/context";
import { organizationService } from "@/lib/organizations/service";
import { runAction } from "./action";

export async function completeOnboardingAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    await organizationService.completeOnboarding(ctx, input);
    revalidatePath("/", "layout");
  });
}

export async function updateOrganizationProfileAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    await organizationService.updateProfile(ctx, input);
    revalidatePath("/", "layout");
  });
}
