import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getWorkspace } from "@/lib/auth/context";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { Logo } from "@/components/brand";

export const metadata: Metadata = { title: "Set up your workspace" };

export default async function OnboardingPage() {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/login");
  if (workspace.organization.onboardingCompletedAt) redirect("/dashboard");

  const { organization: org, user } = workspace;
  const hasPlaceholderName = org.name.endsWith("'s Business");

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-16 items-center px-6 sm:px-10">
        <Logo href="/onboarding" />
      </header>
      <main className="flex flex-1 justify-center px-4 pb-16 pt-6 sm:pt-12">
        <OnboardingFlow
          defaults={{
            name: hasPlaceholderName ? "" : org.name,
            businessType: org.businessType ?? "",
            ownerName: org.ownerName ?? user.name ?? "",
            phone: org.phone ?? "",
            email: org.email ?? user.email,
            country: org.country || "Malaysia",
            currency: org.currency || "MYR",
            description: org.description ?? "",
          }}
        />
      </main>
    </div>
  );
}
