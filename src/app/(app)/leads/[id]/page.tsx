import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  Building2,
  CalendarClock,
  CalendarPlus,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  UserCheck,
  Wallet,
} from "lucide-react";
import { requireTenantPage, getWorkspace } from "@/lib/auth/context";
import { leadService } from "@/lib/leads/service";
import { activityService } from "@/lib/activities/service";
import { NotFoundError } from "@/lib/errors";
import { SOURCE_LABELS } from "@/lib/constants";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatRelative,
  toNumber,
} from "@/lib/utils/format";
import { telLink, whatsappLink } from "@/lib/utils/contact";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toDateTimeLocal } from "@/lib/utils/dates";
import {
  LeadStatusBadge,
  PriorityIndicator,
  QuotationStatusBadge,
  SourceLabel,
} from "@/components/crm/badges";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { DetailList, DetailRow } from "@/components/crm/detail-list";
import { NotesPanel } from "@/components/crm/notes-panel";
import { ConvertBanner, LeadActions } from "@/components/leads/lead-actions";
import { StatusStepper } from "@/components/leads/status-stepper";
import { AddFollowUpButton } from "@/components/followups/add-followup-button";
import { FollowUpRow } from "@/components/followups/followup-row";
import { toFollowUpRow } from "@/components/followups/followup-mapper";
import { AIResponseWorkspace } from "@/components/ai/ai-response-workspace";
import { AISuggestionsPanel } from "@/components/ai/ai-suggestions-panel";

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  const ctx = await requireTenantPage();
  try {
    const lead = await leadService.get(ctx, id);
    const activities = await activityService.listForLead(ctx, lead.id);
    return { lead, activities };
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const { lead } = await load(id);
  return { title: lead.name };
}

