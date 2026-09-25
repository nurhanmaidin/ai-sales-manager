import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Inbox,
  LayoutDashboard,
  MessageCircleWarning,
  MessagesSquare,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  AIResponsePreview,
  BrowserFrame,
  DashboardPreview,
  FollowUpPreview,
  PipelinePreview,
} from "@/components/marketing/previews";
import { QuotationPreview } from "@/components/marketing/quotation-preview";

export const metadata: Metadata = {
  title: "AI Sales Manager — Your AI Sales Manager for every customer",
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-primary">{children}</p>;
}

function SectionHeading({
  eyebrow,
  title,
  description,
  center,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {description && (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

const PROBLEMS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MessageCircleWarning,
    title: "Enquiries get buried",
    body: "Leads arrive on WhatsApp, Facebook and phone calls — and slip through the cracks between jobs.",
  },
  {
    icon: Clock,
    title: "Quotes take hours",
    body: "Rebuilding quotations in Word or Excel means customers wait, and the fastest competitor wins.",
  },
  {
    icon: BellRing,
    title: "Follow-ups are forgotten",
    body: "Most jobs are won on the second or third follow-up. Without reminders, they quietly go cold.",
  },
];

const STEPS = [
  {
    title: "Capture the lead",
    body: "Paste the enquiry from WhatsApp, your website or a call. Everything lives in one place.",
  },
  {
    title: "Understand it with AI",
    body: "AI summarises what they need, spots missing details and drafts a professional reply.",
  },
  {
    title: "Send a quotation",
    body: "Build a clean, branded quotation with SST and totals calculated for you — print or save as PDF.",
  },
  {
    title: "Follow up and win",
    body: "Reminders make sure every lead gets a next step, until it becomes a customer.",
  },
];

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Inbox,
    title: "Lead management",
    body: "Track every enquiry by status, priority, source and value — with search and filters.",
  },
  {
    icon: Sparkles,
    title: "AI replies",
    body: "Summaries, missing information and a ready-to-send reply. Friendlier, more formal or shorter in one click.",
  },
  {
    icon: FileText,
    title: "Quotations",
    body: "Live preview, automatic totals in RM, SST presets and a print-ready A4 layout.",
  },
  {
    icon: BellRing,
    title: "Follow-up reminders",
    body: "Today, upcoming and overdue at a glance. Complete, snooze or reschedule in a click.",
  },
  {
    icon: UserRound,
    title: "Customer history",
    body: "Convert won leads to customers and keep every quotation, note and conversation.",
  },
  {
    icon: LayoutDashboard,
    title: "Clear dashboard",
    body: "Your pipeline, what needs attention, and what to do next — every morning.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "RM0",
    description: "Everything you need to start following up properly.",
    features: [
      "Leads, customers & pipeline",
      "AI replies & AI Assistant (built-in)",
      "Unlimited quotations with PDF",
      "Follow-up reminders",
      "CSV export",
    ],
    cta: "Start free",
    available: true,
  },
  {
    name: "Starter",
    price: "RM99",
    description: "For growing teams that quote every day.",
    features: [
      "Everything in Free",
      "Up to 3 team members",
      "Custom quotation branding",
      "Email reminders",
    ],
    available: false,
  },
  {
    name: "Business",
    price: "RM249",
    description: "For busy sales teams with more moving parts.",
    features: [
      "Everything in Starter",
      "Up to 10 team members",
      "Roles & lead assignment",
      "Premium AI models",
    ],
    available: false,
  },
  {
    name: "Pro",
    price: "RM499",
    description: "For established businesses that want it all connected.",
    features: [
      "Everything in Business",
      "Unlimited team members",
      "WhatsApp Business integration",
      "Priority support",
    ],
    available: false,
  },
];

