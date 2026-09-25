import Link from "next/link";
import type { Lead } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { LeadStatusBadge, PriorityIndicator, SourceLabel } from "@/components/crm/badges";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatDue, formatMoney } from "@/lib/utils/format";

function FollowUpCell({ date }: { date: Date | null }) {
  if (!date) return <span className="text-subtle">—</span>;
  const overdue = date.getTime() < Date.now();
  return (
    <span className={cn("text-sm", overdue ? "font-medium text-warning" : "text-muted-foreground")}>
      {formatDue(date)}
    </span>
  );
}

export function LeadsTable({ leads, currency }: { leads: Lead[]; currency: string }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-canvas text-xs font-medium text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Lead
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Status
              </th>
              <th scope="col" className="hidden px-4 py-2.5 font-medium xl:table-cell">
                Source
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Priority
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Value
              </th>
              <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">
                Next follow-up
              </th>
              <th scope="col" className="hidden px-4 py-2.5 font-medium xl:table-cell">
                Created
              </th>
              <th scope="col" className="w-8">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.map((lead) => (
              <tr key={lead.id} className="group relative transition-colors hover:bg-canvas">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={lead.name} size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="block truncate font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none"
                      >
                        {lead.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.company ?? lead.phone ?? lead.email ?? "No contact details"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td className="hidden px-4 py-3 xl:table-cell">
                  <SourceLabel source={lead.source} />
                </td>
                <td className="px-4 py-3">
                  <PriorityIndicator priority={lead.priority} />
                </td>
                <td className="tabular px-4 py-3 text-right font-medium text-foreground">
                  {lead.estimatedValue ? (
                    formatMoney(lead.estimatedValue, currency)
                  ) : (
                    <span className="font-normal text-subtle">—</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <FollowUpCell date={lead.nextFollowUpAt} />
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground xl:table-cell">
                  {formatDate(lead.createdAt)}
                </td>
                <td className="pr-3">
                  <ChevronRight
                    className="size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link
              href={`/leads/${lead.id}`}
              className="block rounded-xl border bg-card p-4 shadow-card transition-colors active:bg-canvas"
            >
              <div className="flex items-start gap-3">
                <Avatar name={lead.name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-medium text-foreground">{lead.name}</p>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {lead.company ?? lead.phone ?? lead.email ?? "No contact details"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <PriorityIndicator priority={lead.priority} />
                    {lead.estimatedValue && (
                      <span className="tabular text-sm font-medium">
                        {formatMoney(lead.estimatedValue, currency)}
                      </span>
                    )}
                    {lead.nextFollowUpAt && <FollowUpCell date={lead.nextFollowUpAt} />}
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
