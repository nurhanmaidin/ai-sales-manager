// Demo data: "BrightBuild Renovation" — 10 leads, 5 customers, 8 quotations,
// 7 follow-ups, plus activities and notes. All people and businesses are
// fictional. Dates are relative to "now" so the dashboard always looks live.
//
// Run with: npm run db:seed   (idempotent — replaces the demo workspace)
//
// Demo login: demo@brightbuild.my / Demo12345

import {
  PrismaClient,
  type ActivityType,
  type LeadPriority,
  type LeadSource,
  type LeadStatus,
  type QuotationStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculateTotals, formatQuotationNumber } from "../src/lib/quotations/calculations";
import { MockAIProvider } from "../src/lib/ai/mock-provider";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@brightbuild.my";
const DEMO_PASSWORD = "Demo12345";

const now = new Date();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(now.getTime() - ms);
const ahead = (ms: number) => new Date(now.getTime() + ms);
const todayAt = (hours: number, minutes = 0) => {
  const d = new Date(now);
  d.setHours(hours, minutes, 0, 0);
  // Keep "today" items in the future-ish part of the day when seeding late.
  return d.getTime() < now.getTime() - HOUR ? ahead(2 * HOUR) : d;
};

type LeadSeed = {
  key: string;
  name: string;
  company?: string;
  email?: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  value: number;
  createdAt: Date;
  lastContactAt?: Date;
  /** When the lead was won or lost. */
  closedAt?: Date;
  description: string;
  history: LeadStatus[];
};

