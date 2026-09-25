import { Suspense } from "react";
import { Lightbulb } from "lucide-react";
import { requireTenantPage } from "@/lib/auth/context";
import { aiService } from "@/lib/ai/service";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";

async function Suggestions({ leadId }: { leadId: string }) {
  const ctx = await requireTenantPage();
  try {
    const { summary, nextAction } = await aiService.leadSuggestions(ctx, leadId);
    return (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        <div className="rounded-lg border bg-background px-3.5 py-3">
          <p className="text-2xs font-semibold uppercase tracking-wide text-primary">
            Suggested next step
          </p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">{nextAction}</p>
        </div>
      </div>
    );
  } catch (error) {
    console.error("[ai] lead suggestions unavailable", error);
    return (
      <p className="text-sm text-muted-foreground">
        Suggestions are unavailable right now. Everything else works as normal.
      </p>
    );
  }
}

export function AISuggestionsPanel({ leadId }: { leadId: string }) {
  return (
    <Card className="border-primary/15 bg-gradient-to-b from-primary-soft/60 to-card">
      <div className="flex items-center gap-2 px-5 pb-3 pt-4">
        <Lightbulb className="size-4 text-primary" aria-hidden />
        <h2 className="text-md font-semibold">AI suggestions</h2>
      </div>
      <div className="px-5 pb-5">
        <Suspense
          fallback={
            <div className="space-y-2" aria-hidden>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="mt-3 h-16 w-full rounded-lg" />
            </div>
          }
        >
          <Suggestions leadId={leadId} />
        </Suspense>
      </div>
    </Card>
  );
}
