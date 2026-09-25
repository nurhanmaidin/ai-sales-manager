import { cn } from "@/lib/utils/cn";
import { formatDate, formatMoney, initials } from "@/lib/utils/format";

export interface QuotationDocData {
  number: string | null;
  title: string | null;
  issueDate: string;
  expiryDate: string | null;
  currency: string;
  business: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    registrationNumber: string | null;
    taxInfo: string | null;
    ownerName: string | null;
  };
  recipient: {
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  items: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }[];
  totals: { subtotal: number; discount: number; taxRate: number; tax: number; total: number };
  notes: string | null;
  terms: string | null;
}

function qty(n: number) {
  return Number.isInteger(n)
    ? n.toLocaleString("en-MY")
    : n.toLocaleString("en-MY", { maximumFractionDigits: 2 });
}

/**
 * The customer-facing quotation. Sized for A4 (794px wide at 96dpi) and styled
 * for print; the builder renders it zoomed down as a live preview.
 */
export function QuotationDocument({
  data,
  className,
}: {
  data: QuotationDocData;
  className?: string;
}) {
  const { business, recipient, totals, currency } = data;
  const money = (n: number) => formatMoney(n, currency);

  return (
    <article
      className={cn(
        "print-surface mx-auto w-[794px] max-w-none bg-white px-14 py-12 text-[12.5px] leading-[1.55] text-[#141a2e] shadow-card ring-1 ring-border",
        className
      )}
      aria-label={`Quotation ${data.number ?? "draft"}`}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-8">
        <div className="flex items-start gap-3.5">
          <div
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-[15px] font-semibold text-white"
          >
            {initials(business.name)}
          </div>
          <div>
            <p className="text-[16px] font-semibold tracking-tight">{business.name}</p>
            {business.registrationNumber && (
              <p className="text-[11px] text-[#646b7d]">Reg. No. {business.registrationNumber}</p>
            )}
            {business.address && (
              <p className="mt-1 whitespace-pre-line text-[#4a5163]">{business.address}</p>
            )}
            <p className="text-[#4a5163]">
              {[business.phone, business.email, business.website].filter(Boolean).join("  ·  ")}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[24px] font-semibold tracking-[-0.02em] text-primary">QUOTATION</p>
          <p className="mt-0.5 font-medium">{data.number ?? "Draft"}</p>
        </div>
      </header>

      <div className="my-8 h-px bg-[#e4e7ee] print:my-6" />

      {/* Parties & dates */}
      <section className="grid grid-cols-[1fr_auto] gap-10">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#6b7180]">
            Prepared for
          </p>
          {recipient ? (
            <div className="mt-1.5">
              <p className="text-[14px] font-semibold">{recipient.name}</p>
              {recipient.company && <p>{recipient.company}</p>}
              {recipient.address && (
                <p className="whitespace-pre-line text-[#4a5163]">{recipient.address}</p>
              )}
              <p className="text-[#4a5163]">
                {[recipient.phone, recipient.email].filter(Boolean).join("  ·  ")}
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-[#6b7180]">Choose a customer or lead</p>
          )}
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 self-start text-right">
          <dt className="text-[#6b7180]">Issue date</dt>
          <dd className="font-medium">{formatDate(data.issueDate)}</dd>
          <dt className="text-[#6b7180]">Valid until</dt>
          <dd className="font-medium">{data.expiryDate ? formatDate(data.expiryDate) : "—"}</dd>
          <dt className="text-[#6b7180]">Currency</dt>
          <dd className="font-medium">{currency}</dd>
        </dl>
      </section>

      {data.title && (
        <h2 className="mt-8 text-[17px] font-semibold tracking-tight">{data.title}</h2>
      )}

      {/* Items */}
      <table className={cn("w-full border-collapse", data.title ? "mt-3" : "mt-8")}>
        <thead>
          <tr className="border-y border-[#e4e7ee] text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#6b7180]">
            <th className="w-8 py-2.5 pr-2 font-semibold">#</th>
            <th className="py-2.5 pr-4 font-semibold">Description</th>
            <th className="w-16 py-2.5 pr-3 text-right font-semibold">Qty</th>
            <th className="w-14 py-2.5 pr-3 font-semibold">Unit</th>
            <th className="w-28 py-2.5 pr-3 text-right font-semibold">Unit price</th>
            <th className="w-32 py-2.5 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-6 text-center text-[#6b7180]">
                Add items to see them here
              </td>
            </tr>
          ) : (
            data.items.map((item, i) => (
              <tr key={i} className="print-avoid-break border-b border-[#eef0f4] align-top">
                <td className="py-3 pr-2 text-[#6b7180]">{i + 1}</td>
                <td className="whitespace-pre-line py-3 pr-4">
                  {item.description || <span className="text-[#6b7180]">Untitled item</span>}
                </td>
                <td className="tabular py-3 pr-3 text-right">{qty(item.quantity)}</td>
                <td className="py-3 pr-3 text-[#4a5163]">{item.unit}</td>
                <td className="tabular py-3 pr-3 text-right">{money(item.unitPrice)}</td>
                <td className="tabular py-3 text-right font-medium">{money(item.total)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="print-avoid-break mt-5 flex justify-end">
        <dl className="w-72 space-y-1.5">
          <div className="flex justify-between">
            <dt className="text-[#646b7d]">Subtotal</dt>
            <dd className="tabular">{money(totals.subtotal)}</dd>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-[#646b7d]">Discount</dt>
              <dd className="tabular">− {money(totals.discount)}</dd>
            </div>
          )}
          {totals.taxRate > 0 && (
            <div className="flex justify-between">
              <dt className="text-[#646b7d]">SST ({totals.taxRate}%)</dt>
              <dd className="tabular">{money(totals.tax)}</dd>
            </div>
          )}
          <div className="!mt-3 flex items-baseline justify-between border-t border-[#141a2e] pt-3">
            <dt className="font-semibold">Total</dt>
            <dd className="tabular text-[17px] font-semibold tracking-tight">
              {money(totals.total)}
            </dd>
          </div>
        </dl>
      </div>

      {(data.notes || data.terms) && (
        <section className="print-avoid-break mt-10 grid grid-cols-2 gap-10 print:mt-7">
          {data.notes && (
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#6b7180]">
                Notes
              </p>
              <p className="mt-1.5 whitespace-pre-line text-[#4a5163]">{data.notes}</p>
            </div>
          )}
          {data.terms && (
            <div className={cn(!data.notes && "col-span-2")}>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#6b7180]">
                Terms &amp; conditions
              </p>
              <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-[#4a5163]">
                {data.terms
                  .split("\n")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => (
                    <li key={t}>{t}</li>
                  ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {/* Signatures + footer stay together when printed */}
      <div className="print-avoid-break">
        <section className="mt-14 grid grid-cols-2 gap-16 print:mt-8">
          <div>
            <div className="h-12 print:h-10" />
            <div className="border-t border-[#c9cdd6] pt-2">
              <p className="font-medium">{business.ownerName ?? business.name}</p>
              <p className="text-[11px] text-[#6b7180]">For and on behalf of {business.name}</p>
            </div>
          </div>
          <div>
            <div className="h-12 print:h-10" />
            <div className="border-t border-[#c9cdd6] pt-2">
              <p className="font-medium">Accepted by</p>
              <p className="text-[11px] text-[#6b7180]">
                Name, signature, company stamp &amp; date
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-12 flex items-center justify-between border-t border-[#eef0f4] pt-4 text-[10.5px] text-[#6b7180] print:mt-6">
          <span>Thank you for considering {business.name}.</span>
          {business.taxInfo && <span>{business.taxInfo}</span>}
        </footer>
      </div>
    </article>
  );
}
