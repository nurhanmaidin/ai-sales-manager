import type {
  AIProvider,
  AssistantAnswer,
  AssistantInput,
  FollowUpSuggestionInput,
  LeadReplyInput,
  LeadReplyResult,
  LeadSummaryInput,
  PipelineAnalysisInput,
  QuotationDescriptionInput,
  RewriteReplyInput,
} from "./types";
import { answerFromSnapshot } from "./assistant-engine";

// Deterministic, keyword-driven AI simulation. No external calls, no cost.
// Good enough to demo convincingly; replace with a real provider later by
// implementing the same AIProvider interface.

const TOPICS: { match: RegExp; topic: string; missing: string[] }[] = [
  {
    match: /kitchen|cabinet|countertop/,
    topic: "kitchen renovation",
    missing: ["Kitchen size or layout", "Preferred cabinet and countertop materials"],
  },
  {
    match: /bathroom|toilet|shower|washroom/,
    topic: "bathroom renovation",
    missing: ["Number of bathrooms", "Whether plumbing needs to be moved"],
  },
  {
    match: /paint|repaint/,
    topic: "painting works",
    missing: ["Interior or exterior", "Number of rooms or wall area"],
  },
  {
    match: /roof|leak|waterproof/,
    topic: "roofing and waterproofing",
    missing: ["Location and extent of the leak", "Roof type"],
  },
  {
    match: /tile|tiling|floor/,
    topic: "flooring works",
    missing: ["Floor area", "Preferred tile or flooring type"],
  },
  {
    match: /renovat|makeover|refurbish|extension/,
    topic: "renovation project",
    missing: ["Scope of works", "Current condition of the space"],
  },
  {
    match: /logo|branding|brand identity/,
    topic: "branding project",
    missing: ["Brand guidelines or references", "Deliverables required"],
  },
  {
    match: /website|web site|landing page|ecommerce|e-commerce/,
    topic: "website project",
    missing: ["Number of pages", "Features needed (e.g. payments, booking)"],
  },
  {
    match: /social media|marketing|ads|campaign/,
    topic: "marketing campaign",
    missing: ["Target audience", "Campaign goals"],
  },
  {
    match: /cater|catering|event|wedding|buffet/,
    topic: "event catering",
    missing: ["Number of guests", "Event date and venue"],
  },
  {
    match: /wholesale|bulk|carton|supply|distributor/,
    topic: "bulk supply order",
    missing: ["Product specifications", "Order quantity per delivery"],
  },
];

const AREAS = [
  "kuala lumpur",
  "kl",
  "petaling jaya",
  "pj",
  "shah alam",
  "subang",
  "cheras",
  "puchong",
  "klang",
  "ampang",
  "cyberjaya",
  "putrajaya",
  "damansara",
  "bangsar",
  "setia alam",
  "kajang",
  "seremban",
  "johor bahru",
  "jb",
  "penang",
  "ipoh",
  "melaka",
  "mont kiara",
  "sri petaling",
  "bukit jalil",
];

const PROPERTY =
  /\b(condo|condominium|apartment|terrace|landed|semi-d|semi d|bungalow|office|shop ?lot|shophouse|townhouse|flat)\b/;
const URGENT = /\b(urgent|asap|as soon as possible|immediately|this week)\b/;
const TIMELINE =
  /\b(next (?:week|month|year)|this (?:month|year)|by (?:end of )?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|before (?:chinese new year|cny|hari raya|raya|deepavali|christmas)|in \d+ (?:weeks?|months?))\b/;

