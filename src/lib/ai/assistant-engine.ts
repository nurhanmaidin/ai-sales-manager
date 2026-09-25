import type { AssistantAnswer, AssistantSnapshot } from "./types";

// Deterministic, data-grounded question answering over an organization's own
// CRM snapshot. It never invents data: every figure is computed from the
// snapshot, and unsupported questions get an explicit "not enough
// information" answer. Used by MockAIProvider and as the fallback for real
// providers.

const OPEN = new Set(["NEW", "CONTACTED", "QUALIFIED", "QUOTATION_SENT", "NEGOTIATION"]);
const PENDING_QUOTES = new Set(["SENT", "VIEWED"]);
const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  QUOTATION_SENT: "Quotation Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};
const SOURCE_LABEL: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  WEBSITE: "Website",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  REFERRAL: "Referral",
  PHONE: "Phone",
  EMAIL: "Email",
  OTHER: "Other",
};

const DAY = 86_400_000;

export const NOT_ENOUGH_INFO = "I don't have enough information to answer that.";

export const SUGGESTED_QUESTIONS = [
  "Which customers need follow-up today?",
  "What's my current pipeline value?",
  "Which quotations are still waiting for a reply?",
  "What are my biggest open opportunities?",
  "Which leads haven't been contacted in a week?",
  "Where do my leads come from?",
];

function money(n: number, currency: string) {
  const symbol = currency === "MYR" ? "RM" : currency;
  return `${symbol} ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function has(q: string, ...words: string[]) {
  return words.some((w) => q.includes(w));
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

type Intent = (q: string, s: AssistantSnapshot, now: Date) => AssistantAnswer | null;

/* --------------------------------- Intents -------------------------------- */

const followUpsDue: Intent = (q, s, now) => {
  if (
    !has(
      q,
      "follow up",
      "follow-up",
      "followup",
      "need attention",
      "contact today",
      "call today",
      "remind",
      "overdue",
      "who should i",
      "chase"
    )
  ) {
    return null;
  }
  const today = startOfDay(now).getTime();
  const tomorrow = today + DAY;
  const open = s.followUps.filter((f) => f.status === "PENDING" || f.status === "SNOOZED");
  const overdue = open.filter((f) => new Date(f.dueDate).getTime() < today);
  const dueToday = open.filter((f) => {
    const t = new Date(f.dueDate).getTime();
    return t >= today && t < tomorrow;
  });
  const wantsOverdueOnly = has(q, "overdue") && !has(q, "today");
  const relevant = wantsOverdueOnly ? overdue : [...overdue, ...dueToday];

  const sources = [`Based on your ${plural(open.length, "open follow-up")}`];
  if (open.length === 0) {
    return {
      answer: "You have no open follow-ups scheduled, so nobody is due today.",
      sources,
      grounded: true,
    };
  }
  if (relevant.length === 0) {
    return {
      answer: wantsOverdueOnly
        ? "Nothing is overdue — you're on top of every follow-up."
        : "No follow-ups are due today and nothing is overdue.",
      sources,
      grounded: true,
    };
  }
  const parts = [];
  if (!wantsOverdueOnly && dueToday.length)
    parts.push(`${plural(dueToday.length, "follow-up")} due today`);
  if (overdue.length) parts.push(`${overdue.length} overdue`);
  return {
    answer: `You have ${parts.join(" and ")}. Start with the overdue ones — they're most at risk of going cold.`,
    items: relevant.slice(0, 10).map((f) => ({
      label: f.contactName ?? f.task,
      detail: `${f.task} · ${new Date(f.dueDate).getTime() < today ? `overdue since ${shortDate(f.dueDate)}` : "due today"}`,
      href: f.href ?? undefined,
    })),
    sources,
    grounded: true,
  };
};

const staleLeads: Intent = (q, s, now) => {
  if (
    !has(
      q,
      "haven't been contacted",
      "not contacted",
      "no contact",
      "gone cold",
      "going cold",
      "stale",
      "neglect",
      "ignored",
      "forgot"
    )
  ) {
    return null;
  }
  const open = s.leads.filter((l) => OPEN.has(l.status));
  const cutoff = now.getTime() - 7 * DAY;
  const stale = open.filter((l) => {
    const last = l.lastContactAt ?? l.createdAt;
    return new Date(last).getTime() < cutoff;
  });
  return {
    answer: stale.length
      ? `${plural(stale.length, "open lead")} ${stale.length === 1 ? "hasn't" : "haven't"} been contacted in over a week.`
      : "Every open lead has been contacted in the last 7 days.",
    items: stale.slice(0, 10).map((l) => ({
      label: l.name,
      detail: `${STATUS_LABEL[l.status]} · last contact ${l.lastContactAt ? shortDate(l.lastContactAt) : "never"}`,
      href: `/leads/${l.id}`,
    })),
    sources: [`Based on your ${plural(open.length, "open lead")}`],
    grounded: true,
  };
};