const FAQS = [
  {
    q: "Do I need an OpenAI or other AI account?",
    a: "No. AI Sales Manager includes a built-in AI that works out of the box at no extra cost. You don't need an API key to get started.",
  },
  {
    q: "Does it work with WhatsApp?",
    a: "Yes, in a practical way: paste enquiries you receive on WhatsApp, and send AI-drafted replies back through WhatsApp with one click. A deeper WhatsApp Business integration is on our roadmap.",
  },
  {
    q: "Can I send quotations as PDF?",
    a: "Yes. Every quotation has a print-ready A4 layout with your business details, line items, SST, terms and a signature area. Print it or save it as PDF straight from your browser.",
  },
  {
    q: "Does it handle SST?",
    a: "Yes. Choose 0%, 6% or 8% SST (or any rate) on each quotation and the totals are calculated for you in ringgit.",
  },
  {
    q: "Will the AI make things up?",
    a: "The AI Assistant only answers from your own leads, customers, quotations and follow-ups, and tells you the data it used. If your data can't answer a question, it says so.",
  },
  {
    q: "Is my customer data safe?",
    a: "Your workspace is completely separate from every other business, passwords are securely hashed, and you can export your data as CSV at any time.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[640px] opacity-60 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_65%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <Badge tone="primary" className="mx-auto">
            <Sparkles className="size-3" aria-hidden /> Built for Malaysian SMEs
          </Badge>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your AI Sales Manager for every customer.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Reply to enquiries in seconds, send professional quotations, and get reminded before a
            lead goes cold. Never lose a customer because you forgot to follow up.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="xl">
              <Link href="/register">
                Start free <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="xl" variant="secondary">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
          <p className="mt-5 text-sm text-subtle">Free plan · No credit card · No AI key needed</p>

          <div className="mx-auto mt-16 max-w-5xl">
            <BrowserFrame>
              <DashboardPreview />
            </BrowserFrame>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y bg-canvas py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="The problem"
            title="Most lost sales aren't lost to competitors. They're forgotten."
            description="Small businesses don't lose jobs because their work isn't good enough. They lose them in the gap between the enquiry and the follow-up."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-xl border bg-background p-6 shadow-card">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <p.icon className="size-4" aria-hidden />
                </span>
                <h3 className="mt-4 text-md font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            center
            eyebrow="How it works"
            title="From enquiry to customer in four steps"
          />
          <ol className="relative mt-14 grid gap-8 md:grid-cols-4 md:gap-6">
            <span
              aria-hidden
              className="absolute left-0 right-0 top-5 hidden h-px bg-border md:block"
            />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="relative flex size-10 items-center justify-center rounded-full border bg-background text-sm font-semibold text-primary shadow-xs">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-md font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* AI */}
      <section className="border-y bg-canvas py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="AI that does the heavy lifting"
              title="Understand every enquiry. Reply in seconds."
              description="AI reads the customer's message, pulls out the important details, tells you what's missing, and writes a reply in your voice."
            />
            <ul className="mt-8 space-y-3">
              {[
                "Summary, key details and missing information",
                "Ready-to-send reply — friendlier, more formal or shorter in one click",
                "Next best action for every lead",
                "Ask questions like “What's my pipeline value?” and get answers from your own data",
              ].map((f) => (
                <li key={f} className="flex gap-3 text-md">
                  <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">
            <AIResponsePreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            center
            eyebrow="Features"
            title="Everything you need to sell. Nothing you don't."
            description="No ERP complexity. Just the tools a busy owner actually uses, every day."
          />
          <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <f.icon className="size-4" aria-hidden />
                </span>
                <h3 className="mt-4 text-md font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quotations + pipeline */}
      <section className="border-y bg-canvas py-20 sm:py-28">
        <div className="mx-auto max-w-6xl space-y-24 px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
            <SectionHeading
              eyebrow="Quotations"
              title="Quotations your customers will take seriously."
              description="Build it once with a live preview. Totals, discounts and SST are calculated for you, and every quotation prints beautifully on A4."
            />
            <div className="min-w-0">
              <QuotationPreview />
            </div>
          </div>
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div className="order-2 min-w-0 space-y-4 lg:order-1">
              <PipelinePreview />
              <FollowUpPreview />
            </div>
            <div className="order-1 lg:order-2">
              <SectionHeading
                eyebrow="Pipeline & follow-ups"
                title="Know exactly where every deal stands."
                description="See your pipeline from New to Won, and a clear list of who to follow up with today. Overdue items stand out — without the panic."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            center
            eyebrow="Pricing"
            title="Simple pricing in ringgit"
            description="Start free today. Paid plans are coming soon."
          />
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "flex flex-col rounded-xl border bg-card p-6",
                  plan.available
                    ? "border-primary/40 shadow-popover ring-1 ring-primary/20"
                    : "shadow-card"
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-semibold">{plan.name}</h3>
                  {plan.available ? (
                    <Badge tone="primary">Available now</Badge>
                  ) : (
                    <Badge>Coming soon</Badge>
                  )}
                </div>
                <p className="mt-4">
                  <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground"> / month</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm">
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          plan.available ? "text-success" : "text-subtle"
                        )}
                        aria-hidden
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.available ? (
                  <Button asChild className="mt-8">
                    <Link href="/register">{plan.cta}</Link>
                  </Button>
                ) : (
                  <Button variant="secondary" className="mt-8" disabled>
                    Coming soon
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t bg-canvas py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading center eyebrow="FAQ" title="Questions, answered" />
          <div className="mt-12 divide-y rounded-xl border bg-background">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group px-5 py-1 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-md font-medium">
                  {f.q}
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="pb-5 text-md leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
            />
            <MessagesSquare className="relative mx-auto size-8 opacity-80" aria-hidden />
            <h2 className="relative mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Your next customer is already in your WhatsApp.
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-primary-foreground/75">
              Set up in five minutes. Start following up properly today.
            </p>
            <Button
              asChild
              size="xl"
              variant="secondary"
              className="relative mt-8 border-transparent"
            >
              <Link href="/register">
                Start free <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