function detectBudget(text: string) {
  const m =
    text.match(/(?:rm|myr)\s?([\d,.]+)\s?(k|mil|million)?/i) ?? text.match(/([\d,.]+)\s?(k)\b/i);
  if (!m) return null;
  let value = Number(m[1]!.replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  const suffix = m[2]?.toLowerCase();
  if (suffix === "k") value *= 1_000;
  if (suffix === "mil" || suffix === "million") value *= 1_000_000;
  return value;
}

function formatRM(n: number) {
  return `RM${n.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sentences(text: string) {
  return text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [text.trim()];
}

export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async generateLeadReply(input: LeadReplyInput): Promise<LeadReplyResult> {
    const text = input.enquiryText.toLowerCase();
    const variant = Math.abs(input.variant ?? 0) % 3;

    const detectedInfo: string[] = [];
    const missingInfo: string[] = [];

    const topicMatch = TOPICS.find((t) => t.match.test(text));
    const topic = topicMatch?.topic ?? "general enquiry";
    if (topicMatch) detectedInfo.push(`Project type: ${capitalize(topic)}`);
    else missingInfo.push("What they need help with");

    const sizeMatch = text.match(
      /(\d[\d,]*)\s?(sq\.?\s?ft|sqft|square feet|sf|sqm|square met(?:er|re)s?|m2)/
    );
    if (sizeMatch)
      detectedInfo.push(`Size: approximately ${sizeMatch[1]} ${sizeMatch[2]!.replace(/\s/g, "")}`);
    else if (topicMatch && /renovation|flooring|painting|roof/.test(topic))
      missingInfo.push("Approximate size (sq ft)");

    const budget = detectBudget(text);
    if (budget) detectedInfo.push(`Budget: around ${formatRM(budget)}`);
    else missingInfo.push("Budget range");

    const property = text.match(PROPERTY);
    if (property) detectedInfo.push(`Property: ${capitalize(property[1]!)}`);

    const area = AREAS.find((a) => new RegExp(`\\b${a}\\b`).test(text));
    if (area)
      detectedInfo.push(
        `Location: ${area.length <= 3 ? area.toUpperCase() : area.replace(/\b\w/g, (c) => c.toUpperCase())}`
      );
    else if (topicMatch && /renovation|flooring|painting|roof|catering/.test(topic))
      missingInfo.push("Location of the site");

    const urgent = URGENT.test(text);
    const timeline = text.match(TIMELINE);
    if (urgent) detectedInfo.push("Timeline: Urgent");
    else if (timeline) detectedInfo.push(`Timeline: ${capitalize(timeline[1]!)}`);
    else missingInfo.push("Preferred timeline");

    for (const extra of topicMatch?.missing ?? []) {
      if (missingInfo.length >= 5) break;
      if (!missingInfo.includes(extra)) missingInfo.push(extra);
    }

    const firstName = input.leadName.split(" ")[0] ?? input.leadName;
    const summary = topicMatch
      ? `${input.leadName} is enquiring about a ${topic}${property ? ` for a ${property[1]}` : ""}${area ? ` in ${detectedInfo.find((d) => d.startsWith("Location"))!.slice(10)}` : ""}.${
          budget
            ? ` They have indicated a budget of around ${formatRM(budget)}.`
            : " No budget was mentioned."
        }${urgent ? " They want to move quickly." : ""}`
      : `${input.leadName} sent a general enquiry. It needs a few clarifying questions before it can be scoped or quoted.`;

    const openers = [
      `Hi ${firstName}, thank you for reaching out to ${input.businessName}!`,
      `Hi ${firstName}, thanks for getting in touch with ${input.businessName}.`,
      `Hello ${firstName}, thank you for your enquiry — we appreciate you considering ${input.businessName}.`,
    ];
    const interest = topicMatch
      ? [
          `We'd be glad to help with your ${topic}.`,
          `Your ${topic} sounds like a great project, and it's exactly the kind of work we do.`,
          `We can definitely help you with the ${topic}.`,
        ]
      : [
          "We'd love to learn more about what you need.",
          "We'd be happy to help — could you tell us a little more?",
          "Happy to help. A few quick details will let us point you in the right direction.",
        ];
    const questions = missingInfo.slice(0, 3).map((m) => m.charAt(0).toLowerCase() + m.slice(1));
    const ask =
      questions.length > 0
        ? `To prepare an accurate quotation, could you share: ${questions.join(", ")}?`
        : "We have what we need to prepare a quotation for you.";
    const siteVisit = /renovation|flooring|painting|roof/.test(topic);
    const nextStep = urgent
      ? "Since you'd like to move quickly, we can arrange a call today to get things started."
      : siteVisit
        ? "We'd also be happy to arrange a free site visit at a time that suits you."
        : "Once we have these details, we'll send over a proposal within one working day.";
    const closers = [
      "Looking forward to hearing from you.",
      "Speak soon!",
      "Thank you, and we look forward to working with you.",
    ];

    const suggestedReply = [
      openers[variant],
      interest[variant],
      ask,
      nextStep,
      closers[variant],
    ].join(" ");

    const recommendedAction =
      missingInfo.length >= 3
        ? "Reply with clarifying questions, then schedule a follow-up in 2 days."
        : urgent
          ? "Call today — this lead is time-sensitive."
          : siteVisit
            ? "Book a site visit, then prepare a quotation."
            : "Prepare and send a quotation.";

    return {
      summary,
      detectedInfo: detectedInfo.length > 0 ? detectedInfo : ["No specific details detected yet"],
      missingInfo,
      suggestedReply,
      recommendedAction,
    };
  }

  async rewriteReply(input: RewriteReplyInput): Promise<string> {
    const firstName = input.leadName.split(" ")[0] ?? input.leadName;
    const body = sentences(input.text).filter(
      (s) =>
        !/^(hi|hello|dear|hey)\b/i.test(s) &&
        !/^(looking forward|speak soon|thank you, and|kind regards|best regards|warm regards|cheers)/i.test(
          s
        )
    );
    // Drop the "thank you for reaching out" portion of an opener sentence.
    const core = body
      .map((s) =>
        s.replace(/^thanks? (you )?for (reaching out|getting in touch)[^.!?]*[.!?]\s*/i, "")
      )
      .filter(Boolean);

    switch (input.tone) {
      case "friendly":
        return [
          `Hi ${firstName}! Thanks so much for reaching out — really appreciate it.`,
          ...core.map((s) =>
            s
              .replace(/\bWe would\b/g, "We'd")
              .replace(/\bdo not\b/g, "don't")
              .replace(/\bcould you\b/gi, "could you")
          ),
          "No rush at all — just drop us a message whenever it suits you. Have a great day!",
        ].join(" ");
      case "formal":
        return [
          `Dear ${input.leadName},`,
          "",
          `Thank you for your enquiry to ${input.businessName}.`,
          core
            .map((s) =>
              s
                .replace(/\bWe'd\b/g, "We would")
                .replace(/\bwe'd\b/g, "we would")
                .replace(/\bcan't\b/g, "cannot")
                .replace(/\bdon't\b/g, "do not")
                .replace(/\bglad\b/g, "pleased")
                .replace(/\bhappy\b/g, "pleased")
                .replace(/!/g, ".")
            )
            .join(" "),
          "",
          "We look forward to your reply.",
          "",
          "Yours sincerely,",
          input.ownerName ? `${input.ownerName}\n${input.businessName}` : input.businessName,
        ].join("\n");
      case "shorter": {
        const question = core.find((s) => s.includes("?"));
        const lead = core.find((s) => s !== question);
        return [`Hi ${firstName}, thanks for your enquiry!`, lead, question]
          .filter(Boolean)
          .join(" ");
      }
    }
  }

  async summarizeLead(input: LeadSummaryInput): Promise<string> {
    const currency = input.currency ?? "MYR";
    const symbol = currency === "MYR" ? "RM" : `${currency} `;
    const value = input.estimatedValue
      ? `, worth an estimated ${symbol}${input.estimatedValue.toLocaleString("en-MY")}`
      : "";
    const stage = input.status.toLowerCase().replace(/_/g, " ");
    const text = input.description?.toLowerCase() ?? "";
    if (!text.trim())
      return `${input.leadName} is at the ${stage} stage${value}. No enquiry details recorded yet.`;

    const topic = TOPICS.find((t) => t.match.test(text))?.topic;
    const budget = detectBudget(text);
    const property = text.match(PROPERTY)?.[1];
    const facts = [
      budget ? `a stated budget of about ${formatRM(budget)}` : null,
      URGENT.test(text) ? "an urgent timeline" : TIMELINE.test(text) ? "a clear timeline" : null,
    ].filter(Boolean);
    return `${input.leadName} is at the ${stage} stage${value}. ${
      topic
        ? `They're enquiring about a ${topic}${property ? ` for a ${property}` : ""}`
        : "Their enquiry is general and needs clarifying"
    }${facts.length ? `, with ${facts.join(" and ")}` : ""}.`;
  }

  async generateFollowUpSuggestion(input: FollowUpSuggestionInput): Promise<string> {
    const name = input.leadName.split(" ")[0] ?? input.leadName;
    if (input.status === "WON")
      return `Deal won. Convert ${name} to a customer and ask for a referral once the work is delivered.`;
    if (input.status === "LOST")
      return `This lead is closed. Consider a friendly check-in in 3 months — circumstances change.`;
    if (!input.lastContactAt) {
      return `Reach out to ${name} for the first time today — fast replies win more jobs. Use the AI reply above as a starting point.`;
    }
    const daysSince = Math.floor((Date.now() - input.lastContactAt.getTime()) / 86_400_000);
    if (input.status === "QUOTATION_SENT" || input.hasQuotation) {
      return daysSince >= 3
        ? `It's been ${daysSince} days since you last spoke. Check whether ${name} has reviewed the quotation and has any questions.`
        : `Give ${name} a day or two to review the quotation, then follow up to answer questions.`;
    }
    if (input.status === "NEGOTIATION")
      return `Address ${name}'s remaining concerns and propose a clear start date to close the deal.`;
    if (daysSince >= 5) {
      return `It's been ${daysSince} days since you last contacted ${name}. Send a friendly check-in to keep the conversation warm.`;
    }
    if (input.status === "QUALIFIED")
      return `${name} looks qualified. Prepare a quotation while the conversation is fresh.`;
    return `Follow up with ${name} to confirm next steps and answer any outstanding questions.`;
  }

  async generateQuotationDescription(input: QuotationDescriptionInput): Promise<string> {
    const hint = input.itemHint.trim().replace(/\s+/g, " ");
    const lower = hint.toLowerCase();
    const LIBRARY: [RegExp, string][] = [
      [
        /cabinet/,
        "Supply and install kitchen cabinets (top and bottom), melamine finish with soft-close hinges, including installation and hardware.",
      ],
      [
        /countertop|worktop|quartz|granite/,
        "Supply and install 20mm quartz countertop, including cutting for sink and hob, edge polishing and sealing.",
      ],
      [
        /kitchen/,
        "Full kitchen renovation including cabinetry, countertop, plumbing fixtures, electrical points and installation labour.",
      ],
      [
        /bathroom|toilet/,
        "Complete bathroom renovation including hacking, waterproofing, wall and floor tiling, sanitary fittings and installation labour.",
      ],
      [
        /waterproof/,
        "Waterproofing membrane application (2 coats) with 24-hour ponding test before tiling.",
      ],
      [
        /tile|tiling/,
        "Supply and lay porcelain tiles including cement screed, tile adhesive, grouting and skirting.",
      ],
      [
        /paint/,
        "Professional painting including surface preparation, one coat of sealer and two coats of premium emulsion paint.",
      ],
      [
        /wardrobe/,
        "Built-in wardrobe with sliding doors, internal shelving and hanging rail, melamine finish, including installation.",
      ],
      [
        /ceiling|plaster/,
        "Plaster ceiling works including framing, boarding, skim coat and cornice finishing.",
      ],
      [
        /wiring|electric|lighting/,
        "Electrical works including new wiring, power points and lighting points, tested and certified by a registered wireman.",
      ],
      [
        /demolition|hacking|dismantle/,
        "Demolition and hacking works including debris removal and disposal from site.",
      ],
      [
        /logo|branding/,
        "Brand identity design including logo concepts, two rounds of revisions and final files for print and digital.",
      ],
      [
        /website/,
        "Website design and development including responsive layout, content setup and launch support.",
      ],
    ];
    const match = LIBRARY.find(([re]) => re.test(lower));
    if (match) return match[1];
    return `Supply and installation of ${hint.charAt(0).toLowerCase()}${hint.slice(1)}, including materials, labour and site cleaning.`;
  }

  async analyzePipeline(input: PipelineAnalysisInput): Promise<string[]> {
    const insights: string[] = [];
    const money = (n: number) =>
      `${input.currency === "MYR" ? "RM" : input.currency} ${n.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;

    if (input.overdueFollowUps > 0) {
      insights.push(
        `${input.overdueFollowUps} follow-up${input.overdueFollowUps === 1 ? " is" : "s are"} overdue. Clearing ${input.overdueFollowUps === 1 ? "it" : "them"} first protects deals that are about to go cold.`
      );
    }
    if (input.unansweredQuotations > 0) {
      insights.push(
        `${input.unansweredQuotations} quotation${input.unansweredQuotations === 1 ? " hasn't" : "s haven't"} received a response yet. A short check-in message often gets a decision.`
      );
    }
    if (input.staleLeads && input.staleLeads > 0) {
      insights.push(
        `${input.staleLeads} open lead${input.staleLeads === 1 ? " has" : "s have"} had no contact in over a week and no follow-up scheduled.`
      );
    }
    if (input.highestOpenValue > 0) {
      insights.push(
        `Your largest open opportunity${input.highestOpenLeadName ? ` is ${input.highestOpenLeadName} at` : " is"} ${money(input.highestOpenValue)}.`
      );
    }
    if (input.pipelineValue > 0) {
      insights.push(
        `Total open pipeline is ${money(input.pipelineValue)} across ${input.openLeads} lead${input.openLeads === 1 ? "" : "s"}.`
      );
    }
    if (input.acceptedValueThisMonth && input.acceptedValueThisMonth > 0) {
      insights.push(
        `You've won ${money(input.acceptedValueThisMonth)} in accepted quotations this month.`
      );
    }
    if (insights.length === 0) {
      insights.push(
        input.totalLeads === 0
          ? "No leads yet. Add your first enquiry to start building your pipeline."
          : "Everything is up to date — no overdue follow-ups or unanswered quotations."
      );
    }
    return insights.slice(0, 4);
  }

  async answerQuestion(input: AssistantInput): Promise<AssistantAnswer> {
    return answerFromSnapshot(input.question, input.snapshot);
  }
}
