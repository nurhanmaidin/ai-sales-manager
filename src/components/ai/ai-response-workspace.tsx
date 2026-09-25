import { requireTenantPage } from "@/lib/auth/context";
import { aiService } from "@/lib/ai/service";
import { AIResponseClient } from "./ai-response-client";

export async function AIResponseWorkspace({
  leadId,
  hasEnquiry,
  phone,
}: {
  leadId: string;
  hasEnquiry: boolean;
  phone?: string | null;
}) {
  const ctx = await requireTenantPage();
  const latest = hasEnquiry ? await aiService.latestLeadReply(ctx, leadId) : null;
  return (
    <AIResponseClient
      leadId={leadId}
      hasEnquiry={hasEnquiry}
      phone={phone ?? null}
      initial={latest ? { result: latest.result, createdAt: latest.createdAt.toISOString() } : null}
    />
  );
}
