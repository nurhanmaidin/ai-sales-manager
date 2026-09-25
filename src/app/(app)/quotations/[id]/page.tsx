import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { requireTenantPage } from "@/lib/auth/context";
import { NotFoundError } from "@/lib/errors";
import {
  EDITABLE_STATUSES,
  QUOTATION_TRANSITIONS,
  quotationService,
} from "@/lib/quotations/service";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QuotationStatusBadge } from "@/components/crm/badges";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { DetailList, DetailRow } from "@/components/crm/detail-list";
import { QuotationDocument } from "@/components/quotations/quotation-document";
import { QuotationActions } from "@/components/quotations/quotation-actions";
import { FitToWidth } from "@/components/quotations/fit-to-width";
import { toDocData } from "@/components/quotations/mappers";

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  const ctx = await requireTenantPage();
  try {
    return await quotationService.get(ctx, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const q = await load((await params).id);
  return { title: q.quotationNumber };
}

export default async function QuotationPage({ params }: Params) {
  const q = await load((await params).id);
  const editable = EDITABLE_STATUSES.includes(q.status);
  const recipient = q.customer ?? q.lead;
  const recipientHref = q.customer
    ? `/customers/${q.customer.id}`
    : q.lead
      ? `/leads/${q.lead.id}`
      : null;
  const expired =
    q.expiryDate &&
    q.expiryDate.getTime() < Date.now() &&
    (q.status === "SENT" || q.status === "VIEWED");

  return (
    <div className="space-y-6">
      <div className="no-print space-y-4">
        <Link
          href="/quotations"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Quotations
        </Link>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{q.quotationNumber}</h1>
              <QuotationStatusBadge status={q.status} />
            </div>
            <p className="mt-1 text-md text-muted-foreground">
              {[q.title, recipient?.name].filter(Boolean).join(" · ") || "Quotation"}
            </p>
          </div>
          <QuotationActions
            id={q.id}
            number={q.quotationNumber}
            status={q.status}
            transitions={QUOTATION_TRANSITIONS[q.status]}
            editable={editable}
          />
        </div>
        {expired && (
          <p className="rounded-lg border border-warning/25 bg-warning-soft px-4 py-2.5 text-sm text-warning">
            This quotation passed its valid-until date on {formatDate(q.expiryDate)}. Follow up or
            mark it as expired.
          </p>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] print:block">
        <div className="min-w-0 rounded-xl border bg-canvas p-3 sm:p-6 print:border-0 print:bg-white print:p-0">
          <div className="print:hidden">
            <FitToWidth width={794}>
              <QuotationDocument data={toDocData(q)} />
            </FitToWidth>
          </div>
          <div className="print-only">
            <QuotationDocument data={toDocData(q)} className="w-full shadow-none ring-0" />
          </div>
        </div>

        <aside className="no-print space-y-6">
          <Card>
            <CardHeader title="Summary" />
            <CardBody>
              <DetailList>
                <DetailRow label="Total">
                  <span className="tabular font-semibold">{formatMoney(q.total, q.currency)}</span>
                </DetailRow>
                <DetailRow label="Prepared for">
                  {recipient && recipientHref ? (
                    <Link
                      href={recipientHref}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {recipient.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </DetailRow>
                <DetailRow label="Issued">{formatDate(q.issueDate)}</DetailRow>
                <DetailRow label="Valid until">{formatDate(q.expiryDate)}</DetailRow>
                <DetailRow label="Items">{q.items.length}</DetailRow>
              </DetailList>
              {!editable && (
                <p className="mt-4 flex gap-2 rounded-lg bg-canvas px-3 py-2.5 text-xs text-muted-foreground">
                  <Lock className="mt-px size-3.5 shrink-0" aria-hidden />
                  {q.status.charAt(0) + q.status.slice(1).toLowerCase()} quotations are locked.
                  Duplicate it to make a revised version.
                </p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="History" />
            <CardBody>
              <ActivityTimeline activities={q.activities} />
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