const LEADS: LeadSeed[] = [
  {
    key: "tan",
    name: "Tan Wei Ming",
    email: "weiming.tan@example.com",
    phone: "012-338 4721",
    source: "WHATSAPP",
    status: "NEW",
    priority: "HIGH",
    value: 28000,
    createdAt: ago(2 * HOUR),
    description:
      "Hi, I'd like a quote to renovate my kitchen in my PJ condo, around 120 sqft. Looking for new cabinets, quartz countertop and better lighting. Budget about RM25k. Hoping to get it done before Chinese New Year.",
    history: [],
  },
  {
    key: "nurul",
    name: "Nurul Aisyah Rahman",
    email: "nurul.aisyah@example.com",
    phone: "019-552 0914",
    source: "WEBSITE",
    status: "CONTACTED",
    priority: "MEDIUM",
    value: 18500,
    createdAt: ago(5 * DAY),
    lastContactAt: ago(4 * DAY),
    description:
      "Salam, we have two bathrooms in our terrace house in Shah Alam that need a complete makeover — retiling, new fittings and waterproofing. Can your team come for a site visit?",
    history: ["CONTACTED"],
  },
  {
    key: "rajesh",
    name: "Rajesh Kumar",
    company: "Kumar Dental Clinic",
    email: "rajesh@kumardental.example.com",
    phone: "016-221 7788",
    source: "REFERRAL",
    status: "QUALIFIED",
    priority: "HIGH",
    value: 85000,
    createdAt: ago(9 * DAY),
    lastContactAt: ago(2 * DAY),
    description:
      "Referred by Karen Teoh. We're opening a second clinic in Subang, 1,200 sqft shoplot. Need partitioning, plumbing for 3 dental chairs, ceiling and flooring. Target opening in 3 months.",
    history: ["CONTACTED", "QUALIFIED"],
  },
  {
    key: "lim",
    name: "Lim Mei Ling",
    email: "meiling.lim@example.com",
    phone: "017-890 2231",
    source: "INSTAGRAM",
    status: "QUOTATION_SENT",
    priority: "HIGH",
    value: 62000,
    createdAt: ago(14 * DAY),
    lastContactAt: ago(6 * DAY),
    description:
      "Saw your Mont Kiara project on Instagram. We just bought a 1,400 sqft condo and want a full renovation — kitchen, 2 bathrooms, built-in wardrobes and flooring. Budget RM60k.",
    history: ["CONTACTED", "QUALIFIED", "QUOTATION_SENT"],
  },
  {
    key: "ahmad",
    name: "Ahmad Faizal",
    email: "faizal.ahmad@example.com",
    phone: "013-447 6102",
    source: "PHONE",
    status: "QUOTATION_SENT",
    priority: "MEDIUM",
    value: 7800,
    createdAt: ago(12 * DAY),
    lastContactAt: ago(9 * DAY),
    description:
      "Roof is leaking badly at the back of my house in Cheras after the recent storms. Need waterproofing urgent before the monsoon gets worse.",
    history: ["CONTACTED", "QUOTATION_SENT"],
  },
  {
    key: "chong",
    name: "Chong Kah Wai",
    company: "Kopi Corner Café",
    email: "hello@kopicorner.example.com",
    phone: "012-765 3390",
    source: "FACEBOOK",
    status: "NEGOTIATION",
    priority: "HIGH",
    value: 48000,
    createdAt: ago(21 * DAY),
    lastContactAt: ago(1 * DAY),
    description:
      "Opening a café in a Puchong shoplot. Need full fit-out: counter, kitchen area, feature wall, lighting and seating for 30 pax. Want to open next month.",
    history: ["CONTACTED", "QUALIFIED", "QUOTATION_SENT", "NEGOTIATION"],
  },
  {
    key: "siti",
    name: "Siti Hajar",
    phone: "011-2345 8876",
    source: "FACEBOOK",
    status: "NEW",
    priority: "LOW",
    value: 6500,
    createdAt: ago(3 * DAY),
    description: "How much to repaint a 3 bedroom terrace house in Kajang? Interior only.",
    history: [],
  },
  {
    key: "daniel",
    name: "Daniel Wong",
    email: "daniel.wong@example.com",
    phone: "012-908 1156",
    source: "WHATSAPP",
    status: "WON",
    priority: "MEDIUM",
    value: 34000,
    createdAt: ago(40 * DAY),
    lastContactAt: ago(3 * DAY),
    closedAt: ago(9 * DAY),
    description:
      "Looking to redo our kitchen and add built-in wardrobes for 2 bedrooms in our Bangsar apartment. Budget around RM35k.",
    history: ["CONTACTED", "QUALIFIED", "QUOTATION_SENT", "NEGOTIATION", "WON"],
  },
  {
    key: "priya",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    phone: "016-334 9021",
    source: "REFERRAL",
    status: "WON",
    priority: "MEDIUM",
    value: 12000,
    createdAt: ago(32 * DAY),
    lastContactAt: ago(8 * DAY),
    closedAt: ago(7.5 * DAY),
    description:
      "Master bathroom in Damansara needs retiling and a new vanity. Tiles are cracked and loose.",
    history: ["CONTACTED", "QUOTATION_SENT", "WON"],
  },
  {
    key: "hafiz",
    name: "Hafiz Iskandar",
    email: "hafiz.iskandar@example.com",
    phone: "019-876 5540",
    source: "WEBSITE",
    status: "LOST",
    priority: "MEDIUM",
    value: 9000,
    createdAt: ago(28 * DAY),
    lastContactAt: ago(18 * DAY),
    closedAt: ago(18 * DAY),
    description: "Need vinyl flooring for 900 sqft in Setia Alam. Comparing a few quotes.",
    history: ["CONTACTED", "QUOTATION_SENT", "LOST"],
  },
];

const DIRECT_CUSTOMERS = [
  {
    key: "karen",
    name: "Karen Teoh",
    email: "karen.teoh@example.com",
    phone: "012-600 4478",
    address: "18, Jalan Setiabakti 6,\nBukit Damansara, 50490 Kuala Lumpur",
    notes: "Prefers WhatsApp. Very happy with the extension — referred Rajesh Kumar.",
    createdAt: ago(130 * DAY),
  },
  {
    key: "zul",
    name: "Mohd Zulkifli",
    company: "Zul Trading Sdn Bhd",
    email: "zul@zultrading.example.com",
    phone: "03-5566 2210",
    address: "Lot 7, Jalan Perusahaan 2,\n40150 Shah Alam, Selangor",
    notes: "Pays within 30 days. Contact accounts@ for invoices.",
    createdAt: ago(100 * DAY),
  },
  {
    key: "farah",
    name: "Farah Nadia",
    company: "Nadia Beauty Studio",
    email: "farah@nadiabeauty.example.com",
    phone: "017-223 5519",
    address: "12-1, Jalan PJU 5/9, Kota Damansara,\n47810 Petaling Jaya",
    createdAt: ago(70 * DAY),
  },
];

