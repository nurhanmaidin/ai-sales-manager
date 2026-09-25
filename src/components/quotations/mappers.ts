import type { Customer, Lead, Organization, Quotation, QuotationItem } from "@prisma/client";
import { addDays } from "date-fns";
import { DEFAULT_QUOTATION_TERMS } from "@/lib/constants";
import { toDateInput } from "@/lib/utils/dates";
import { toNumber } from "@/lib/utils/format";
import type { BuilderValues } from "./quotation-builder";
import type { QuotationDocData } from "./quotation-document";
import type { RecipientOption } from "./recipient-picker";

export function businessFromOrg(org: Organization): QuotationDocData["business"] {
  return {
    name: org.name,
    address: org.address,
    phone: org.phone,
    email: org.email,
    website: org.website,
    registrationNumber: org.registrationNumber,
    taxInfo: org.taxInfo,
    ownerName: org.ownerName,
  };
}

export function toDocData(
  q: Quotation & {
    items: QuotationItem[];
    customer: Customer | null;
    lead: Lead | null;
    organization: Organization;
  }
): QuotationDocData {
  const person = q.customer ?? q.lead;
  return {
    number: q.quotationNumber,
    title: q.title,
    issueDate: q.issueDate.toISOString(),
    expiryDate: q.expiryDate?.toISOString() ?? null,
    currency: q.currency,
    business: businessFromOrg(q.organization),
    recipient: person
      ? {
          name: person.name,
          company: person.company,
          email: person.email,
          phone: person.phone,
          address: q.customer?.address ?? null,
        }
      : null,
    items: q.items.map((i) => ({
      description: i.description,
      quantity: toNumber(i.quantity),
      unit: i.unit,
      unitPrice: toNumber(i.unitPrice),
      total: toNumber(i.total),
    })),
    totals: {
      subtotal: toNumber(q.subtotal),
      discount: toNumber(q.discount),
      taxRate: toNumber(q.taxRate),
      tax: toNumber(q.tax),
      total: toNumber(q.total),
    },
    notes: q.notes,
    terms: q.terms,
  };
}

export function toRecipientOptions(options: {
  customers: Pick<Customer, "id" | "name" | "company" | "email" | "phone" | "address">[];
  leads: Pick<Lead, "id" | "name" | "company" | "email" | "phone">[];
}): RecipientOption[] {
  return [
    ...options.customers.map((c) => ({ key: `customer:${c.id}`, kind: "customer" as const, ...c })),
    ...options.leads.map((l) => ({
      key: `lead:${l.id}`,
      kind: "lead" as const,
      ...l,
      address: null,
    })),
  ];
}

export function newBuilderDefaults(recipient = ""): BuilderValues {
  const today = new Date();
  return {
    recipient,
    title: "",
    issueDate: toDateInput(today),
    expiryDate: toDateInput(addDays(today, 30)),
    items: [{ description: "", quantity: "1", unit: "unit", unitPrice: "" }],
    discount: "",
    taxRate: "0",
    notes: "",
    terms: DEFAULT_QUOTATION_TERMS,
  };
}

export function builderValuesFromQuotation(
  q: Quotation & { items: QuotationItem[] }
): BuilderValues {
  return {
    recipient: q.customerId ? `customer:${q.customerId}` : q.leadId ? `lead:${q.leadId}` : "",
    title: q.title ?? "",
    issueDate: toDateInput(q.issueDate),
    expiryDate: toDateInput(q.expiryDate),
    items: q.items.map((i) => ({
      description: i.description,
      quantity: String(toNumber(i.quantity)),
      unit: i.unit,
      unitPrice: toNumber(i.unitPrice).toFixed(2),
    })),
    discount: toNumber(q.discount) ? toNumber(q.discount).toFixed(2) : "",
    taxRate: String(toNumber(q.taxRate)),
    notes: q.notes ?? "",
    terms: q.terms ?? "",
  };
}
