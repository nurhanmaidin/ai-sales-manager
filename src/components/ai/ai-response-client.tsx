"use client";

import { useState, useTransition } from "react";
import {
  ArrowRight,
  Check,
  CircleHelp,
  Copy,
  FileSearch,
  MessageCircle,
  Minimize2,
  RefreshCw,
  Smile,
  Sparkles,
  Briefcase,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import type { LeadReplyResult, ReplyTone } from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/overlays";
import { AddFollowUpButton } from "@/components/followups/add-followup-button";
import { cn } from "@/lib/utils/cn";
import { whatsappLink } from "@/lib/utils/contact";
import { formatRelative } from "@/lib/utils/format";
import { generateLeadReplyAction, rewriteReplyAction } from "@/server/ai-actions";

type Busy = null | "generate" | "regenerate" | ReplyTone;

const TONES: { tone: ReplyTone; label: string; icon: React.ReactNode }[] = [
  { tone: "friendly", label: "Make friendly", icon: <Smile aria-hidden /> },
  { tone: "formal", label: "Make formal", icon: <Briefcase aria-hidden /> },
  { tone: "shorter", label: "Shorten", icon: <Minimize2 aria-hidden /> },
];

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground [&_svg]:size-3.5">
      {icon}
      {children}
    </h3>
  );
}

export function AIResponseClient({
  leadId,
  hasEnquiry,
  phone,
  initial,
}: {
  leadId: string;
  hasEnquiry: boolean;
  phone: string | null;
  initial: { result: LeadReplyResult; createdAt: string } | null;
}) {
  const [result, setResult] = useState<LeadReplyResult | null>(initial?.result ?? null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(initial?.createdAt ?? null);
  const [reply, setReply] = useState(initial?.result.suggestedReply ?? "");
  const [variant, setVariant] = useState(0);
  const [busy, setBusy] = useState<Busy>(null);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  function generate(kind: "generate" | "regenerate") {
    const nextVariant = kind === "regenerate" ? variant + 1 : variant;
    setBusy(kind);
    startTransition(async () => {
      const res = await generateLeadReplyAction(leadId, nextVariant);
      setBusy(null);
      if (!res.ok) return void toast.error(res.error);
      setVariant(nextVariant);
      setResult(res.data);
      setReply(res.data.suggestedReply);
      setGeneratedAt(new Date().toISOString());
      if (kind === "regenerate") toast.success("New draft generated");
    });
  }

  function rewrite(tone: ReplyTone) {
    setBusy(tone);
    startTransition(async () => {
      const res = await rewriteReplyAction(leadId, reply, tone);
      setBusy(null);
      if (!res.ok) return void toast.error(res.error);
      setReply(res.data);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      toast.success("Reply copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't access the clipboard. Select the text and copy it manually.");
    }
  }

  const wa = whatsappLink(phone, reply);
  const edited = result !== null && reply !== result.suggestedReply;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b bg-gradient-to-b from-primary-soft/70 to-transparent px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-md font-semibold leading-6">AI Response</h2>
            <p className="text-sm text-muted-foreground">
              Understand the enquiry and reply in seconds.
            </p>
          </div>
        </div>
        {result && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => generate("regenerate")}
            loading={busy === "regenerate"}
            disabled={busy !== null}
          >
            {busy !== "regenerate" && <RefreshCw aria-hidden />} Regenerate
          </Button>
        )}
      </div>

      {!hasEnquiry ? (
        <div className="px-5 py-8 text-center">
          <FileSearch className="mx-auto mb-3 size-5 text-subtle" aria-hidden />
          <p className="font-medium">Add the enquiry to get an AI reply</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Edit this lead and paste the customer&apos;s message. AI will summarise it, spot missing
            details and draft your reply.
          </p>
        </div>
      ) : busy === "generate" ? (
        <div className="space-y-4 px-5 py-5" aria-busy="true" aria-live="polite">
          <span className="sr-only">Generating response…</span>
          <Skeleton className="h-16 rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
          <Skeleton className="h-36 rounded-lg" />
        </div>
      ) : !result ? (
        <div className="px-5 py-8">
          <div className="mx-auto max-w-md text-center">
            <p className="font-medium">Let AI read this enquiry for you</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ll get a summary, the key details, what&apos;s missing, a ready-to-send
              reply, and the best next step.
            </p>
            <Button className="mt-5" onClick={() => generate("generate")}>
              <Sparkles aria-hidden /> Generate AI response
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "space-y-5 px-5 py-5 transition-opacity",
            busy === "regenerate" && "opacity-50"
          )}
          aria-live="polite"
        >
          <section>
            <SectionLabel icon={<Sparkles />}>AI Summary</SectionLabel>
            <p className="text-md leading-relaxed text-foreground">{result.summary}</p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-lg border bg-canvas/50 p-4">
              <SectionLabel icon={<Check />}>Important details</SectionLabel>
              <ul className="space-y-1.5">
                {result.detectedInfo.map((item) => (
                  <li key={item} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-lg border border-warning/20 bg-warning-soft/50 p-4">
              <SectionLabel icon={<CircleHelp />}>Missing information</SectionLabel>
              {result.missingInfo.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing obvious — you have enough to quote.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {result.missingInfo.map((item) => (
                    <li key={item} className="flex gap-2 text-sm">
                      <CircleHelp className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <SectionLabel icon={<MessageCircle />}>Suggested response</SectionLabel>
              {edited && (
                <button
                  type="button"
                  onClick={() => setReply(result.suggestedReply)}
                  className="-mt-2.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Undo2 className="size-3" aria-hidden /> Reset
                </button>
              )}
            </div>
            <label htmlFor={`reply-${leadId}`} className="sr-only">
              Suggested response
            </label>
            <Textarea
              id={`reply-${leadId}`}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={7}
              className={cn(
                "bg-background text-md leading-relaxed",
                busy && busy !== "regenerate" && "opacity-60"
              )}
              disabled={busy !== null}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={copy} disabled={!reply.trim()}>
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
              </Button>
              {wa && (
                <Button asChild size="sm" variant="secondary">
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden /> Send via WhatsApp
                  </a>
                </Button>
              )}
              <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
              {TONES.map((t) => (
                <Tooltip key={t.tone} content={`Rewrite the reply: ${t.label.toLowerCase()}`}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => rewrite(t.tone)}
                    loading={busy === t.tone}
                    disabled={busy !== null || !reply.trim()}
                  >
                    {busy !== t.tone && t.icon} {t.label}
                  </Button>
                </Tooltip>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-primary/15 bg-primary-soft/60 p-4 sm:flex-row sm:items-center">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-primary shadow-xs">
              <ArrowRight className="size-4" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                Next best action
              </p>
              <p className="text-sm font-medium text-foreground">{result.recommendedAction}</p>
            </div>
            <AddFollowUpButton
              leadId={leadId}
              label="Schedule follow-up"
              defaultTask={result.recommendedAction}
            />
          </section>

          {generatedAt && (
            <p className="text-xs text-subtle">
              Generated {formatRelative(generatedAt)} · Always review AI suggestions before sending.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
