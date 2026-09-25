// AI Provider abstraction — swap providers via AI_PROVIDER env var without
// touching application code. MockAIProvider (default) needs no API key so
// the app runs at RM0. Real providers (OpenAI / Anthropic / Ollama) implement
// this same interface.

export interface LeadReplyInput {
  leadName: string;
  enquiryText: string;
  businessName: string;
  businessDescription?: string | null;
  businessType?: string | null;
  /** Increments on "Regenerate" so providers can vary phrasing. */
  variant?: number;
}

export interface LeadReplyResult {
  summary: string;
  detectedInfo: string[];
  missingInfo: string[];
  suggestedReply: string;
  recommendedAction: string;
}

export type ReplyTone = "friendly" | "formal" | "shorter";

export interface RewriteReplyInput {
  text: string;
  tone: ReplyTone;
  leadName: string;
  businessName: string;
  ownerName?: string | null;
}

export interface LeadSummaryInput {
  leadName: string;
  description?: string | null;
  status: string;
  estimatedValue?: number | null;
  currency?: string;
}

export interface FollowUpSuggestionInput {
  leadName: string;
  lastContactAt?: Date | null;
  status: string;
  hasQuotation?: boolean;
  nextFollowUpAt?: Date | null;
}

export interface QuotationDescriptionInput {
  itemHint: string;
  businessType?: string | null;
}

export interface PipelineAnalysisInput {
  totalLeads: number;
  openLeads: number;
  overdueFollowUps: number;
  unansweredQuotations: number;
  pipelineValue: number;
  highestOpenValue: number;
  currency: string;
  /** Open leads with no contact in 7+ days and no scheduled follow-up. */
  staleLeads?: number;
  newLeadsThisWeek?: number;
  followUpsDueToday?: number;
  acceptedValueThisMonth?: number;
  highestOpenLeadName?: string | null;
}

/* --------------------------- Data-grounded assistant --------------------------- */

export interface AssistantSnapshot {
  generatedAt: string;
  businessName: string;
  currency: string;
  leads: {
    id: string;
    name: string;
    company: string | null;
    status: string;
    priority: string;
    source: string;
    estimatedValue: number | null;
    createdAt: string;
    lastContactAt: string | null;
    nextFollowUpAt: string | null;
  }[];
  customers: {
    id: string;
    name: string;
    company: string | null;
    lifetimeValue: number;
    quotationCount: number;
  }[];
  quotations: {
    id: string;
    number: string;
    title: string | null;
    status: string;
    total: number;
    contactName: string | null;
    issueDate: string;
    expiryDate: string | null;
  }[];
  followUps: {
    id: string;
    task: string;
    dueDate: string;
    status: string;
    priority: string;
    contactName: string | null;
    href: string | null;
  }[];
}

export interface AssistantInput {
  question: string;
  snapshot: AssistantSnapshot;
}

export interface AssistantAnswer {
  /** Plain-language answer. */
  answer: string;
  /** Records that support the answer, rendered as a list with links. */
  items?: { label: string; detail?: string; href?: string }[];
  /** Human-readable description of the data used, e.g. "Based on your 8 open leads". */
  sources: string[];
  /** False when the data can't support an answer. */
  grounded: boolean;
}

export interface AIProvider {
  readonly name: string;
  generateLeadReply(input: LeadReplyInput): Promise<LeadReplyResult>;
  rewriteReply(input: RewriteReplyInput): Promise<string>;
  summarizeLead(input: LeadSummaryInput): Promise<string>;
  generateFollowUpSuggestion(input: FollowUpSuggestionInput): Promise<string>;
  generateQuotationDescription(input: QuotationDescriptionInput): Promise<string>;
  analyzePipeline(input: PipelineAnalysisInput): Promise<string[]>;
  answerQuestion(input: AssistantInput): Promise<AssistantAnswer>;
}
