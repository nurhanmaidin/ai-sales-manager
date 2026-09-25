"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUp, ChevronRight, Database, Info, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { AssistantAnswer } from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { cn } from "@/lib/utils/cn";
import { askAssistantAction } from "@/server/ai-actions";

interface Exchange {
  id: number;
  question: string;
  answer: AssistantAnswer | null;
}

export function AssistantClient({
  suggestions,
  recent,
}: {
  suggestions: string[];
  recent: string[];
}) {
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<Exchange[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [thread]);

  function ask(raw: string) {
    const q = raw.trim();
    if (!q || pending) return;
    const id = nextId.current++;
    setThread((t) => [...t, { id, question: q, answer: null }]);
    setQuestion("");
    startTransition(async () => {
      const res = await askAssistantAction(q);
      if (!res.ok) {
        toast.error(res.error);
        setThread((t) => t.filter((e) => e.id !== id));
        setQuestion(q);
        return;
      }
      setThread((t) => t.map((e) => (e.id === id ? { ...e, answer: res.data } : e)));
    });
  }

  const chips = [...new Set([...recent, ...suggestions])].slice(0, 6);

  return (
    <div className="min-w-0 space-y-4">
      {thread.length === 0 ? (
        <Card className="px-6 py-10 text-center sm:px-10">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-semibold">What would you like to know?</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Try one of these, or ask your own question about leads, customers, quotations or
            follow-ups.
          </p>
          <div className="mx-auto mt-6 grid max-w-xl gap-2 sm:grid-cols-2">
            {chips.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="group flex items-center justify-between gap-2 rounded-lg border bg-background px-3.5 py-2.5 text-left text-sm transition-colors hover:border-primary/30 hover:bg-primary-soft/50"
              >
                <span>{s}</span>
                <ChevronRight
                  className="size-3.5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-4" aria-live="polite">
          {thread.map((e) => (
            <Card key={e.id} className="animate-fade-up overflow-hidden">
              <div className="border-b bg-canvas px-5 py-3">
                <p className="text-sm font-medium text-foreground">{e.question}</p>
              </div>
              <div className="px-5 py-4">
                {!e.answer ? (
                  <div className="space-y-2" aria-label="Thinking">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                  </div>
                ) : (
                  <AnswerView answer={e.answer} />
                )}
              </div>
            </Card>
          ))}
          <div ref={endRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="sticky bottom-4 rounded-xl border bg-background p-2 shadow-popover transition-[border-color,box-shadow] focus-within:border-ring focus-within:shadow-focus"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="assistant-question" className="sr-only">
            Ask the AI Assistant
          </label>
          <textarea
            id="assistant-question"
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(question);
              }
            }}
            rows={1}
            maxLength={500}
            placeholder="e.g. Which quotations are still waiting for a reply?"
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-md outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-subtle"
          />
          {thread.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Start over"
              onClick={() => {
                setThread([]);
                inputRef.current?.focus();
              }}
              disabled={pending}
            >
              <RotateCcw />
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            aria-label="Ask"
            loading={pending}
            disabled={!question.trim()}
          >
            {!pending && <ArrowUp />}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AnswerView({ answer }: { answer: AssistantAnswer }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {!answer.grounded && (
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <p
          className={cn(
            "text-md leading-relaxed",
            answer.grounded ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {answer.answer}
        </p>
      </div>
      {answer.items && answer.items.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-lg border">
          {answer.items.map((item, i) => {
            const content = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.label}</span>
                  {item.detail && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.detail}
                    </span>
                  )}
                </span>
                {item.href && <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />}
              </>
            );
            return (
              <li key={`${item.label}-${i}`}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-canvas"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-3.5 py-2.5">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {answer.sources.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Database className="size-3 text-subtle" aria-hidden />
          {answer.sources.join(" · ")}
        </p>
      )}
    </div>
  );
}
