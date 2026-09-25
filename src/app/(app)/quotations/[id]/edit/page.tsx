import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireTenantPage } from "@/lib/auth/context";
import { NotFoundError } from "@/lib/errors";
import { EDITABLE_STATUSES, quotationService } from "@/lib/quotations/service";
import { QuotationBuilder } from "@/components/quotations/quotation-builder";
import {
  builderValuesFromQuotation,
  businessFromOrg,
  toRecipientOptions,
} from "@/components/quotations/mappers";

export const metadata: Metadata = { title: "Edit quotation" };

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenantPage();
  const { id } = await params;
  const quotation = await quotationService.get(ctx, id).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  if (!EDITABLE_STATUSES.includes(quotation.status)) redirect(`/quotations/${quotation.id}`);

  const options = await quotationService.recipientOptions(ctx);
  const recipients = toRecipientOptions(options);
  // Keep the current recipient selectable even if it's a converted/lost lead.
  if (
    quotation.lead &&
    !recipients.some((r) => r.key === `lead:${quotation.leadId}`) &&
    !quotation.customerId
  ) {
    recipients.push({
      key: `lead:${quotation.lead.id}`,
      kind: "lead",
      ...quotation.lead,
      address: null,
    });
  }

  return (
    <QuotationBuilder
      mode="edit"
      quotationId={quotation.id}
      quotationNumber={quotation.quotationNumber}
      status={quotation.status}
      defaults={builderValuesFromQuotation(quotation)}
      recipients={recipients}
      business={businessFromOrg(quotation.organization)}
      currency={quotation.currency}
    />
  );
}
