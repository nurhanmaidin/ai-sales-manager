import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FilePlus2, FileText, SearchX } from "lucide-react";
import type { QuotationStatus } from "@prisma/client";
import { getWorkspace, requireTenantPage } from "@/lib/auth/context";
import { quotationService } from "@/lib/quotations/service";
import { QUOTATION_STATUSES, QUOTATION_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatMoney, toNumber } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { SearchInput } from "@/components/ui/search-input";
import { QuotationStatusBadge } from "@/components/crm/badges";

export const metadata: Metadata = { title: "Quotations" };

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireTenantPage();
  const raw = await searchParams;
  const filters = quotationService.parseFilters(raw);
  const [quotations, groups, workspace] = await Promise.all([
    quotationService.list(ctx, filters),
    quotationService.statusCounts(ctx),
    getWorkspace(),
  ]);
  const currency = workspace?.organization.currency ?? "MYR";

  const count = (s: QuotationStatus) => groups.find((g) => g.status === s)?._count._all ?? 0;
  const sum = (statuses: QuotationStatus[]) =>
    groups
      .filter((g) => statuses.includes(g.status))
      .reduce((s, g) => s + toNumber(g._sum.total), 0);
  const total = groups.reduce((s, g) => s + g._count._all, 0);

  const tabHref = (status?: QuotationStatus) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (filters.q) params.set("q", filters.q);
    return params.size ? `/quotations?${params}` : "/quotations";
  };

  const newButton = (
    <Button asChild>
      <Link href="/quotations/new">
        <FilePlus2 aria-hidden /> New quotation
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Create, send and track every quotation."
        actions={newButton}
      />

      {total === 0 ? (
        <div className="rounded-xl border border-dashed bg-canvas/50">
          <EmptyState
            icon={<FileText />}
            title="Send your first quotation"
            description="Build a professional quotation in minutes — totals, SST and a print-ready layout are handled for you."
            action={newButton}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <Card className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              {
                label: "Awaiting decision",
                value: sum(["SENT", "VIEWED"]),
                hint: `${count("SENT") + count("VIEWED")} sent or viewed`,
              },
              {
                label: "Accepted",
                value: sum(["ACCEPTED"]),
                hint: `${count("ACCEPTED")} quotations`,
              },
              { label: "Drafts", value: sum(["DRAFT"]), hint: `${count("DRAFT")} not sent yet` },
            ].map((s) => (
              <div key={s.label} className="px-5 py-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="tabular mt-1 text-xl font-semibold tracking-tight">
                  {formatMoney(s.value, currency)}
                </p>
                <p className="text-xs text-subtle">{s.hint}</p>
              </div>
            ))}
          </Card>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav
              aria-label="Filter by status"
              className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
            >
              {[undefined, ...QUOTATION_STATUSES].map((s) => {
                const active = filters.status === s;
                const n = s ? count(s) : total;
                return (
                  <Link
                    key={s ?? "all"}
                    href={tabHref(s)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {s ? QUOTATION_STATUS_META[s].label : "All"}
                    <span
                      className={cn(
                        "tabular text-xs",
                        active ? "text-background/70" : "text-subtle"
                      )}
                    >
                      {n}
                    </span>
                  </Link>
                );
              })}
            </nav>
            <SearchInput
              placeholder="Search number, title or customer…"
              label="Search quotations"
              className="lg:w-72"
            />
          </div>

          {quotations.length === 0 ? (
            <div className="rounded-xl border bg-card">
              <EmptyState
                icon={<SearchX />}
                title="No quotations here"
                description="Try another status or search term."
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-card">
              <table className="w-full text-left text-sm">
                <thead className="hidden border-b bg-canvas text-xs text-muted-foreground md:table-header-group">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Quotation
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Prepared for
                    </th>
                    <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">
                      Issued
                    </th>
                    <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">
                      Valid until
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      Total
                    </th>
                    <th scope="col" className="w-8">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quotations.map((q) => {
                    const who = q.customer ?? q.lead;
                    const overdue =
                      q.expiryDate &&
                      q.expiryDate.getTime() < Date.now() &&
                      (q.status === "SENT" || q.status === "VIEWED");
                    return (
                      <tr
                        key={q.id}
                        className="group relative flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-canvas md:table-row md:p-0"
                      >
                        <td className="min-w-0 flex-1 md:px-4 md:py-3">
                          <Link
                            href={`/quotations/${q.id}`}
                            className="block font-medium after:absolute after:inset-0 focus-visible:outline-none"
                          >
                            {q.quotationNumber}
                          </Link>
                          <p className="max-w-[260px] truncate text-xs text-muted-foreground">
                            {q.title ?? "Untitled"}
                          </p>
                        </td>
                        <td className="order-last w-full text-muted-foreground md:order-none md:w-auto md:px-4 md:py-3">
                          <span className="text-foreground">{who?.name ?? "—"}</span>
                          {who?.company && (
                            <span className="hidden text-xs text-muted-foreground xl:block">
                              {who.company}
                            </span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                          {formatDate(q.issueDate)}
                        </td>
                        <td
                          className={cn(
                            "hidden px-4 py-3 lg:table-cell",
                            overdue ? "font-medium text-warning" : "text-muted-foreground"
                          )}
                        >
                          {formatDate(q.expiryDate)}
                        </td>
                        <td className="md:px-4 md:py-3">
                          <QuotationStatusBadge status={q.status} />
                        </td>
                        <td className="tabular text-right font-medium md:px-4 md:py-3">
                          {formatMoney(q.total, q.currency)}
                        </td>
                        <td className="hidden pr-3 md:table-cell">
                          <ChevronRight
                            className="size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
