import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { accountService, DEFAULT_NOTIFICATION_PREFS } from "@/lib/account/service";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { exportCsv, toCsv } from "@/lib/export/service";
import { leadService } from "@/lib/leads/service";
import { AppError } from "@/lib/errors";
import { createTenant } from "./helpers";

describe("accountService", () => {
  it("changes the password only when the current password is correct", async () => {
    const ctx = await createTenant("Password Co");
    await prisma.user.update({
      where: { id: ctx.userId },
      data: { passwordHash: await hashPassword("OldPass123") },
    });

    await expect(
      accountService.changePassword(ctx, {
        currentPassword: "wrong",
        newPassword: "NewPass456",
        confirmPassword: "NewPass456",
      })
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      accountService.changePassword(ctx, {
        currentPassword: "OldPass123",
        newPassword: "NewPass456",
        confirmPassword: "Mismatch1",
      })
    ).rejects.toThrow();

    await accountService.changePassword(ctx, {
      currentPassword: "OldPass123",
      newPassword: "NewPass456",
      confirmPassword: "NewPass456",
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    expect(user.passwordHash).not.toContain("NewPass456");
    expect(await verifyPassword("NewPass456", user.passwordHash!)).toBe(true);
  });

  it("stores notification preferences with safe defaults", async () => {
    const ctx = await createTenant("Prefs Co");
    expect(await accountService.getNotificationPrefs(ctx.userId)).toEqual(
      DEFAULT_NOTIFICATION_PREFS
    );
    await accountService.updateNotificationPrefs(ctx, {
      navBadge: false,
      dashboardInsights: true,
      overdueBanner: true,
    });
    expect((await accountService.getNotificationPrefs(ctx.userId)).navBadge).toBe(false);
  });
});

describe("CSV export", () => {
  it("escapes quotes, commas and newlines, and neutralises spreadsheet formulas", () => {
    const csv = toCsv(
      [{ a: 'He said "hi", ok', b: '=HYPERLINK("x")', c: "line1\nline2" }],
      ["a", "b", "c"]
    );
    expect(csv.split("\r\n")[0]).toBe("a,b,c");
    expect(csv).toContain('"He said ""hi"", ok"');
    expect(csv).toContain('"\'=HYPERLINK(""x"")"');
    expect(csv).toContain('"line1\nline2"');
  });

  it("exports only the organization's own records", async () => {
    const a = await createTenant("Export A");
    const b = await createTenant("Export B");
    await leadService.create(a, { name: "Only In A", estimatedValue: 1234.5 });
    expect(await exportCsv(a, "leads")).toContain("Only In A");
    expect(await exportCsv(a, "leads")).toContain("1234.50");
    expect(await exportCsv(b, "leads")).not.toContain("Only In A");
  });
});
