import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { canManageOrganization } from "@/lib/auth/permissions";
import { ForbiddenError } from "@/lib/errors";
import { onboardingSchema, organizationProfileSchema } from "@/lib/validators/organization";

function assertCanManage(ctx: TenantContext) {
  if (!canManageOrganization(ctx.role)) {
    throw new ForbiddenError("Only owners and admins can change business settings.");
  }
}

export const organizationService = {
  get(ctx: TenantContext) {
    return prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });
  },

  async completeOnboarding(ctx: TenantContext, input: unknown) {
    assertCanManage(ctx);
    const data = onboardingSchema.parse(input);
    return prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { ...data, onboardingCompletedAt: new Date() },
    });
  },

  async updateProfile(ctx: TenantContext, input: unknown) {
    assertCanManage(ctx);
    const data = organizationProfileSchema.parse(input);
    return prisma.organization.update({ where: { id: ctx.organizationId }, data });
  },

  listMembers(ctx: TenantContext) {
    return prisma.organizationMember.findMany({
      where: { organizationId: ctx.organizationId },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    });
  },
};