type QuoteSeed = {
  customerKey?: string;
  leadKey?: string;
  title: string;
  status: QuotationStatus;
  issued: Date;
  discount?: number;
  items: { description: string; quantity: number; unit: string; unitPrice: number }[];
  notes?: string;
};

const QUOTES: QuoteSeed[] = [
  {
    customerKey: "karen",
    title: "Bungalow rear extension",
    status: "ACCEPTED",
    issued: ago(120 * DAY),
    discount: 2000,
    items: [
      { description: "Demolition and site clearing", quantity: 1, unit: "lot", unitPrice: 6500 },
      {
        description: "Reinforced concrete structure, 380 sqft extension",
        quantity: 380,
        unit: "sqft",
        unitPrice: 145,
      },
      {
        description: "Roofing with metal deck and insulation",
        quantity: 380,
        unit: "sqft",
        unitPrice: 48,
      },
      {
        description: "Electrical wiring, lighting points and DB upgrade",
        quantity: 1,
        unit: "lot",
        unitPrice: 8800,
      },
      {
        description: "Homogeneous floor tiling incl. skirting",
        quantity: 380,
        unit: "sqft",
        unitPrice: 22,
      },
    ],
  },
  {
    customerKey: "zul",
    title: "Warehouse office partition",
    status: "ACCEPTED",
    issued: ago(92 * DAY),
    items: [
      {
        description: "Gypsum board partition with rockwool insulation",
        quantity: 640,
        unit: "sqft",
        unitPrice: 16,
      },
      {
        description: "Glass swing doors with frameless fittings",
        quantity: 3,
        unit: "set",
        unitPrice: 1450,
      },
      {
        description: "Ceiling board and LED panel lights",
        quantity: 1,
        unit: "lot",
        unitPrice: 3810,
      },
    ],
  },
  {
    customerKey: "farah",
    title: "Beauty salon renovation",
    status: "ACCEPTED",
    issued: ago(62 * DAY),
    discount: 500,
    items: [
      {
        description: "Feature wall with fluted panels and cove lighting",
        quantity: 1,
        unit: "lot",
        unitPrice: 7200,
      },
      {
        description: "Treatment room partitions (4 rooms)",
        quantity: 4,
        unit: "unit",
        unitPrice: 2650,
      },
      { description: "Vinyl flooring, 5mm SPC", quantity: 680, unit: "sqft", unitPrice: 9.5 },
      { description: "Plumbing for 2 wash basins", quantity: 2, unit: "set", unitPrice: 1350 },
    ],
  },
  {
    leadKey: "daniel",
    title: "Kitchen and built-in wardrobes",
    status: "ACCEPTED",
    issued: ago(12 * DAY),
    discount: 1000,
    items: [
      {
        description: "Kitchen cabinets, top and bottom, melamine with soft-close",
        quantity: 18,
        unit: "ft",
        unitPrice: 780,
      },
      { description: "Quartz countertop, 20mm", quantity: 18, unit: "ft", unitPrice: 420 },
      {
        description: "Built-in wardrobe, 8ft, sliding doors",
        quantity: 2,
        unit: "unit",
        unitPrice: 4900,
      },
      {
        description: "Hacking, plumbing and electrical points",
        quantity: 1,
        unit: "lot",
        unitPrice: 3080,
      },
    ],
  },
  {
    leadKey: "priya",
    title: "Master bathroom retiling",
    status: "ACCEPTED",
    issued: ago(10 * DAY),
    items: [
      {
        description: "Hacking existing tiles and disposal",
        quantity: 1,
        unit: "lot",
        unitPrice: 1400,
      },
      { description: "Waterproofing membrane, 2 coats", quantity: 85, unit: "sqft", unitPrice: 12 },
      {
        description: "Wall and floor tiling, 600x600 porcelain",
        quantity: 210,
        unit: "sqft",
        unitPrice: 28,
      },
      {
        description: "Vanity cabinet with basin and mixer",
        quantity: 1,
        unit: "set",
        unitPrice: 2400,
      },
    ],
  },
  {
    leadKey: "lim",
    title: "Full condo renovation, Mont Kiara",
    status: "VIEWED",
    issued: ago(6 * DAY),
    discount: 1500,
    notes: "Includes 12 months workmanship warranty.",
    items: [
      {
        description: "Kitchen cabinets and quartz countertop",
        quantity: 1,
        unit: "lot",
        unitPrice: 18500,
      },
      {
        description: "Bathroom renovation (2 bathrooms)",
        quantity: 2,
        unit: "unit",
        unitPrice: 9800,
      },
      {
        description: "Built-in wardrobes (3 bedrooms)",
        quantity: 3,
        unit: "unit",
        unitPrice: 4200,
      },
      { description: "SPC vinyl flooring", quantity: 1100, unit: "sqft", unitPrice: 8 },
    ],
  },
  {
    leadKey: "ahmad",
    title: "Roof waterproofing",
    status: "SENT",
    issued: ago(9 * DAY),
    items: [
      {
        description: "Roof inspection and replacement of broken tiles",
        quantity: 1,
        unit: "lot",
        unitPrice: 1800,
      },
      {
        description: "Torch-on membrane waterproofing",
        quantity: 320,
        unit: "sqft",
        unitPrice: 14.5,
      },
      { description: "Gutter repair and resealing", quantity: 1, unit: "lot", unitPrice: 950 },
    ],
  },
  {
    leadKey: "rajesh",
    title: "Dental clinic fit-out, Subang",
    status: "DRAFT",
    issued: ago(1 * DAY),
    items: [
      {
        description: "Partitioning for 3 treatment rooms and X-ray room",
        quantity: 1,
        unit: "lot",
        unitPrice: 21500,
      },
      {
        description: "Plumbing and suction lines for 3 dental chairs",
        quantity: 3,
        unit: "set",
        unitPrice: 4800,
      },
      { description: "Ceiling works with LED panels", quantity: 1200, unit: "sqft", unitPrice: 11 },
      { description: "Anti-bacterial vinyl flooring", quantity: 1200, unit: "sqft", unitPrice: 12 },
    ],
  },
];

