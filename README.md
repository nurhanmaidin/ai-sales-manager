# AI Sales Manager

> "Never lose a customer because you forgot to follow up."

An AI-assisted CRM for Malaysian SMEs: renovation contractors, agencies, wholesalers,
freelancers and small B2B businesses. Capture leads, get AI-drafted replies, send
print-ready quotations, track follow-ups, and turn won leads into customers.

**Workflow:** Lead → Understand enquiry → AI response → Quotation → Follow-up → Customer → Sale

## Quick start

```bash
npm install
cp .env.example .env            # then set AUTH_SECRET: npx auth secret

# Database — either Docker…
npm run docker:up
# …or, without Docker, an embedded PostgreSQL (same port/credentials; keep it running):
npm run db:local

npm run db:migrate              # apply migrations
npm run db:seed                 # demo workspace: BrightBuild Renovation
npm run dev                     # http://localhost:3000
```

**Demo login:** `demo@brightbuild.my` / `Demo12345` (all demo people and businesses are fictional).

The app works fully with **zero AI cost and no API key** — `AI_PROVIDER=mock` is the default.

## What's inside

| Area | Highlights |
|---|---|
| Auth & onboarding | Auth.js v5 credentials (bcrypt, JWT sessions, httpOnly cookies), rate-limited login/sign-up, 8-step onboarding |
| Dashboard | Greeting summary, KPI cards (trends only with real comparison data), *Needs your attention*, pipeline by stage, upcoming follow-ups, recent leads, AI insights |
| Leads | Search + filters (status, priority, source, date), side-sheet form with smart defaults, detail page with pipeline stepper, timeline, notes, AI panel |
| AI | Response generator (summary, details, missing info, reply, next action; copy / WhatsApp / friendly / formal / shorten / regenerate), lead suggestions, dashboard insights, data-grounded AI Assistant |
| Quotations | Two-column builder with live A4 preview, integer-cent totals in RM, SST presets, lifecycle DRAFT→SENT→VIEWED→ACCEPTED/REJECTED/EXPIRED, print/PDF via browser |
| Follow-ups | Today / Overdue / Upcoming / Completed, complete (with undo), snooze, edit, delete |
| Customers | Convert WON leads (history carries over), lifetime value, sales history |
| Settings | Business profile, team, AI status + live test, in-app notification preferences, CSV export, account & password |
| Everywhere | Cmd/Ctrl+K command palette, skeleton loaders, intentional empty states, friendly errors, responsive mobile nav |

## Architecture

```
src/
  app/            Routes: (marketing) landing, (auth), (onboarding), (app), api/
  components/     ui/ primitives + domain components (leads, quotations, ai, …)
  lib/
    auth/         Auth.js config, tenant context, permissions, account creation
    ai/           AIProvider interface, MockAIProvider, assistant engine, AI service
    leads/ customers/ quotations/ followups/ notes/ activities/   Service layer
    dashboard/    Real pipeline metrics + attention items
    validators/   Zod schemas (shared by client and server)
  server/         Server actions — thin wrappers around services
prisma/           schema.prisma, migrations, seed.ts
tests/            unit/ (Vitest, real Postgres schema) · e2e/ (Playwright)
```

Business logic lives in services (`leadService.create()`, `quotationService.calculateTotals()`,
`leadService.convertToCustomer()` …). Server actions only resolve the tenant, call a service,
and revalidate. Quotation totals are always recomputed on the server.

## Multi-tenancy & security

- Every business entity carries `organizationId`. The organization is resolved **only** from the
  signed-in user's `OrganizationMember` (`requireTenant()`); client-supplied ids are ignored and
  every referenced record (lead, customer, quotation, note, follow-up) is re-checked inside the tenant.
- All input is validated with Zod; errors shown to users are safe messages, never stack traces.
- bcrypt password hashing, httpOnly session cookies, security headers (`X-Frame-Options`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production).
- Rate limits on login, sign-up, password change, search, export and AI calls (in-memory; swap
  for Redis when running multiple instances).
- CSV exports neutralise spreadsheet formulas. API keys are never sent to the browser.

## AI providers

`src/lib/ai/types.ts` defines `AIProvider`. `MockAIProvider` is deterministic and free. The AI
Assistant answers only from a snapshot of the organization's own data and cites it; unsupported
questions get *"I don't have enough information to answer that."*

To add a real provider, implement `AIProvider` and register it in `src/lib/ai/index.ts`
(`IMPLEMENTED` + the factory switch), then set `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`.
If a configured provider is unavailable or a call fails, the app falls back to the mock
provider and keeps working.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` · `npm run lint` | TypeScript · ESLint |
| `npm test` | Unit + service tests (Vitest; resets the isolated `vitest` schema only) |
| `npm run test:e2e` | Playwright end-to-end, accessibility (axe) and mobile checks |
| `npm run db:migrate` · `db:seed` · `db:reset` · `db:studio` | Database |
| `npm run db:local` | Embedded PostgreSQL when Docker isn't available |
| `npm run docker:up` / `docker:down` | Docker PostgreSQL |

Running the e2e suite against a production build: `RATE_LIMIT_MULTIPLIER=50 npm start`, then
`npm run test:e2e` (the suite creates several accounts, which production rate limits would block).

## Notes & roadmap

- `TZ=Asia/Kuala_Lumpur` controls "today" and "overdue".
- Out of scope for the MVP: payments, invoicing/e-Invoice, inventory, HR, native apps, full
  WhatsApp API. Paid pricing tiers are shown as *Coming soon*; team invitations and email
  reminders are planned.

## License

Proprietary — internal project.
