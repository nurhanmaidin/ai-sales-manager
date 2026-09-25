import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import type { RegisterInput } from "@/lib/validators/auth";
import { hashPassword } from "./password";

export const accountService = {
  /**
   * Creates the user, their organization, and an OWNER membership in one
   * transaction. The organization is completed during onboarding.
   */
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError("An account with this email already exists.", "CONFLICT");

    const passwordHash = await hashPassword(input.password);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: input.name, email: input.email, passwordHash },
      });
      const organization = await tx.organization.create({
        data: {
          name: `${input.name.split(" ")[0]}'s Business`,
          ownerName: input.name,
          email: input.email,
        },
      });
      await tx.organizationMember.create({
        data: { userId: user.id, organizationId: organization.id, role: "OWNER" },
      });
      return { user, organization };
    });
  },
};