const TERMS = [
  "Quotation is valid for 30 days from the issue date.",
  "50% deposit is required upon confirmation; balance upon completion.",
  "Any additional work outside this scope will be quoted separately.",
].join("\n");

async function main() {
  // Idempotent: remove any previous demo workspace (cascades to its data).
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: { memberships: true },
  });
  if (existing) {
    await prisma.organization.deleteMany({
      where: { id: { in: existing.memberships.map((m) => m.organizationId) } },
    });
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const user = await prisma.user.create({
    data: {
      name: "Aisyah Rahman",
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: "BrightBuild Renovation",
      businessType: "Renovation & Construction",
      ownerName: "Aisyah Rahman",
      phone: "+60 3-7890 1234",
      email: "hello@brightbuild.my",
      website: "brightbuild.my",
      address: "23-G, Jalan SS 21/39, Damansara Utama,\n47400 Petaling Jaya, Selangor",
      registrationNumber: "202301045678 (1512345-K)",
      taxInfo: "SST No. W10-2301-32000123",
      country: "Malaysia",
      currency: "MYR",
      description:
        "BrightBuild designs and renovates kitchens, bathrooms, homes and small commercial spaces across the Klang Valley.",
      onboardingCompletedAt: ago(140 * DAY),
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const organizationId = org.id;
  const activity = (
    type: ActivityType,
    description: string,
    createdAt: Date,
    links: { leadId?: string; customerId?: string; quotationId?: string }
  ) =>
    prisma.activity.create({
      data: { organizationId, userId: user.id, type, description, createdAt, ...links },
    });

  // ---- Leads ---------------------------------------------------------------
  const leadIds: Record<string, string> = {};
  const SOURCE_LABEL: Record<LeadSource, string> = {
    WHATSAPP: "WhatsApp",
    WEBSITE: "Website",
    FACEBOOK: "Facebook",
    INSTAGRAM: "Instagram",
    REFERRAL: "Referral",
    PHONE: "Phone call",
    EMAIL: "Email",
    OTHER: "Other",
  };
  const STATUS_LABEL: Record<LeadStatus, string> = {
    NEW: "New",
    CONTACTED: "Contacted",
    QUALIFIED: "Qualified",
    QUOTATION_SENT: "Quotation Sent",
    NEGOTIATION: "Negotiation",
    WON: "Won",
    LOST: "Lost",
  };

  for (const l of LEADS) {
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        name: l.name,
        company: l.company,
        email: l.email,
        phone: l.phone,
        source: l.source,
        status: l.status,
        priority: l.priority,
        estimatedValue: l.value,
        description: l.description,
        assignedUserId: user.id,
        lastContactAt: l.lastContactAt,
        createdAt: l.createdAt,
      },
    });
    leadIds[l.key] = lead.id;

    await activity("LEAD_CREATED", `Lead created from ${SOURCE_LABEL[l.source]}`, l.createdAt, {
      leadId: lead.id,
    });
    let previous: LeadStatus = "NEW";
    // Spread status changes so they line up with the quotation date and the
    // close date, keeping every timeline chronologically believable.
    const start = l.createdAt.getTime();
    const end = (l.closedAt ?? l.lastContactAt ?? now).getTime();
    const quote = QUOTES.find((q) => q.leadKey === l.key);
    const sentIndex = l.history.indexOf("QUOTATION_SENT");
    const anchor = quote && sentIndex >= 0 ? quote.issued.getTime() + HOUR : null;
    for (const [i, status] of l.history.entries()) {
      let t: number;
      if (anchor === null) t = start + ((end - start) * (i + 1)) / (l.history.length + 1);
      else if (i < sentIndex) t = start + ((anchor - start) * (i + 1)) / (sentIndex + 1);
      else if (i === sentIndex) t = anchor;
      else
        t =
          anchor +
          ((Math.max(end, anchor + HOUR) - anchor) * (i - sentIndex)) /
            (l.history.length - 1 - sentIndex);
      const at = new Date(t);
      await activity(
        "STATUS_CHANGED",
        `Status changed from ${STATUS_LABEL[previous]} to ${STATUS_LABEL[status]}`,
        at,
        {
          leadId: lead.id,
        }
      );
      previous = status;
    }
  }

  // Real AI drafts (from the built-in provider) for leads the team already replied to.
  const ai = new MockAIProvider();
  for (const [key, at] of [
    ["nurul", ago(4 * DAY + HOUR)],
    ["rajesh", ago(9 * DAY - 2 * HOUR)],
    ["chong", ago(20 * DAY)],
  ] as const) {
    const seed = LEADS.find((l) => l.key === key)!;
    const reply = await ai.generateLeadReply({
      leadName: seed.name,
      enquiryText: seed.description,
      businessName: org.name,
    });
    await prisma.aIInteraction.create({
      data: {
        organizationId,
        userId: user.id,
        leadId: leadIds[key],
        type: "LEAD_REPLY",
        prompt: seed.description,
        response: JSON.stringify(reply),
        provider: ai.name,
        createdAt: at,
      },
    });
    await activity("AI_REPLY_GENERATED", "AI drafted a reply to the enquiry", at, {
      leadId: leadIds[key],
    });
  }

  // ---- Customers -----------------------------------------------------------
  const customerIds: Record<string, string> = {};
  for (const c of DIRECT_CUSTOMERS) {
    const customer = await prisma.customer.create({
      data: {
        organizationId,
        name: c.name,
        company: c.company,
        email: c.email,
        phone: c.phone,
        address: c.address,
        notes: c.notes,
        createdAt: c.createdAt,
      },
    });
    customerIds[c.key] = customer.id;
    await activity("CUSTOMER_CREATED", "Customer added", c.createdAt, { customerId: customer.id });
  }

  // Won leads converted to customers (history is linked to both).
  for (const key of ["daniel", "priya"] as const) {
    const seed = LEADS.find((l) => l.key === key)!;
    const convertedAt = ago(key === "daniel" ? 8.5 * DAY : 7 * DAY);
    const customer = await prisma.customer.create({
      data: {
        organizationId,
        name: seed.name,
        email: seed.email,
        phone: seed.phone,
        address:
          key === "daniel"
            ? "B-12-3, Residensi Bangsar,\n59100 Kuala Lumpur"
            : "7, Jalan SS 20/11, Damansara Kim,\n47400 Petaling Jaya",
        createdAt: convertedAt,
      },
    });
    customerIds[key] = customer.id;
    await prisma.lead.update({
      where: { id: leadIds[key] },
      data: { convertedCustomerId: customer.id },
    });
    await prisma.activity.updateMany({
      where: { leadId: leadIds[key] },
      data: { customerId: customer.id },
    });
    await activity("CUSTOMER_CREATED", "Converted to customer from won lead", convertedAt, {
      leadId: leadIds[key],
      customerId: customer.id,
    });
  }

  // ---- Quotations ----------------------------------------------------------
  const year = now.getFullYear();
  let seq = 0;
  for (const q of QUOTES) {
    seq += 1;
    const totals = calculateTotals(q.items, q.discount ?? 0, 8);
    const leadId = q.leadKey ? leadIds[q.leadKey] : undefined;
    const customerId = q.customerKey
      ? customerIds[q.customerKey]
      : q.leadKey
        ? customerIds[q.leadKey]
        : undefined;
    const quotation = await prisma.quotation.create({
      data: {
        organizationId,
        quotationNumber: formatQuotationNumber(year, seq),
        title: q.title,
        leadId,
        customerId,
        issueDate: q.issued,
        expiryDate: new Date(q.issued.getTime() + 30 * DAY),
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxRate: 8,
        tax: totals.tax,
        total: totals.total,
        currency: "MYR",
        notes: q.notes ?? "Price includes materials, labour and site cleaning upon completion.",
        terms: TERMS,
        status: q.status,
        createdAt: q.issued,
        updatedAt: q.status === "ACCEPTED" ? new Date(q.issued.getTime() + 3 * DAY) : q.issued,
        items: {
          create: q.items.map((item, i) => ({
            ...item,
            total: totals.lines[i]!.total,
            sortOrder: i,
          })),
        },
      },
    });
    await activity(
      "QUOTATION_CREATED",
      `Quotation ${quotation.quotationNumber} created`,
      q.issued,
      {
        leadId,
        customerId,
        quotationId: quotation.id,
      }
    );
    if (q.status !== "DRAFT") {
      await activity(
        "QUOTATION_STATUS_CHANGED",
        `Quotation ${quotation.quotationNumber} marked as ${q.status.toLowerCase()}`,
        new Date(q.issued.getTime() + (q.status === "SENT" ? HOUR : 2 * DAY)),
        { leadId, customerId, quotationId: quotation.id }
      );
    }
  }

  // ---- Follow-ups ----------------------------------------------------------
  const followUps: {
    leadKey?: string;
    customerKey?: string;
    task: string;
    dueDate: Date;
    priority: LeadPriority;
    completedAt?: Date;
  }[] = [
    {
      leadKey: "tan",
      task: "Reply to kitchen enquiry and propose a site visit",
      dueDate: todayAt(11),
      priority: "HIGH",
    },
    {
      leadKey: "nurul",
      task: "Send bathroom design references",
      dueDate: ago(2 * DAY),
      priority: "MEDIUM",
    },
    {
      leadKey: "lim",
      task: "Check if quotation was reviewed; offer a walkthrough",
      dueDate: todayAt(16),
      priority: "HIGH",
    },
    {
      leadKey: "ahmad",
      task: "Follow up on waterproofing quotation",
      dueDate: ago(1 * DAY),
      priority: "MEDIUM",
    },
    {
      leadKey: "chong",
      task: "Confirm revised scope and payment schedule",
      dueDate: ahead(1 * DAY),
      priority: "HIGH",
    },
    {
      leadKey: "rajesh",
      task: "Site measurement at the Subang clinic",
      dueDate: ahead(3 * DAY),
      priority: "HIGH",
    },
    {
      leadKey: "daniel",
      task: "Confirm handover date for kitchen",
      dueDate: ago(4 * DAY),
      priority: "MEDIUM",
      completedAt: ago(3 * DAY),
    },
  ];

  for (const f of followUps) {
    const leadId = f.leadKey ? leadIds[f.leadKey] : undefined;
    const customerId = f.customerKey
      ? customerIds[f.customerKey]
      : f.leadKey
        ? customerIds[f.leadKey]
        : undefined;
    const leadCreated = LEADS.find((l) => l.key === f.leadKey)?.createdAt ?? ago(5 * DAY);
    const scheduledAt = new Date(
      Math.max(leadCreated.getTime() + 10 * 60_000, ago(5 * DAY).getTime())
    );
    await prisma.followUp.create({
      data: {
        organizationId,
        leadId,
        customerId,
        task: f.task,
        dueDate: f.dueDate,
        priority: f.priority,
        status: f.completedAt ? "COMPLETED" : "PENDING",
        completedAt: f.completedAt,
        createdAt: scheduledAt,
      },
    });
    await activity("FOLLOW_UP_SCHEDULED", `Follow-up scheduled: ${f.task}`, scheduledAt, {
      leadId,
      customerId,
    });
    if (f.completedAt) {
      await activity("FOLLOW_UP_COMPLETED", `Follow-up completed: ${f.task}`, f.completedAt, {
        leadId,
        customerId,
      });
    }
    if (leadId && !f.completedAt) {
      await prisma.lead.update({ where: { id: leadId }, data: { nextFollowUpAt: f.dueDate } });
    }
  }

  // ---- Notes ---------------------------------------------------------------
  const notes: { leadKey?: string; customerKey?: string; content: string; at: Date }[] = [
    {
      leadKey: "rajesh",
      content:
        "Needs dental chair plumbing to follow the supplier's spec sheet — asked him to email it over.",
      at: ago(2 * DAY),
    },
    {
      leadKey: "lim",
      content: "Husband is the decision maker. Prefers warm oak finishes and hidden storage.",
      at: ago(10 * DAY),
    },
    {
      leadKey: "chong",
      content: "Wants to cut the feature wall to save ~RM4k. Open to phasing seating for later.",
      at: ago(1 * DAY),
    },
    {
      leadKey: "ahmad",
      content: "Mentioned another contractor quoted RM6,900 but without warranty.",
      at: ago(9 * DAY),
    },
    {
      customerKey: "karen",
      content: "Asked about a pergola for the garden next year — follow up in Q1.",
      at: ago(30 * DAY),
    },
    {
      leadKey: "daniel",
      content: "Handover went smoothly. Asked for a Google review.",
      at: ago(3 * DAY),
    },
  ];
  for (const n of notes) {
    const leadId = n.leadKey ? leadIds[n.leadKey] : undefined;
    const customerId = n.customerKey
      ? customerIds[n.customerKey]
      : n.leadKey
        ? customerIds[n.leadKey]
        : undefined;
    await prisma.note.create({
      data: {
        organizationId,
        userId: user.id,
        content: n.content,
        leadId,
        customerId,
        createdAt: n.at,
      },
    });
    await activity(
      "NOTE_ADDED",
      n.content.length > 90 ? `${n.content.slice(0, 90)}…` : n.content,
      n.at,
      { leadId, customerId }
    );
  }

  console.log("Seeded BrightBuild Renovation");
  console.log(`  Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
