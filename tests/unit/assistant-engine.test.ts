import { describe, expect, it } from "vitest";
import { answerFromSnapshot, NOT_ENOUGH_INFO } from "@/lib/ai/assistant-engine";
import type { AssistantSnapshot } from "@/lib/ai/types";

const NOW = new Date("2026-09-24T10:00:00+08:00");
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

const snapshot: AssistantSnapshot = {
  generatedAt: NOW.toISOString(),
  businessName: "BrightBuild",
  currency: "MYR",
  leads: [
    {
      id: "l1",
      name: "Tan Wei Ming",
      company: null,
      status: "NEW",
      priority: "HIGH",
      source: "WHATSAPP",
      estimatedValue: 28000,
      createdAt: days(0),
      lastContactAt: null,
      nextFollowUpAt: days(0),
    },
    {
      id: "l2",
      name: "Rajesh Kumar",
      company: "Kumar Dental",
      status: "QUALIFIED",
      priority: "HIGH",
      source: "REFERRAL",
      estimatedValue: 85000,
      createdAt: days(-9),
      lastContactAt: days(-2),
      nextFollowUpAt: days(3),
    },
    {
      id: "l3",
      name: "Siti Hajar",
      company: null,
      status: "CONTACTED",
      priority: "LOW",
      source: "WHATSAPP",
      estimatedValue: null,
      createdAt: days(-20),
      lastContactAt: days(-12),
      nextFollowUpAt: null,
    },
    {
      id: "l4",
      name: "Daniel Wong",
      company: null,
      status: "WON",
      priority: "MEDIUM",
      source: "WHATSAPP",
      estimatedValue: 34000,
      createdAt: days(-40),
      lastContactAt: days(-3),
      nextFollowUpAt: null,
    },
    {
      id: "l5",
      name: "Hafiz Iskandar",
      company: null,
      status: "LOST",
      priority: "MEDIUM",
      source: "WEBSITE",
      estimatedValue: 9000,
      createdAt: days(-28),
      lastContactAt: days(-18),
      nextFollowUpAt: null,
    },
  ],
  customers: [
    { id: "c1", name: "Karen Teoh", company: null, lifetimeValue: 96000, quotationCount: 1 },
  ],
  quotations: [
    {
      id: "q1",
      number: "QT-2026-0006",
      title: "Condo",
      status: "VIEWED",
      total: 61900,
      contactName: "Lim Mei Ling",
      issueDate: days(-6),
      expiryDate: days(24),
    },
    {
      id: "q2",
      number: "QT-2026-0001",
      title: "Extension",
      status: "ACCEPTED",
      total: 96000,
      contactName: "Karen Teoh",
      issueDate: days(-120),
      expiryDate: null,
    },
  ],
  followUps: [
    {
      id: "f1",
      task: "Reply to enquiry",
      dueDate: days(0),
      status: "PENDING",
      priority: "HIGH",
      contactName: "Tan Wei Ming",
      href: "/leads/l1",
    },
    {
      id: "f2",
      task: "Send references",
      dueDate: days(-2),
      status: "PENDING",
      priority: "MEDIUM",
      contactName: "Nurul",
      href: "/leads/lx",
    },
    {
      id: "f3",
      task: "Site visit",
      dueDate: days(3),
      status: "PENDING",
      priority: "HIGH",
      contactName: "Rajesh Kumar",
      href: "/leads/l2",
    },
  ],
};

const ask = (q: string) => answerFromSnapshot(q, snapshot, NOW);

describe("data-grounded assistant", () => {
  it("answers who needs follow-up today, citing the data used", () => {
    const a = ask("Which customers need follow-up today?");
    expect(a.grounded).toBe(true);
    expect(a.answer).toContain("1 follow-up due today");
    expect(a.answer).toContain("1 overdue");
    expect(a.items?.map((i) => i.label)).toEqual(["Nurul", "Tan Wei Ming"]);
    expect(a.sources[0]).toBe("Based on your 3 open follow-ups");
  });

  it("computes pipeline value from open leads only", () => {
    const a = ask("What's my current pipeline value?");
    expect(a.answer).toContain("RM 113,000.00 across 3 open leads");
    expect(a.answer).toContain("1 lead has no estimated value");
    expect(a.sources).toEqual(["Based on your 3 open leads"]);
  });

  it("lists quotations waiting for a reply", () => {
    const a = ask("Which quotations are still waiting for a reply?");
    expect(a.answer).toContain("1 quotation is waiting");
    expect(a.items?.[0]?.href).toBe("/quotations/q1");
  });

  it("ranks the biggest opportunities", () => {
    expect(ask("What are my biggest open opportunities?").answer).toContain(
      "Rajesh Kumar at RM 85,000.00"
    );
  });

  it("finds leads that have gone cold", () => {
    const a = ask("Which leads haven't been contacted in a week?");
    expect(a.items?.map((i) => i.label)).toEqual(["Siti Hajar"]);
  });

  it("computes win rate from closed leads", () => {
    expect(ask("what is my win rate?").answer).toContain("50%");
  });

  it("summarises a named record", () => {
    const a = ask("Tell me about Rajesh");
    expect(a.answer).toContain("Rajesh Kumar (Kumar Dental) is a Qualified lead");
  });

  it("refuses to invent data it doesn't have", () => {
    for (const q of ["What will the weather be tomorrow?", "How much does my competitor charge?"]) {
      const a = ask(q);
      expect(a.grounded).toBe(false);
      expect(a.answer.startsWith(NOT_ENOUGH_INFO)).toBe(true);
      expect(a.items).toBeUndefined();
    }
  });

  it("handles an empty workspace honestly", () => {
    const empty = { ...snapshot, leads: [], quotations: [], followUps: [], customers: [] };
    expect(answerFromSnapshot("What's my pipeline value?", empty, NOW).answer).toContain(
      "pipeline is empty"
    );
    expect(answerFromSnapshot("Who needs follow-up today?", empty, NOW).answer).toContain(
      "no open follow-ups"
    );
  });
});
