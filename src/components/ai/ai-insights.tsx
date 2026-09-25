import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { requireTenantPage } from "@/lib/auth/context";
import { aiService } from "@/lib/ai/service";
import { Card } from "@/components/ui/card";
import { pluralize } from "@/lib/utils/format";

/** Insights generated from real pipeline aggregates. Suspends while loading. */
export async function AIInsights() {
  const ctx = await requireTenantPage();
  const { insights, metrics } = await aiService.pipelineInsights(ctx);

  return (
    <Card className="overflow-hidden border-primary/15">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-b from-primary-soft/80 to-transparent px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <h2 className="text-md font-semibold">AI insights</h2>
        </div>
        <Link
          href="/ai-assistant"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ask a question <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="space-y-3 px-5 pb-4 pt-1">
        {insights.map((insight) => (
          <li key={insight} className="flex gap-3 text-sm leading-relaxed">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
            <span className="text-foreground">{insight}</span>
          </li>
        ))}
      </ul>
      <p className="border-t bg-canvas/60 px-5 py-2.5 text-xs text-muted-foreground">
        Based on {pluralize(metrics.totalLeads, "lead")},{" "}
        {pluralize(metrics.pendingQuotations, "pending quotation")} and your follow-up schedule.
      </p>
    </Card>
  );
}