const pendingQuotations: Intent = (q, s) => {
  if (!has(q, "quotation", "quote")) return null;
  if (
    !has(
      q,
      "pending",
      "waiting",
      "unanswered",
      "no reply",
      "not replied",
      "outstanding",
      "open",
      "sent",
      "awaiting",
      "still"
    )
  ) {
    return null;
  }
  const pending = s.quotations.filter((x) => PENDING_QUOTES.has(x.status));
  const value = pending.reduce((sum, x) => sum + x.total, 0);
  return {
    answer: pending.length
      ? `${plural(pending.length, "quotation")} ${pending.length === 1 ? "is" : "are"} waiting for a customer decision, worth ${money(value, s.currency)} in total.`
      : "No quotations are waiting for a reply right now.",
    items: pending.slice(0, 10).map((x) => ({
      label: `${x.number}${x.contactName ? ` — ${x.contactName}` : ""}`,
      detail: `${money(x.total, s.currency)} · sent ${shortDate(x.issueDate)}`,
      href: `/quotations/${x.id}`,
    })),
    sources: [`Based on your ${plural(s.quotations.length, "quotation")}`],
    grounded: true,
  };
};

const pipelineValue: Intent = (q, s) => {
  if (!has(q, "pipeline", "open value", "worth", "potential", "forecast")) return null;
  const open = s.leads.filter((l) => OPEN.has(l.status));
  const valued = open.filter((l) => l.estimatedValue !== null);
  const total = valued.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);
  if (open.length === 0) {
    return {
      answer: "Your pipeline is empty — there are no open leads yet.",
      sources: ["Based on your leads"],
      grounded: true,
    };
  }
  const byStage = [...OPEN]
    .map((status) => {
      const inStage = open.filter((l) => l.status === status);
      return {
        status,
        count: inStage.length,
        value: inStage.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0),
      };
    })
    .filter((x) => x.count > 0);
  const unvalued = open.length - valued.length;
  return {
    answer: `Your current pipeline value is ${money(total, s.currency)} across ${plural(open.length, "open lead")}.${
      unvalued
        ? ` ${plural(unvalued, "lead")} ${unvalued === 1 ? "has" : "have"} no estimated value yet, so the real figure may be higher.`
        : ""
    }`,
    items: byStage.map((x) => ({
      label: STATUS_LABEL[x.status] ?? x.status,
      detail: `${plural(x.count, "lead")} · ${money(x.value, s.currency)}`,
      href: `/leads?status=${x.status}`,
    })),
    sources: [`Based on your ${plural(open.length, "open lead")}`],
    grounded: true,
  };
};

const biggestOpportunities: Intent = (q, s) => {
  if (
    !has(
      q,
      "biggest",
      "largest",
      "top deal",
      "top opportunit",
      "most valuable",
      "highest value",
      "big deal"
    )
  )
    return null;
  const open = s.leads
    .filter((l) => OPEN.has(l.status) && l.estimatedValue)
    .sort((a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0));
  if (open.length === 0) {
    return {
      answer: "None of your open leads have an estimated value yet, so I can't rank them.",
      sources: ["Based on your open leads"],
      grounded: true,
    };
  }
  return {
    answer: `Your largest open opportunity is ${open[0]!.name} at ${money(open[0]!.estimatedValue ?? 0, s.currency)}.`,
    items: open.slice(0, 5).map((l) => ({
      label: l.name,
      detail: `${money(l.estimatedValue ?? 0, s.currency)} · ${STATUS_LABEL[l.status]}`,
      href: `/leads/${l.id}`,
    })),
    sources: [`Based on your ${plural(open.length, "open lead")} with an estimated value`],
    grounded: true,
  };
};

const highPriority: Intent = (q, s) => {
  if (!has(q, "high priority", "urgent", "important lead", "priority")) return null;
  const hot = s.leads.filter((l) => OPEN.has(l.status) && l.priority === "HIGH");
  return {
    answer: hot.length
      ? `You have ${plural(hot.length, "high-priority open lead")}.`
      : "You have no high-priority open leads right now.",
    items: hot.slice(0, 10).map((l) => ({
      label: l.name,
      detail: `${STATUS_LABEL[l.status]}${l.estimatedValue ? ` · ${money(l.estimatedValue, s.currency)}` : ""}`,
      href: `/leads/${l.id}`,
    })),
    sources: [
      `Based on your ${plural(s.leads.filter((l) => OPEN.has(l.status)).length, "open lead")}`,
    ],
    grounded: true,
  };
};

