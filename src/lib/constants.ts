import type {
  FollowUpStatus,
  LeadPriority,
  LeadSource,
  LeadStatus,
  QuotationStatus,
} from "@prisma/client";

export type Tone = "neutral" | "primary" | "info" | "success" | "warning" | "danger";

export const LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export const OPEN_LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTATION_SENT",
  "NEGOTIATION",
];

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; tone: Tone }> = {
  NEW: { label: "New", tone: "primary" },
  CONTACTED: { label: "Contacted", tone: "info" },
  QUALIFIED: { label: "Qualified", tone: "info" },
  QUOTATION_SENT: { label: "Quotation Sent", tone: "warning" },
  NEGOTIATION: { label: "Negotiation", tone: "warning" },
  WON: { label: "Won", tone: "success" },
  LOST: { label: "Lost", tone: "neutral" },
};

export const LEAD_PRIORITIES: LeadPriority[] = ["HIGH", "MEDIUM", "LOW"];

export const PRIORITY_META: Record<LeadPriority, { label: string; tone: Tone }> = {
  HIGH: { label: "High", tone: "danger" },
  MEDIUM: { label: "Medium", tone: "warning" },
  LOW: { label: "Low", tone: "neutral" },
};

export const LEAD_SOURCES: LeadSource[] = [
  "WHATSAPP",
  "WEBSITE",
  "FACEBOOK",
  "INSTAGRAM",
  "REFERRAL",
  "PHONE",
  "EMAIL",
  "OTHER",
];

export const SOURCE_LABELS: Record<LeadSource, string> = {
  WHATSAPP: "WhatsApp",
  WEBSITE: "Website",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  REFERRAL: "Referral",
  PHONE: "Phone call",
  EMAIL: "Email",
  OTHER: "Other",
};

export const QUOTATION_STATUSES: QuotationStatus[] = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
];

export const QUOTATION_STATUS_META: Record<QuotationStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SENT: { label: "Sent", tone: "info" },
  VIEWED: { label: "Viewed", tone: "primary" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "warning" },
};

/** Quotations awaiting a customer decision. */
export const PENDING_QUOTATION_STATUSES: QuotationStatus[] = ["SENT", "VIEWED"];

export const FOLLOW_UP_STATUS_META: Record<FollowUpStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "primary" },
  SNOOZED: { label: "Snoozed", tone: "neutral" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const BUSINESS_TYPES = [
  "Renovation & Construction",
  "Interior Design",
  "Creative / Marketing Agency",
  "Wholesale & Distribution",
  "Professional Services",
  "IT & Software Services",
  "Freelancer / Consultant",
  "Events & Catering",
  "Other",
] as const;

export const COUNTRIES = [
  "Malaysia",
  "Singapore",
  "Indonesia",
  "Thailand",
  "Philippines",
  "Brunei",
] as const;

export const CURRENCIES = [
  { code: "MYR", label: "MYR — Malaysian Ringgit" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "IDR", label: "IDR — Indonesian Rupiah" },
  { code: "THB", label: "THB — Thai Baht" },
  { code: "PHP", label: "PHP — Philippine Peso" },
  { code: "BND", label: "BND — Brunei Dollar" },
  { code: "USD", label: "USD — US Dollar" },
] as const;

export const QUOTATION_UNITS = [
  "unit",
  "sqft",
  "set",
  "lot",
  "hour",
  "day",
  "month",
  "pcs",
] as const;

export const DEFAULT_QUOTATION_TERMS = [
  "Quotation is valid for 30 days from the issue date.",
  "50% deposit is required upon confirmation; balance upon completion.",
  "Any additional work outside this scope will be quoted separately.",
].join("\n");
