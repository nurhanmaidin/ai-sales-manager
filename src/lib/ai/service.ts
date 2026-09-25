import { subMinutes } from "date-fns";
import type { AIInteractionType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { activityService } from "@/lib/activities/service";
import { getPipelineMetrics } from "@/lib/dashboard/metrics";
import { AppError, NotFoundError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { idSchema } from "@/lib/validators/crm";
import { getAIProvider } from "./index";
import { MockAIProvider } from "./mock-provider";
import { buildAssistantSnapshot } from "./snapshot";
import type { AIProvider, AssistantAnswer, LeadReplyResult, ReplyTone } from "./types";

const fallbackProvider = new MockAIProvider();

/**
 * Runs an AI call against the configured provider, falling back to the
 * deterministic mock if it fails. AI is an enhancement, never a hard dependency.
 */
async function withFallback<T>(call: (p: AIProvider) => Promise<T>) {
  const provider = getAIProvider();
  try {
    return { value: await call(provider), provider: provider.name, fallback: false };
  } catch (error) {
    if (provider.name === fallbackProvider.name) throw error;
    console.error(`[ai] ${provider.name} failed, using fallback`, error);
    return { value: await call(fallbackProvider), provider: fallbackProvider.name, fallback: true };
  }
}

function enforceAIRateLimit(ctx: TenantContext) {
  if (!rateLimit(`ai:${ctx.userId}`, 30, 60_000).ok) {
    throw new AppError(
      "You're generating a lot quickly — please wait a moment and try again.",
      "RATE_LIMITED"
    );
  }
}

async function logInteraction(
  ctx: TenantContext,
  data: {
    type: AIInteractionType;
    prompt: string;
    response: string;
    provider: string;
    leadId?: string | null;
  }
) {
  await prisma.aIInteraction.create({
    data: {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      leadId: data.leadId ?? null,
      type: data.type,
      prompt: data.prompt.slice(0, 10_000),
      response: data.response.slice(0, 20_000),
      provider: data.provider,
    },
  });
}

const leadReplyResultSchema = z.object({
  summary: z.string(),
  detectedInfo: z.array(z.string()),
  missingInfo: z.array(z.string()),
  suggestedReply: z.string(),
  recommendedAction: z.string(),
});

async function loadLeadWithOrg(ctx: TenantContext, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: idSchema.parse(leadId), organizationId: ctx.organizationId },
    include: {
      organization: {
        select: {
          name: true,
          description: true,
          businessType: true,
          ownerName: true,
          currency: true,
        },
      },
      quotations: { select: { id: true }, take: 1 },
    },
  });
  if (!lead) throw new NotFoundError("Lead");
  return lead;
}

