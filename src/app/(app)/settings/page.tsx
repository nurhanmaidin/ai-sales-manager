import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Building2,
  Database,
  Download,
  KeyRound,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { canManageOrganization, getWorkspace, requireTenantPage } from "@/lib/auth/context";
import { organizationService } from "@/lib/organizations/service";
import { accountService } from "@/lib/account/service";
import { getAIStatus, SUPPORTED_PROVIDERS } from "@/lib/ai";
import { prisma } from "@/lib/db/prisma";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/states";
import {
  AccountNameForm,
  AITestButton,
  BusinessProfileForm,
  NotificationsForm,
  PasswordForm,
} from "@/components/settings/settings-forms";

export const metadata: Metadata = { title: "Settings" };

const TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "business", label: "Business profile", icon: Building2 },
  { key: "team", label: "Team", icon: Users },
  { key: "ai", label: "AI", icon: Sparkles },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "data", label: "Data", icon: Database },
  { key: "account", label: "Account", icon: UserRound },
];

const PROVIDER_LABELS: Record<string, string> = {
  mock: "Built-in AI (no API key needed)",
  openai: "OpenAI",
  anthropic: "Anthropic",
  ollama: "Ollama (self-hosted)",
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await requireTenantPage();
  const workspace = await getWorkspace();
  if (!workspace) redirect("/login");
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "business";
  const org = workspace.organization;
  const canEdit = canManageOrganization(ctx.role);

  return (
    <>
      <PageHeader title="Settings" description="Manage your business, team and preferences." />
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col lg:overflow-visible"
        >
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Link
                key={t.key}
                href={`/settings?tab=${t.key}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <t.icon
                  className={cn("size-4", active ? "text-primary" : "text-subtle")}
                  aria-hidden
                />
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-6">
          {tab === "business" && (
            <Section
              title="Business profile"
              description="These details appear on your quotations and help AI write in your voice."
            >
              <BusinessProfileForm
                canEdit={canEdit}
                defaults={{
                  name: org.name,
                  businessType: org.businessType ?? "",
                  ownerName: org.ownerName ?? "",
                  phone: org.phone ?? "",
                  email: org.email ?? "",
                  website: org.website ?? "",
                  address: org.address ?? "",
                  registrationNumber: org.registrationNumber ?? "",
                  taxInfo: org.taxInfo ?? "",
                  country: org.country,
                  currency: org.currency,
                  description: org.description ?? "",
                }}
              />
            </Section>
          )}

          {tab === "team" && <TeamSection ctx={ctx} />}

          {tab === "ai" && <AISection />}

          {tab === "notifications" && (
            <Section
              title="Notifications"
              description="Choose what AI Sales Manager surfaces for you inside the app."
            >
              <NotificationsForm prefs={await accountService.getNotificationPrefs(ctx.userId)} />
              <p className="mt-4 text-sm text-muted-foreground">
                Email and WhatsApp reminders are on the roadmap and will appear here when available.
              </p>
            </Section>
          )}

          {tab === "data" && <DataSection organizationId={ctx.organizationId} />}

          {tab === "account" && (
            <>
              <Section title="Your profile">
                <AccountNameForm name={workspace.user.name ?? ""} email={workspace.user.email} />
              </Section>
              <Section
                title="Password"
                description="Use at least 8 characters with a letter and a number."
              >
                <PasswordForm />
              </Section>
            </>
          )}
        </div>
      </div>
    </>
  );
}

async function TeamSection({ ctx }: { ctx: Awaited<ReturnType<typeof requireTenantPage>> }) {
  const members = await organizationService.listMembers(ctx);
  return (
    <Section title="Team" description="People who can access this workspace.">
      <ul className="divide-y rounded-lg border">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={m.user.name ?? m.user.email} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.user.name ?? m.user.email}
                {m.userId === ctx.userId && (
                  <span className="ml-1.5 font-normal text-muted-foreground">(you)</span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {m.user.email} · joined {formatDate(m.createdAt)}
              </p>
            </div>
            <Badge tone={m.role === "OWNER" ? "primary" : "neutral"}>
              {m.role.charAt(0) + m.role.slice(1).toLowerCase()}
            </Badge>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center gap-3 rounded-lg bg-canvas px-4 py-3 text-sm text-muted-foreground">
        <Users className="size-4 shrink-0 text-subtle" aria-hidden />
        <span className="flex-1">Inviting teammates is part of the Business plan.</span>
        <Badge>Coming soon</Badge>
      </div>
    </Section>
  );
}

function AISection() {
  const status = getAIStatus();
  return (
    <Section
      title="AI"
      description="AI drafts replies, summarises enquiries and answers questions about your data."
    >
      <dl className="divide-y rounded-lg border">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted-foreground">Active provider</dt>
          <dd className="flex items-center gap-2 text-sm font-medium">
            {PROVIDER_LABELS[status.active]}
            <Badge tone="success" dot>
              Active
            </Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted-foreground">Model</dt>
          <dd className="text-sm font-medium">
            {status.active === "mock"
              ? "Built-in rules engine"
              : (status.model ?? "Provider default")}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <KeyRound className="size-3.5 text-subtle" aria-hidden /> API key
          </dt>
          <dd className="font-mono text-sm">
            {status.apiKeyConfigured ? (
              status.apiKeyHint
            ) : (
              <span className="font-sans text-muted-foreground">Not required</span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted-foreground">Cost</dt>
          <dd className="text-sm font-medium">
            {status.active === "mock" ? "RM 0 — included" : "Billed by your provider"}
          </dd>
        </div>
      </dl>

      {status.fallback && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning"
        >
          The server is configured for “{status.requested}”, which isn&apos;t available yet, so the
          built-in AI is being used.
        </p>
      )}

      <div className="mt-6 space-y-2">
        <h3 className="text-sm font-semibold">Test the connection</h3>
        <p className="text-sm text-muted-foreground">
          Sends a sample enquiry through the active provider.
        </p>
        <AITestButton />
      </div>

      <div className="mt-6 flex gap-3 rounded-lg bg-canvas px-4 py-3.5 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        <p>
          Providers are configured by your administrator on the server (
          {SUPPORTED_PROVIDERS.map((p) => PROVIDER_LABELS[p]?.split(" (")[0]).join(", ")}). API keys
          are never sent to your browser — only a masked hint is shown here.
        </p>
      </div>
    </Section>
  );
}

async function DataSection({ organizationId }: { organizationId: string }) {
  const where = { organizationId };
  const [leads, customers, quotations] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.customer.count({ where }),
    prisma.quotation.count({ where }),
  ]);
  const rows = [
    { key: "leads", label: "Leads", count: leads },
    { key: "customers", label: "Customers", count: customers },
    { key: "quotations", label: "Quotations", count: quotations },
  ];
  return (
    <Section
      title="Data"
      description="Your data belongs to you. Export it anytime as CSV (opens in Excel or Google Sheets)."
    >
      <ul className="divide-y rounded-lg border">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-xs text-muted-foreground">{r.count} records</p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/export/${r.key}`} download>
                <Download aria-hidden /> Export CSV
              </a>
            </Button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        Customer data is stored securely and only visible to your workspace. Keep it accurate and
        use it in line with Malaysia&apos;s PDPA.
      </p>
    </Section>
  );
}
