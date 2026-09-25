import { cache } from "react";
import { redirect } from "next/navigation";
import type { OrgRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { auth } from "./index";

export { canManageOrganization } from "./permissions";

/**
 * The only source of truth for "which organization is this request acting
 * on". Always derived from the session's user → OrganizationMember; never
 * from client input.
 */
export interface TenantContext {
  userId: string;
  organizationId: string;
  role: OrgRole;
}

export const getSessionUserId = cache(async (): Promise<string | null> => {
  const session = await auth();
  return session?.user?.id ?? null;
});

const loadMembership = cache(async (userId: string) =>
  prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { organization: true, user: { select: { id: true, name: true, email: true } } },
  })
);

export async function getTenantContext(): Promise<TenantContext | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const membership = await loadMembership(userId);
  if (!membership) return null;
  return { userId, organizationId: membership.organizationId, role: membership.role };
}

/** For pages/layouts: redirects to login when unauthenticated. */
export async function requireTenantPage(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** For server actions / route handlers: throws a safe error when unauthenticated. */
export async function requireTenant(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) throw new AppError("Your session has expired. Please sign in again.", "UNAUTHORIZED");
  return ctx;
}

/** Current user + organization for rendering the app shell. */
export async function getWorkspace() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const membership = await loadMembership(userId);
  if (!membership) return null;
  return {
    user: membership.user,
    organization: membership.organization,
    role: membership.role,
  };
}
