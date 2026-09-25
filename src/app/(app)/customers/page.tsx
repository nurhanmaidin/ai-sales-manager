import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, SearchX, UserRound } from "lucide-react";
import { requireTenantPage, getWorkspace } from "@/lib/auth/context";
import { customerService } from "@/lib/customers/service";
import { formatMoney, formatRelative, pluralize } from "@/lib/utils/format";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { SearchInput } from "@/components/ui/search-input";
import { CustomerFormButton } from "@/components/customers/customer-form-dialog";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireTenantPage();
  const { q } = await searchParams;
  const [customers, total, workspace] = await Promise.all([
    customerService.list(ctx, q),
    customerService.count(ctx),
    getWorkspace(),
  ]);
  const currency = workspace?.organization.currency ?? "MYR";
  const lifetime = customers.reduce((sum, c) => sum + c.lifetimeValue, 0);

  return (
    <>
      <PageHeader
        title="Customers"
        description={
          total === 0
            ? "The people and businesses you've won."
            : `${pluralize(total, "customer")} · ${formatMoney(lifetime, currency)} in accepted quotations`
        }
        actions={<CustomerFormButton />}
      />

      {total === 0 ? (
        <div className="rounded-xl border border-dashed bg-canvas/50">
          <EmptyState
            icon={<UserRound />}
            title="No customers yet"
            description="When you win a lead, convert it to a customer and their full history comes with them."
            action={
              <>
                <Button asChild>
                  <Link href="/leads?status=WON">View won leads</Link>
                </Button>
                <CustomerFormButton variant="secondary" label="Add customer manually" />
              </>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          <SearchInput
            placeholder="Search customers…"
            label="Search customers"
            className="sm:w-80"
          />
          {customers.length === 0 ? (
            <div className="rounded-xl border bg-card">
              <EmptyState
                icon={<SearchX />}
                title="No customers match your search"
                description="Try a name, company, phone or email."
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-card">
              <table className="w-full text-left text-sm">
                <thead className="hidden border-b bg-canvas text-xs text-muted-foreground md:table-header-group">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Customer
                    </th>
                    <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">
                      Contact
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      Quotations
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      Lifetime value
                    </th>
                    <th scope="col" className="hidden px-4 py-2.5 font-medium xl:table-cell">
                      Last activity
                    </th>
                    <th scope="col" className="w-8">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className="group relative flex flex-wrap items-center gap-x-4 px-4 py-3 transition-colors hover:bg-canvas md:table-row md:p-0"
                    >
                      <td className="min-w-0 flex-1 md:px-4 md:py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} size="sm" />
                          <div className="min-w-0">
                            <Link
                              href={`/customers/${c.id}`}
                              className="block truncate font-medium after:absolute after:inset-0 focus-visible:outline-none"
                            >
                              {c.name}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.company ?? c.phone ?? c.email ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        <p className="truncate">{c.phone ?? "—"}</p>
                        <p className="truncate text-xs">{c.email ?? ""}</p>
                      </td>
                      <td className="tabular hidden text-right text-muted-foreground md:table-cell md:px-4 md:py-3">
                        {c.quotationCount}
                      </td>
                      <td className="tabular text-right font-medium md:px-4 md:py-3">
                        {formatMoney(c.lifetimeValue, currency)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground xl:table-cell">
                        {formatRelative(c.lastActivityAt)}
                      </td>
                      <td className="hidden pr-3 md:table-cell">
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
          )}
        </div>
      )}
    </>
  );
}