export default async function LeadDetailPage({ params }: Params) {
  const { id } = await params;
  const [{ lead, activities }, workspace] = await Promise.all([load(id), getWorkspace()]);
  const currency = workspace?.organization.currency ?? "MYR";

  const openFollowUps = lead.followUps.filter(
    (f) => f.status === "PENDING" || f.status === "SNOOZED"
  );
  const wa = whatsappLink(lead.phone);
  const tel = telLink(lead.phone);

  return (
    <div className="space-y-6">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Leads
      </Link>

      {/* Header */}
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={lead.name} size="xl" className="hidden sm:inline-flex" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
            <p className="mt-0.5 text-md text-muted-foreground">
              {[lead.company, `Added ${formatRelative(lead.createdAt)}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <LeadStatusBadge status={lead.status} />
              <PriorityIndicator priority={lead.priority} />
              <SourceLabel source={lead.source} />
              {lead.customer && (
                <Link href={`/customers/${lead.customer.id}`}>
                  <Badge tone="success">
                    <UserCheck className="size-3" aria-hidden /> Customer
                  </Badge>
                </Link>
              )}
            </div>
          </div>
        </div>
        <LeadActions
          currency={currency}
          lead={{
            id: lead.id,
            name: lead.name,
            status: lead.status,
            convertedCustomerId: lead.convertedCustomerId,
            company: lead.company ?? "",
            email: lead.email ?? "",
            phone: lead.phone ?? "",
            source: lead.source,
            description: lead.description ?? "",
            estimatedValue: lead.estimatedValue ? toNumber(lead.estimatedValue).toFixed(2) : "",
            priority: lead.priority,
            nextFollowUpAt: toDateTimeLocal(lead.nextFollowUpAt),
          }}
        />
      </header>

      <Card className="px-4 py-3">
        <StatusStepper leadId={lead.id} status={lead.status} />
      </Card>

      {lead.status === "WON" && !lead.convertedCustomerId && (
        <ConvertBanner leadId={lead.id} name={lead.name} />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Enquiry"
              description={`Received via ${SOURCE_LABELS[lead.source]} · ${formatDate(lead.createdAt)}`}
            />
            <CardBody>
              {lead.description ? (
                <blockquote className="whitespace-pre-wrap rounded-lg border-l-2 border-primary/30 bg-canvas px-4 py-3 text-md leading-relaxed text-foreground">
                  {lead.description}
                </blockquote>
              ) : (
                <p className="rounded-lg border border-dashed px-4 py-4 text-sm text-muted-foreground">
                  No enquiry text yet. Edit the lead and paste the customer&apos;s message so AI can
                  help you reply.
                </p>
              )}
            </CardBody>
          </Card>

          <AIResponseWorkspace
            leadId={lead.id}
            hasEnquiry={Boolean(lead.description)}
            phone={lead.phone}
          />

          <Card>
            <Tabs defaultValue="activity">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <TabsList>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="notes">
                    Notes
                    {lead.notes.length > 0 && (
                      <span className="text-subtle">{lead.notes.length}</span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="activity" className="mt-0 px-5 py-5">
                <ActivityTimeline activities={activities} />
              </TabsContent>
              <TabsContent value="notes" className="mt-0 px-5 py-5">
                <NotesPanel
                  leadId={lead.id}
                  notes={lead.notes.map((n) => ({
                    id: n.id,
                    content: n.content,
                    createdAt: n.createdAt.toISOString(),
                    author: n.user?.name ?? n.user?.email ?? "Team member",
                  }))}
                />
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Side column */}
        <aside className="space-y-6">
          <AISuggestionsPanel leadId={lead.id} />

          <Card>
            <CardHeader title="Contact" />
            <CardBody className="space-y-4">
              <DetailList>
                <DetailRow label="Phone" icon={<Phone />}>
                  {lead.phone ?? <span className="text-subtle">—</span>}
                </DetailRow>
                <DetailRow label="Email" icon={<Mail />}>
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="hover:text-primary hover:underline">
                      {lead.email}
                    </a>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </DetailRow>
                <DetailRow label="Company" icon={<Building2 />}>
                  {lead.company ?? <span className="text-subtle">—</span>}
                </DetailRow>
              </DetailList>
              {(wa || tel) && (
                <div className="grid grid-cols-2 gap-2">
                  {wa && (
                    <Button asChild variant="secondary" size="sm">
                      <a href={wa} target="_blank" rel="noopener noreferrer">
                        <MessageCircle aria-hidden /> WhatsApp
                      </a>
                    </Button>
                  )}
                  {tel && (
                    <Button asChild variant="secondary" size="sm">
                      <a href={tel}>
                        <Phone aria-hidden /> Call
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Opportunity" />
            <CardBody>
              <DetailList>
                <DetailRow label="Estimated value" icon={<Wallet />}>
                  <span className="tabular font-medium">
                    {lead.estimatedValue ? (
                      formatMoney(lead.estimatedValue, currency)
                    ) : (
                      <span className="font-normal text-subtle">Not set</span>
                    )}
                  </span>
                </DetailRow>
                <DetailRow label="Last contact" icon={<CalendarClock />}>
                  {lead.lastContactAt ? (
                    <span title={formatDateTime(lead.lastContactAt)}>
                      {formatRelative(lead.lastContactAt)}
                    </span>
                  ) : (
                    <span className="text-subtle">Not yet</span>
                  )}
                </DetailRow>
                <DetailRow label="Next follow-up" icon={<BellRing />}>
                  {lead.nextFollowUpAt ? (
                    formatDateTime(lead.nextFollowUpAt)
                  ) : (
                    <span className="text-subtle">None</span>
                  )}
                </DetailRow>
                <DetailRow label="Created" icon={<CalendarPlus />}>
                  {formatDate(lead.createdAt)}
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Follow-ups"
              action={
                <AddFollowUpButton
                  leadId={lead.id}
                  iconOnly
                  label="Add follow-up"
                  variant="ghost"
                />
              }
            />
            {openFollowUps.length === 0 ? (
              <CardBody>
                <EmptyState
                  compact
                  icon={<BellRing />}
                  title="No follow-up scheduled"
                  description="Leads with a next step are far more likely to close."
                  action={
                    <AddFollowUpButton
                      leadId={lead.id}
                      label="Schedule follow-up"
                      defaultTask={`Follow up with ${lead.name}`}
                    />
                  }
                  className="py-4"
                />
              </CardBody>
            ) : (
              <div className="divide-y px-5 pb-2">
                {openFollowUps.map((f) => (
                  <FollowUpRow key={f.id} item={toFollowUpRow(f)} showContact={false} dense />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Quotations"
              action={
                lead.quotations.length > 0 ? (
                  <Button asChild variant="ghost" size="icon-sm" aria-label="Create quotation">
                    <Link href={`/quotations/new?leadId=${lead.id}`}>
                      <FileText />
                    </Link>
                  </Button>
                ) : undefined
              }
            />
            {lead.quotations.length === 0 ? (
              <CardBody>
                <EmptyState
                  compact
                  icon={<FileText />}
                  title="No quotations yet"
                  description="Turn this enquiry into a professional quotation."
                  action={
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/quotations/new?leadId=${lead.id}`}>Create quotation</Link>
                    </Button>
                  }
                  className="py-4"
                />
              </CardBody>
            ) : (
              <ul className="divide-y px-5 pb-2">
                {lead.quotations.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={`/quotations/${q.id}`}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-canvas"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{q.quotationNumber}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {q.title ?? formatDate(q.issueDate)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="tabular text-sm font-medium">
                          {formatMoney(q.total, q.currency)}
                        </span>
                        <QuotationStatusBadge status={q.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