const revenue: Intent = (q, s, now) => {
  if (!has(q, "revenue", "sales", "won", "accepted", "closed", "earned", "made")) return null;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonth = has(q, "this month", "month");
  const accepted = s.quotations.filter(
    (x) => x.status === "ACCEPTED" && (!thisMonth || new Date(x.issueDate).getTime() >= monthStart)
  );
  const won = s.leads.filter((l) => l.status === "WON");
  const value = accepted.reduce((sum, x) => sum + x.total, 0);
  return {
    answer: `${thisMonth ? "This month you have" : "You have"} ${plural(accepted.length, "accepted quotation")} worth ${money(value, s.currency)}, and ${plural(won.length, "lead")} marked as won overall.`,
    items: accepted.slice(0, 8).map((x) => ({
      label: `${x.number}${x.contactName ? ` — ${x.contactName}` : ""}`,
      detail: money(x.total, s.currency),
      href: `/quotations/${x.id}`,
    })),
    sources: [
      `Based on your ${plural(s.quotations.length, "quotation")} and ${plural(s.leads.length, "lead")}`,
    ],
    grounded: true,
  };
};

const winRate: Intent = (q, s) => {
  if (!has(q, "conversion", "win rate", "close rate", "success rate")) return null;
  const won = s.leads.filter((l) => l.status === "WON").length;
  const lost = s.leads.filter((l) => l.status === "LOST").length;
  if (won + lost === 0) {
    return {
      answer: `${NOT_ENOUGH_INFO} No leads have been marked won or lost yet, so there's no win rate to calculate.`,
      sources: [`Based on your ${plural(s.leads.length, "lead")}`],
      grounded: false,
    };
  }
  const rate = Math.round((won / (won + lost)) * 100);
  return {
    answer: `Your win rate is ${rate}% — ${won} won and ${lost} lost out of ${won + lost} closed leads.`,
    sources: [`Based on ${plural(won + lost, "closed lead")}`],
    grounded: true,
  };
};

const leadSources: Intent = (q, s) => {
  if (
    !has(
      q,
      "source",
      "come from",
      "channel",
      "where do",
      "whatsapp",
      "facebook",
      "instagram",
      "referral"
    )
  )
    return null;
  if (s.leads.length === 0) {
    return {
      answer: "You don't have any leads yet.",
      sources: ["Based on your leads"],
      grounded: true,
    };
  }
  const counts = new Map<string, number>();
  for (const l of s.leads) counts.set(l.source, (counts.get(l.source) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topSource, topCount] = ranked[0]!;
  return {
    answer: `Most of your leads come from ${SOURCE_LABEL[topSource] ?? topSource} (${Math.round((topCount / s.leads.length) * 100)}%).`,
    items: ranked.map(([source, count]) => ({
      label: SOURCE_LABEL[source] ?? source,
      detail: plural(count, "lead"),
      href: `/leads?source=${source}`,
    })),
    sources: [`Based on all ${plural(s.leads.length, "lead")}`],
    grounded: true,
  };
};

const newLeads: Intent = (q, s, now) => {
  if (
    !has(
      q,
      "new lead",
      "how many lead",
      "leads this week",
      "leads this month",
      "number of leads",
      "lead count"
    )
  )
    return null;
  const week = s.leads.filter((l) => new Date(l.createdAt).getTime() >= now.getTime() - 7 * DAY);
  const month = s.leads.filter((l) => new Date(l.createdAt).getTime() >= now.getTime() - 30 * DAY);
  const open = s.leads.filter((l) => OPEN.has(l.status));
  return {
    answer: `You have ${plural(s.leads.length, "lead")} in total (${open.length} open). ${week.length} arrived in the last 7 days and ${month.length} in the last 30 days.`,
    items: week.slice(0, 8).map((l) => ({
      label: l.name,
      detail: `${SOURCE_LABEL[l.source]} · ${shortDate(l.createdAt)}`,
      href: `/leads/${l.id}`,
    })),
    sources: [`Based on all ${plural(s.leads.length, "lead")}`],
    grounded: true,
  };
};

const customers: Intent = (q, s) => {
  if (!has(q, "customer", "client")) return null;
  if (s.customers.length === 0) {
    return {
      answer: "You don't have any customers yet. Convert a won lead to create your first one.",
      sources: ["Based on your customers"],
      grounded: true,
    };
  }
  const ranked = [...s.customers].sort((a, b) => b.lifetimeValue - a.lifetimeValue);
  const total = ranked.reduce((sum, c) => sum + c.lifetimeValue, 0);
  return {
    answer: `You have ${plural(s.customers.length, "customer")} with ${money(total, s.currency)} in accepted quotations. Your top customer is ${ranked[0]!.name}.`,
    items: ranked.slice(0, 5).map((c) => ({
      label: c.name,
      detail: `${money(c.lifetimeValue, s.currency)} · ${plural(c.quotationCount, "quotation")}`,
      href: `/customers/${c.id}`,
    })),
    sources: [`Based on your ${plural(s.customers.length, "customer")}`],
    grounded: true,
  };
};

const lostLeads: Intent = (q, s) => {
  if (!has(q, "lost")) return null;
  const lost = s.leads.filter((l) => l.status === "LOST");
  const value = lost.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);
  return {
    answer: lost.length
      ? `${plural(lost.length, "lead")} ${lost.length === 1 ? "was" : "were"} lost, worth an estimated ${money(value, s.currency)}.`
      : "You haven't lost any leads.",
    items: lost
      .slice(0, 8)
      .map((l) => ({ label: l.name, detail: l.company ?? undefined, href: `/leads/${l.id}` })),
    sources: [`Based on all ${plural(s.leads.length, "lead")}`],
    grounded: true,
  };
};

