import type { OrgRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";

let counter = 0;

/** Creates an isolated user + organization + membership and returns its context. */
export async function createTenant(
  name = "Test Org",
  role: OrgRole = "OWNER"
): Promise<TenantContext> {
  counter += 1;
  const user = await prisma.user.create({
    data: {
      name: `${name} Owner`,
      email: `owner-${Date.now()}-${counter}-${Math.random().toString(36).slice(2)}@test.local`,
    },
  });
  const org = await prisma.organization.create({
    data: {
      name,
      onboardingCompletedAt: new Date(),
      members: { create: { userId: user.id, role } },
    },
  });
  return { userId: user.id, organizationId: org.id, role };
}
