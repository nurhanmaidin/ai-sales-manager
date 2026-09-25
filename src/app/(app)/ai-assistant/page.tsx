import type { Metadata } from "next";
import { Database, FileText, BellRing, ShieldCheck, UserRound, Users } from "lucide-react";
import { requireTenantPage } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { aiService } from "@/lib/ai/service";
import { SUGGESTED_QUESTIONS } from "@/lib/ai/assistant-engine";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/states";
import { AssistantClient } from "@/components/ai/assistant-client";

export const metadata: Metadata = { title: "AI Assistant" };

export default async function AIAssistantPage() {
  const ctx = await requireTenantPage();
  const where = { organizationId: ctx.organizationId };
  const [leads, customers, quotations, followUps, recent] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.customer.count({ where }),
    prisma.quotation.count({ where }),
    prisma.followUp.count({ where: { ...where, status: { in: ["PENDING", "SNOOZED"] } } }),
    aiService.recentQuestions(ctx),
  ]);

  const sources = [
    { icon: Users, label: "Leads", count: leads },
    { icon: UserRound, label: "Customers", count: customers },
    { icon: FileText, label: "Quotations", count: quotations },
    { icon: BellRing, label: "Open follow-ups", count: followUps },
  ];

  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="Ask about your pipeline in plain language. Answers come only from your own data."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <AssistantClient suggestions={SUGGESTED_QUESTIONS} recent={recent} />

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Database className="size-4 text-primary" aria-hidden /> What I can see
            </h2>
            <ul className="mt-4 space-y-2.5">
              {sources.map(({ icon: Icon, label, count }) => (
                <li key={label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="size-3.5 text-subtle" aria-hidden /> {label}
                  </span>
                  <span className="tabular font-medium">{count}</span>
                </li>
              ))}
            </ul>
          </Card>
          <div className="flex gap-3 rounded-xl border bg-canvas px-4 py-3.5 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            <p>
              The assistant never makes up numbers. If your data can&apos;t answer a question, it
              will tell you.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
