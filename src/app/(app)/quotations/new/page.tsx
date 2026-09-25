import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getWorkspace, requireTenantPage } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { quotationService } from "@/lib/quotations/service";
import { QuotationBuilder } from "@/components/quotations/quotation-builder";
import {
  businessFromOrg,
  newBuilderDefaults,
  toRecipientOptions,
} from "@/components/quotations/mappers";

export const metadata: Metadata = { title: "New quotation" };

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; customerId?: string }>;
}) {
  const ctx = await requireTenantPage();
  const workspace = await getWorkspace();
  if (!workspace) redirect("/login");
  const { leadId, customerId } = await searchParams;

  const recipients = toRecipientOptions(await quotationService.recipientOptions(ctx));
  const has = (key: string) => recipients.some((r) => r.key === key);

  // Preselect only recipients that belong to this organization. A converted
  // lead is quoted as its customer.
  let preselected = "";
  if (customerId && has(`customer:${customerId}`)) preselected = `customer:${customerId}`;
  else if (leadId && has(`lead:${leadId}`)) preselected = `lead:${leadId}`;
  else if (leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: ctx.organizationId },
      select: { convertedCustomerId: true },
    });
    if (lead?.convertedCustomerId && has(`customer:${lead.convertedCustomerId}`)) {
      preselected = `customer:${lead.convertedCustomerId}`;
    }
  }

  return (
    <QuotationBuilder
      mode="create"
      defaults={newBuilderDefaults(preselected)}
      recipients={recipients}
      business={businessFromOrg(workspace.organization)}
      currency={workspace.organization.currency}
    />
  );
}
