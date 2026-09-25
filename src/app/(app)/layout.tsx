import { redirect } from "next/navigation";
import { endOfDay } from "date-fns";
import { getWorkspace } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { accountService } from "@/lib/account/service";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/login");
  if (!workspace.organization.onboardingCompletedAt) redirect("/onboarding");

  const prefs = await accountService.getNotificationPrefs(workspace.user.id);
  const followUpsDue = !prefs.navBadge
    ? 0
    : await prisma.followUp.count({
        where: {
          organizationId: workspace.organization.id,
          status: { in: ["PENDING", "SNOOZED"] },
          dueDate: { lte: endOfDay(new Date()) },
        },
      });

  return (
    <AppShell
      user={{ name: workspace.user.name, email: workspace.user.email }}
      organizationName={workspace.organization.name}
      badges={{ followUpsDue }}
    >
      {children}
    </AppShell>
  );
}
