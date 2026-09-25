import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  Building2,
  FilePlus2,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Trophy,
  Users,
} from "lucide-react";
import { requireTenantPage, getWorkspace } from "@/lib/auth/context";
import { customerService } from "@/lib/customers/service";
import { activityService } from "@/lib/activities/service";
import { noteService } from "@/lib/notes/service";
import { NotFoundError } from "@/lib/errors";
import { formatDate, formatMoney, toNumber } from "@/lib/utils/format";
import { telLink, whatsappLink } from "@/lib/utils/contact";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadStatusBadge, QuotationStatusBadge } from "@/components/crm/badges";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { DetailList, DetailRow } from "@/components/crm/detail-list";
import { NotesPanel } from "@/components/crm/notes-panel";
import { CustomerFormButton } from "@/components/customers/customer-form-dialog";
import { AddFollowUpButton } from "@/components/followups/add-followup-button";
import { FollowUpRow } from "@/components/followups/followup-row";
import { toFollowUpRow } from "@/components/followups/followup-mapper";

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  const ctx = await requireTenantPage();
  try {
    const customer = await customerService.get(ctx, id);
    const [activities, notes] = await Promise.all([
      activityService.listForCustomer(ctx, customer.id),
      noteService.listForCustomer(ctx, customer.id),
    ]);
    return { customer, activities, notes };
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const { customer } = await load(id);
  return { title: customer.name };
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

export default async function CustomerDetailPage({ params }: Params) {
  const { id } = await params;
  const [{ customer, activities, notes }, workspace] = await Promise.all([
    load(id),
    getWorkspace(),
  ]);
  const currency = workspace?.organization.currency ?? "MYR";

  const accepted = customer.quotations.filter((q) => q.status === "ACCEPTED");
  const pending = customer.quotations.filter((q) => q.status === "SENT" || q.status === "VIEWED");
  const lifetime = accepted.reduce((s, q) => s + toNumber(q.total), 0);
  const pendingValue = pending.reduce((s, q) => s + toNumber(q.total), 0);
  const wa = whatsappLink(customer.phone);
  const tel = telLink(customer.phone);

  // Sales history: won deals and accepted quotations, newest first.
  const history = [
    ...customer.leadsWon.map((l) => ({
      id: `lead-${l.id}`,
      date: l.createdAt,
      title: "Deal won",
      detail: l.description?.split(/[.!?]/)[0] ?? "Converted from lead",
      value: l.estimatedValue ? toNumber(l.estimatedValue) : null,
      estimate: true,
      href: `/leads/${l.id}`,
      badge: <LeadStatusBadge status={l.status} />,
    })),
    ...accepted.map((q) => ({
      id: `q-${q.id}`,
      date: q.issueDate,
      title: q.quotationNumber,
      detail: q.title ?? "Quotation accepted",
      value: toNumber(q.total),
      estimate: false,
      href: `/quotations/${q.id}`,
      badge: <QuotationStatusBadge status={q.status} />,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Customers
      </Link>

      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Avatar name={customer.name} size="xl" className="hidden sm:inline-flex" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
            <p className="mt-0.5 text-md text-muted-foreground">
              {[customer.company, `Customer since ${formatDate(customer.createdAt)}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CustomerFormButton
            customer={{
              id: customer.id,
              name: customer.name,
              company: customer.company ?? "",
              email: customer.email ?? "",
              phone: customer.phone ?? "",
              address: customer.address ?? "",
              notes: customer.notes ?? "",
            }}
          />
          <AddFollowUpButton
            customerId={customer.id}
            size="md"
            defaultTask={`Check in with ${customer.name}`}
          />
          <Button asChild>
            <Link href={`/quotations/new?customerId=${customer.id}`}>
              <FilePlus2 aria-hidden /> Create quotation
            </Link>
          </Button>
        </div>
      </header>

      <Card className="grid grid-cols-2 divide-x divide-y lg:grid-cols-4 lg:divide-y-0">
        <Stat
          label="Lifetime value"
          value={formatMoney(lifetime, currency)}
          hint="Accepted quotations"
        />
        <Stat
          label="Awaiting decision"
          value={formatMoney(pendingValue, currency)}
          hint={`${pending.length} pending`}
        />
        <Stat label="Quotations" value={String(customer.quotations.length)} />
        <Stat
          label="Won deals"
          value={String(customer.leadsWon.filter((l) => l.status === "WON").length)}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Sales history"
              description="Won deals and accepted quotations."
              icon={<Trophy />}
            />
            {history.length === 0 ? (
              <CardBody>
                <EmptyState
                  compact
                  icon={<Trophy />}
                  title="No sales recorded yet"
                  description="Accepted quotations and won deals will build this customer's history."
                />
              </CardBody>
            ) : (
              <ul className="divide-y border-t">
                {history.map((h) => (
                  <li key={h.id}>
                    <Link
                      href={h.href}
                      className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-canvas"
                    >
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">
                        {formatDate(h.date)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{h.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{h.detail}</p>
                      </div>
                      <div className="hidden sm:block">{h.badge}</div>
                      <span
                        className={`tabular w-32 text-right text-sm ${h.estimate ? "text-muted-foreground" : "font-medium"}`}
                      >
                        {h.value !== null
                          ? `${h.estimate ? "est. " : ""}${formatMoney(h.value, currency)}`
                          : "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Quotations" icon={<FileText />} />
            {customer.quotations.length === 0 ? (
              <CardBody>
                <EmptyState
                  compact
                  icon={<FileText />}
                  title="No quotations yet"
                  action={
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/quotations/new?customerId=${customer.id}`}>
                        Create quotation
                      </Link>
                    </Button>
                  }
                />
              </CardBody>
            ) : (
              <ul className="divide-y border-t">
                {customer.quotations.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={`/quotations/${q.id}`}
                      className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-canvas"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {q.quotationNumber}
                          {q.title ? ` — ${q.title}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Issued {formatDate(q.issueDate)}
                        </p>
                      </div>
                      <QuotationStatusBadge status={q.status} />
                      <span className="tabular w-28 text-right text-sm font-medium">
                        {formatMoney(q.total, q.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <Tabs defaultValue="activity">
              <div className="border-b px-5 py-3">
                <TabsList>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="notes">
                    Notes{notes.length > 0 && <span className="text-subtle">{notes.length}</span>}
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="activity" className="mt-0 px-5 py-5">
                <ActivityTimeline activities={activities} />
              </TabsContent>
              <TabsContent value="notes" className="mt-0 px-5 py-5">
                <NotesPanel
                  customerId={customer.id}
                  notes={notes.map((n) => ({
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

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Profile" />
            <CardBody className="space-y-4">
              <DetailList>
                <DetailRow label="Phone" icon={<Phone />}>
                  {customer.phone ?? <span className="text-subtle">—</span>}
                </DetailRow>
                <DetailRow label="Email" icon={<Mail />}>
                  {customer.email ? (
                    <a
                      href={`mailto:${customer.email}`}
                      className="hover:text-primary hover:underline"
                    >
                      {customer.email}
                    </a>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </DetailRow>
                <DetailRow label="Company" icon={<Building2 />}>
                  {customer.company ?? <span className="text-subtle">—</span>}
                </DetailRow>
                <DetailRow label="Address" icon={<MapPin />}>
                  <span className="whitespace-pre-line">
                    {customer.address ?? <span className="text-subtle">—</span>}
                  </span>
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
              {customer.notes && (
                <p className="whitespace-pre-wrap rounded-lg bg-canvas px-3.5 py-3 text-sm leading-relaxed text-muted-foreground">
                  {customer.notes}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Follow-ups"
              action={
                <AddFollowUpButton
                  customerId={customer.id}
                  iconOnly
                  label="Add follow-up"
                  variant="ghost"
                />
              }
            />
            {customer.followUps.length === 0 ? (
              <CardBody>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BellRing className="size-4 text-subtle" aria-hidden /> Nothing scheduled.
                </p>
              </CardBody>
            ) : (
              <div className="divide-y px-5 pb-2">
                {customer.followUps.map((f) => (
                  <FollowUpRow key={f.id} item={toFollowUpRow(f)} showContact={false} dense />
                ))}
              </div>
            )}
          </Card>

          {customer.leadsWon.length > 0 && (
            <Card>
              <CardHeader title="Origin" icon={<Users />} />
              <CardBody>
                <ul className="space-y-2">
                  {customer.leadsWon.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/leads/${l.id}`}
                        className="flex items-center justify-between gap-2 text-sm hover:text-primary"
                      >
                        <span>Converted from lead · {formatDate(l.createdAt)}</span>
                        <LeadStatusBadge status={l.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