/** "Tell me about Tan" — matches a lead or customer mentioned by name. */
const namedRecord: Intent = (q, s) => {
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  const matches = (name: string) => {
    const parts = name
      .toLowerCase()
      .split(/\s+/)
      .filter((p) => p.length >= 3);
    return parts.some((p) => tokens.includes(p));
  };
  const lead = s.leads.find((l) => matches(l.name));
  const customer = s.customers.find((c) => matches(c.name));
  if (customer) {
    return {
      answer: `${customer.name}${customer.company ? ` (${customer.company})` : ""} is a customer with ${plural(customer.quotationCount, "quotation")} and ${money(customer.lifetimeValue, s.currency)} in accepted work.`,
      items: [{ label: `Open ${customer.name}`, href: `/customers/${customer.id}` }],
      sources: [`Based on ${customer.name}'s customer record`],
      grounded: true,
    };
  }
  if (lead) {
    const quotes = s.quotations.filter((x) => x.contactName === lead.name);
    return {
      answer: `${lead.name}${lead.company ? ` (${lead.company})` : ""} is a ${STATUS_LABEL[lead.status]} lead from ${SOURCE_LABEL[lead.source]}${
        lead.estimatedValue ? ` worth ${money(lead.estimatedValue, s.currency)}` : ""
      }. Last contact: ${lead.lastContactAt ? shortDate(lead.lastContactAt) : "not yet"}; next follow-up: ${
        lead.nextFollowUpAt ? shortDate(lead.nextFollowUpAt) : "none scheduled"
      }.${quotes.length ? ` There ${quotes.length === 1 ? "is" : "are"} ${plural(quotes.length, "quotation")} for them.` : ""}`,
      items: [{ label: `Open ${lead.name}`, href: `/leads/${lead.id}` }],
      sources: [`Based on ${lead.name}'s lead record`],
      grounded: true,
    };
  }
  return null;
};

// Order matters: specific intents before broad ones.
const INTENTS: Intent[] = [
  followUpsDue,
  staleLeads,
  pendingQuotations,
  biggestOpportunities,
  winRate,
  pipelineValue,
  highPriority,
  lostLeads,
  revenue,
  leadSources,
  newLeads,
  namedRecord,
  customers,
];

export function answerFromSnapshot(
  question: string,
  snapshot: AssistantSnapshot,
  now = new Date(snapshot.generatedAt)
): AssistantAnswer {
  const q = question.toLowerCase().replace(/[’']/g, "'").trim();
  if (q.length < 3) {
    return {
      answer: "Ask me anything about your leads, customers, quotations or follow-ups.",
      sources: [],
      grounded: false,
    };
  }
  for (const intent of INTENTS) {
    const result = intent(q, snapshot, now);
    if (result) return result;
  }
  return {
    answer: `${NOT_ENOUGH_INFO} I can only answer questions using your own leads, customers, quotations and follow-ups — for example, "${SUGGESTED_QUESTIONS[0]}" or "${SUGGESTED_QUESTIONS[1]}"`,
    sources: [],
    grounded: false,
  };
}
