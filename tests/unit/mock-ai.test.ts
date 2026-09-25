import { describe, expect, it } from "vitest";
import { MockAIProvider } from "@/lib/ai/mock-provider";
import { getAIProvider, getAIStatus, maskKey } from "@/lib/ai";

const ai = new MockAIProvider();

describe("MockAIProvider", () => {
  it("extracts details and missing information from an enquiry", async () => {
    const r = await ai.generateLeadReply({
      leadName: "Tan Wei Ming",
      businessName: "BrightBuild Renovation",
      enquiryText:
        "Hi, I'd like to renovate my kitchen in my PJ condo, around 120 sqft. Budget about RM25k.",
    });
    expect(r.detectedInfo).toContain("Project type: Kitchen renovation");
    expect(r.detectedInfo).toContain("Budget: around RM25,000");
    expect(r.detectedInfo.some((d) => d.startsWith("Size: approximately 120"))).toBe(true);
    expect(r.detectedInfo).toContain("Location: PJ");
    expect(r.missingInfo).toContain("Preferred timeline");
    expect(r.missingInfo).not.toContain("Budget range");
    expect(r.suggestedReply).toContain("Hi Tan");
    expect(r.suggestedReply).toContain("BrightBuild Renovation");
    expect(r.summary).toContain("kitchen renovation");
  });

  it("asks clarifying questions for vague enquiries", async () => {
    const r = await ai.generateLeadReply({
      leadName: "Siti",
      businessName: "Acme",
      enquiryText: "hello, can you help?",
    });
    expect(r.missingInfo).toContain("What they need help with");
    expect(r.recommendedAction).toMatch(/clarifying/i);
  });

  it("is deterministic and varies phrasing on regenerate", async () => {
    const input = {
      leadName: "Ali",
      businessName: "Acme",
      enquiryText: "bathroom renovation quote",
    };
    const a = await ai.generateLeadReply(input);
    const b = await ai.generateLeadReply(input);
    const c = await ai.generateLeadReply({ ...input, variant: 1 });
    expect(a).toEqual(b);
    expect(c.suggestedReply).not.toBe(a.suggestedReply);
  });

  it("rewrites replies in different tones", async () => {
    const text =
      "Hi Tan, thank you for reaching out to Acme! We'd be glad to help with your kitchen renovation. To prepare an accurate quotation, could you share: budget range, preferred timeline? We'd also be happy to arrange a free site visit. Looking forward to hearing from you.";
    const base = { text, leadName: "Tan Wei Ming", businessName: "Acme", ownerName: "Aisyah" };
    const formal = await ai.rewriteReply({ ...base, tone: "formal" });
    expect(formal.startsWith("Dear Tan Wei Ming,")).toBe(true);
    expect(formal).toContain("We would");
    expect(formal).toContain("Yours sincerely");

    const friendly = await ai.rewriteReply({ ...base, tone: "friendly" });
    expect(friendly.startsWith("Hi Tan!")).toBe(true);

    const shorter = await ai.rewriteReply({ ...base, tone: "shorter" });
    expect(shorter.length).toBeLessThan(text.length);
    expect(shorter).toContain("?");
  });

  it("only reports pipeline insights backed by the numbers it was given", async () => {
    const empty = await ai.analyzePipeline({
      totalLeads: 0,
      openLeads: 0,
      overdueFollowUps: 0,
      unansweredQuotations: 0,
      pipelineValue: 0,
      highestOpenValue: 0,
      currency: "MYR",
    });
    expect(empty).toEqual([
      "No leads yet. Add your first enquiry to start building your pipeline.",
    ]);

    const insights = await ai.analyzePipeline({
      totalLeads: 10,
      openLeads: 7,
      overdueFollowUps: 2,
      unansweredQuotations: 3,
      pipelineValue: 255800,
      highestOpenValue: 85000,
      highestOpenLeadName: "Rajesh Kumar",
      currency: "MYR",
    });
    expect(insights[0]).toContain("2 follow-ups are overdue");
    expect(insights.join(" ")).toContain("3 quotations haven't received a response");
    expect(insights.join(" ")).toContain("Rajesh Kumar at RM 85,000");
    expect(insights.length).toBeLessThanOrEqual(4);
  });
});

describe("provider factory", () => {
  it("defaults to the mock provider and never exposes the full API key", () => {
    expect(getAIProvider().name).toBe("mock");
    expect(maskKey("sk-abcdefghijklmnop1234")).toBe("sk-…1234");
    expect(maskKey(undefined)).toBeNull();
  });

  it("falls back to mock when an unavailable provider is configured", () => {
    const previous = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "openai";
    try {
      const status = getAIStatus();
      expect(status.requested).toBe("openai");
      expect(status.active).toBe("mock");
      expect(status.fallback).toBe(true);
      expect(getAIProvider().name).toBe("mock");
    } finally {
      process.env.AI_PROVIDER = previous;
    }
  });
});