export const aiService = {
  async generateLeadReply(
    ctx: TenantContext,
    leadId: string,
    variant = 0
  ): Promise<LeadReplyResult> {
    enforceAIRateLimit(ctx);
    const lead = await loadLeadWithOrg(ctx, leadId);
    if (!lead.description?.trim()) {
      throw new AppError("Add the customer's enquiry to this lead first, then generate a reply.");
    }

    const { value, provider } = await withFallback((p) =>
      p.generateLeadReply({
        leadName: lead.name,
        enquiryText: lead.description!,
        businessName: lead.organization.name,
        businessDescription: lead.organization.description,
        businessType: lead.organization.businessType,
        variant: z.number().int().min(0).max(1000).parse(variant),
      })
    );

    await logInteraction(ctx, {
      type: "LEAD_REPLY",
      prompt: lead.description,
      response: JSON.stringify(value),
      provider,
      leadId: lead.id,
    });

    // One timeline entry per burst of regenerations, not one per click.
    const recent = await prisma.activity.findFirst({
      where: {
        leadId: lead.id,
        type: "AI_REPLY_GENERATED",
        createdAt: { gte: subMinutes(new Date(), 10) },
      },
      select: { id: true },
    });
    if (!recent) {
      await activityService.log(prisma, ctx, {
        type: "AI_REPLY_GENERATED",
        description: "AI drafted a reply to the enquiry",
        leadId: lead.id,
        customerId: lead.convertedCustomerId,
      });
    }
    return value;
  },

  async rewriteReply(
    ctx: TenantContext,
    leadId: string,
    rawText: unknown,
    rawTone: unknown
  ): Promise<string> {
    enforceAIRateLimit(ctx);
    const text = z
      .string()
      .trim()
      .min(1, "There's no reply to rewrite yet.")
      .max(4000)
      .parse(rawText);
    const tone: ReplyTone = z.enum(["friendly", "formal", "shorter"]).parse(rawTone);
    const lead = await loadLeadWithOrg(ctx, leadId);

    const { value, provider } = await withFallback((p) =>
      p.rewriteReply({
        text,
        tone,
        leadName: lead.name,
        businessName: lead.organization.name,
        ownerName: lead.organization.ownerName,
      })
    );
    await logInteraction(ctx, {
      type: "LEAD_REPLY",
      prompt: `[rewrite:${tone}] ${text}`,
      response: JSON.stringify({ rewrite: value, tone }),
      provider,
      leadId: lead.id,
    });
    return value;
  },

  /** The most recent full reply generated for a lead, so it survives page reloads. */
  async latestLeadReply(ctx: TenantContext, leadId: string) {
    const interaction = await prisma.aIInteraction.findFirst({
      where: {
        organizationId: ctx.organizationId,
        leadId,
        type: "LEAD_REPLY",
        NOT: { prompt: { startsWith: "[rewrite:" } },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!interaction) return null;
    try {
      const parsed = leadReplyResultSchema.safeParse(JSON.parse(interaction.response));
      return parsed.success ? { result: parsed.data, createdAt: interaction.createdAt } : null;
    } catch {
      return null;
    }
  },

  async leadSuggestions(ctx: TenantContext, leadId: string) {
    const lead = await loadLeadWithOrg(ctx, leadId);
    const [summary, nextAction] = await Promise.all([
      withFallback((p) =>
        p.summarizeLead({
          leadName: lead.name,
          description: lead.description,
          status: lead.status,
          estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : null,
          currency: lead.organization.currency,
        })
      ),
      withFallback((p) =>
        p.generateFollowUpSuggestion({
          leadName: lead.name,
          lastContactAt: lead.lastContactAt,
          status: lead.status,
          hasQuotation: lead.quotations.length > 0,
          nextFollowUpAt: lead.nextFollowUpAt,
        })
      ),
    ]);
    return { summary: summary.value, nextAction: nextAction.value, provider: summary.provider };
  },

  /** Dashboard insights computed from real aggregates, with a deterministic fallback. */
  async pipelineInsights(ctx: TenantContext) {
    const metrics = await getPipelineMetrics(ctx);
    const input = {
      totalLeads: metrics.totalLeads,
      openLeads: metrics.openLeads,
      overdueFollowUps: metrics.overdueFollowUps,
      unansweredQuotations: metrics.pendingQuotations,
      pipelineValue: metrics.pipelineValue,
      highestOpenValue: metrics.highestOpen?.value ?? 0,
      highestOpenLeadName: metrics.highestOpen?.name ?? null,
      currency: metrics.currency,
      staleLeads: metrics.staleLeads,
      newLeadsThisWeek: metrics.newLeadsThisWeek,
      followUpsDueToday: metrics.followUpsDueToday,
      acceptedValueThisMonth: metrics.acceptedValueThisMonth,
    };
    try {
      const { value, provider } = await withFallback((p) => p.analyzePipeline(input));
      return { insights: value, provider, metrics };
    } catch (error) {
      console.error("[ai] pipeline insights unavailable", error);
      return {
        insights: await fallbackProvider.analyzePipeline(input),
        provider: "fallback",
        metrics,
      };
    }
  },

  async ask(ctx: TenantContext, rawQuestion: unknown): Promise<AssistantAnswer> {
    enforceAIRateLimit(ctx);
    const question = z
      .string()
      .trim()
      .min(1, "Type a question first.")
      .max(500, "Please keep questions under 500 characters.")
      .parse(rawQuestion);
    const snapshot = await buildAssistantSnapshot(ctx);
    const { value, provider } = await withFallback((p) => p.answerQuestion({ question, snapshot }));
    await logInteraction(ctx, {
      type: "ASSISTANT_QUERY",
      prompt: question,
      response: JSON.stringify(value),
      provider,
    });
    return value;
  },

  async recentQuestions(ctx: TenantContext, take = 6) {
    const rows = await prisma.aIInteraction.findMany({
      where: { organizationId: ctx.organizationId, userId: ctx.userId, type: "ASSISTANT_QUERY" },
      orderBy: { createdAt: "desc" },
      select: { prompt: true },
      take: 20,
    });
    return [...new Set(rows.map((r) => r.prompt))].slice(0, take);
  },
};
