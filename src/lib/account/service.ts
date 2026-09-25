import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors";
import { registerSchema } from "@/lib/validators/auth";

export const notificationPrefsSchema = z.object({
  navBadge: z.boolean().default(true),
  dashboardInsights: z.boolean().default(true),
  overdueBanner: z.boolean().default(true),
});

export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = notificationPrefsSchema.parse({});

export const accountProfileSchema = z.object({ name: registerSchema.shape.name });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: registerSchema.shape.password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const accountService = {
  async getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    const parsed = notificationPrefsSchema.safeParse(user?.notificationPrefs ?? {});
    return parsed.success ? parsed.data : DEFAULT_NOTIFICATION_PREFS;
  },

  async updateNotificationPrefs(ctx: TenantContext, input: unknown) {
    const prefs = notificationPrefsSchema.parse(input);
    await prisma.user.update({ where: { id: ctx.userId }, data: { notificationPrefs: prefs } });
    return prefs;
  },

  async updateProfile(ctx: TenantContext, input: unknown) {
    const { name } = accountProfileSchema.parse(input);
    return prisma.user.update({ where: { id: ctx.userId }, data: { name } });
  },

  async changePassword(ctx: TenantContext, input: unknown) {
    const data = changePasswordSchema.parse(input);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    if (!user.passwordHash || !(await verifyPassword(data.currentPassword, user.passwordHash))) {
      throw new AppError("Your current password is incorrect.");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(data.newPassword) },
    });
  },
};
