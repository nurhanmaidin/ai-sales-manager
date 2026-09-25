# AI Sales Manager — Requirements

Consolidated from the original product spec + decisions locked in with the
project owner (Marshall). This document is the source of truth for scope;
`CLAUDE_CODE_PROMPT.md` is the execution prompt derived from it.

## 1. Product

**Name:** AI Sales Manager
**Tagline:** "Never lose a customer because you forgot to follow up."

**Target users:** Malaysian SMEs — renovation contractors, agencies,
wholesalers, service businesses, freelancers, small B2B businesses.

**Core workflow:**
`Lead → Understand Enquiry → AI Response → Quotation → Follow-up → Customer → Sale`

**Must NOT feel like:** a generic admin dashboard, an AI chatbot wrapper, a
school project, an AI-template-looking product, an ERP, a messy dev dashboard.

## 2. Locked-in Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Repository | Fresh, empty repo, no git | Greenfield build, git not required |
| Auth | NextAuth.js (Auth.js v5), credentials provider | Free, self-hosted, integrates with Prisma, no vendor lock-in |
| Quotation output | Browser print (CSS print stylesheet) | RM0 cost, no PDF library dependency, works everywhere; can add `@react-pdf/renderer` later if needed |
| Database | PostgreSQL via Docker Compose (local) | Free, resettable, no external account needed for dev |
| AI | `AIProvider` interface, `MockAIProvider` default via `AI_PROVIDER=mock` | App must run at RM0, no API key required |

## 3. UI/UX Bar

Premium, minimal, restrained — referencing Linear / Stripe / Notion / Attio
**in spirit, not in copy**. Inter or Geist font. Deep navy/indigo primary,
neutral grays, professional green/amber/muted-red for
success/warning/danger. Subtle borders and shadows, tasteful radius, Lucide
icons only (no emoji-as-UI). Every empty/loading/error state must be
intentional — see Design Principles section of the original spec for the
full checklist (simplicity, hierarchy, whitespace, typography scale, button
hierarchy, micro-interactions).

## 4. Tech Stack

Next.js (App Router) + TypeScript + React, Tailwind + shadcn/ui + Lucide,
PostgreSQL + Prisma, Zod, React Hook Form, Recharts, Vitest + Playwright,
ESLint + Prettier, NextAuth.js v5.

## 5. Application Modules

1. Marketing landing page
2. Authentication (sign up, login, logout, protected routes)
3. Onboarding (8-step: business name, type, owner name, phone, email,
   country [default Malaysia], currency [default MYR], description)
4. Dashboard (KPI cards, Needs Attention, Sales Pipeline, Recent Leads,
   Upcoming Follow-ups, AI Insights — all derived from real DB data, never
   fabricated)
5. Leads (table + optional kanban, filters, add/edit, detail page w/
   timeline, notes, AI suggestions)
6. Customers (profile, sales history, quotations, activities, notes;
   "Convert to Customer" flow from WON leads preserving history)
7. Quotations (list + two-column builder with live preview, item line
   calculations, print-optimized output)
8. Follow-ups (Today/Upcoming/Overdue/Completed views; complete/snooze/edit)
9. AI Assistant (data-grounded Q&A over the org's own leads/customers/
   quotations — never invents data; says "I don't have enough information"
   when the DB doesn't support an answer)
10. Settings (Business Profile, Team, AI Settings, Notifications, Data,
    Account)
11. Global search / Cmd+K command palette across leads, customers,
    quotations

## 6. Data Model (see `prisma/schema.prisma` for the authoritative version)

`User`, `Organization`, `OrganizationMember`, `Lead`, `Customer`,
`Quotation`, `QuotationItem`, `FollowUp`, `Activity`, `Note`,
`AIInteraction`, plus NextAuth's `Account`/`Session`/`VerificationToken`.

**Non-negotiable rule:** every business entity carries `organizationId`.
Every query resolves the organization from the authenticated session's
`OrganizationMember` — never from client input.

## 7. AI Layer

`AIProvider` interface with methods: `generateLeadReply`, `summarizeLead`,
`generateFollowUpSuggestion`, `generateQuotationDescription`,
`analyzePipeline`. `MockAIProvider` (implemented, deterministic, keyword-
based) is the default and requires zero configuration. Provider selected via
`AI_PROVIDER` env var (`mock` | `openai` | `anthropic` | `ollama`). AI must
be an enhancement, never a hard dependency — if AI fails or is unset, the
CRM keeps working.

## 8. Explicitly Out of Scope for MVP

Payroll, accounting, inventory, HR, project management, native mobile app,
full WhatsApp API integration, payment gateway, complex marketing
automation, full e-Invoice platform. Pricing tiers are displayed
(FREE/STARTER/BUSINESS/PRO) but paid tiers are marked "Coming Soon" — no
Stripe integration yet.

## 9. Testing & Quality Bar

Unit tests (Vitest): quotation calculations, lead creation/status changes,
customer conversion, follow-up creation, AI mock provider, authorization,
tenant isolation. E2E (Playwright): signup, login, create lead, generate AI
response, create quotation, create follow-up, convert lead to customer.

Before considering any milestone done: typecheck, lint, unit tests, e2e
tests, and production build must all pass clean. No TODOs, dead UI, console
errors, or broken routes left behind.

## 10. Suggested Build Phases

Given the scope, build in phases rather than one unreviewed pass:

1. **Foundation** — auth, organizations, onboarding, tenant-scoped Prisma
   queries, app shell (sidebar/topbar), design tokens/theme.
2. **Core CRM** — Leads (CRUD, detail, timeline), Customers, lead→customer
   conversion.
3. **AI features** — AIProvider wiring already scaffolded; lead reply
   generator UI, AI insights on dashboard, AI Assistant Q&A.
4. **Quotations** — builder, live preview, calculations, print output,
   status lifecycle.
5. **Follow-ups + Dashboard** — follow-up views, dashboard KPIs/sections
   tying everything together.
6. **Search, Settings, Landing page** — command palette, settings sections,
   marketing site, pricing display.
7. **Polish + QA** — seed data, responsive/accessibility pass, design
   self-review, full test suite, README finalization.

## 11. What's Already Scaffolded (do not redo from scratch)

- Folder structure under `src/` per the architecture spec
- `package.json` with the full dependency set
- `prisma/schema.prisma` — complete data model
- `docker-compose.yml` — local Postgres
- `.env.example`
- `src/lib/ai/types.ts`, `mock-provider.ts`, `index.ts` — AIProvider
  interface + working MockAIProvider + factory
- `src/lib/db/prisma.ts` — Prisma client singleton
- `prisma/seed.ts` — stub to fill in
- Tailwind/PostCSS/ESLint/Prettier/TS configs

Claude Code should inspect these first, then build on top of them rather
than re-scaffolding.
