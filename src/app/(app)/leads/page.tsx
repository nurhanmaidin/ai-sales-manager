import type { Metadata } from "next";
import { SearchX, Users } from "lucide-react";
import { requireTenantPage, getWorkspace } from "@/lib/auth/context";
import { leadService } from "@/lib/leads/service";
import { OPEN_LEAD_STATUSES } from "@/lib/constants";
import { formatMoney, pluralize, toNumber } from "@/lib/utils/format";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { AddLeadButton } from "@/components/leads/add-lead-button";
import { LeadsToolbar } from "@/components/leads/leads-toolbar";
import { LeadsTable } from "@/components/leads/leads-table";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireTenantPage();
  const workspace = await getWorkspace();
  const currency = workspace?.organization.currency ?? "MYR";
  const filters = leadService.parseFilters(await searchParams);
  const [leads, total] = await Promise.all([
    leadService.list(ctx, filters),
    leadService.count(ctx),
  ]);

  const open = leads.filter((l) => OPEN_LEAD_STATUSES.includes(l.status));
  const openValue = open.reduce((sum, l) => sum + toNumber(l.estimatedValue), 0);

  return (
    <>
      <PageHeader
        title="Leads"
        description={
          total === 0
            ? "Every enquiry, in one place."
            : `${pluralize(open.length, "open lead")} · ${formatMoney(openValue, currency)} in the pipeline`
        }
        actions={<AddLeadButton currency={currency} autoOpen />}
      />

      {total === 0 ? (
        <div className="rounded-xl border border-dashed bg-canvas/50">
          <EmptyState
            icon={<Users />}
            title="Your pipeline starts here"
            description="Paste a WhatsApp or website enquiry and AI will help you understand it, draft a reply, and remind you to follow up."
            action={<AddLeadButton currency={currency} label="Add your first lead" />}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <LeadsToolbar />
          {leads.length === 0 ? (
            <div className="rounded-xl border bg-card">
              <EmptyState
                icon={<SearchX />}
                title="No leads match these filters"
                description="Try a different search term or clear the filters."
              />
            </div>
          ) : (
            <>
              <LeadsTable leads={leads} currency={currency} />
              <p className="text-xs text-muted-foreground">
                Showing {pluralize(leads.length, "lead")}
                {leads.length !== total && ` of ${total}`}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
