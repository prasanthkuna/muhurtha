"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/editorial/page-header";
import { LoadingState } from "@/components/editorial/loading-state";
import { ProseBlock } from "@/components/editorial/prose-block";
import { useAppData } from "@/context/app-data-context";
import { formatAskMessage, parseAskAnswer } from "@/lib/engine-parsers";
import type { AskMessage } from "@/lib/types";

function AskAnswerCard({
  directAnswer,
  bestTime,
  cautionTime,
  betterOption,
  actionLine,
  simpleWhy,
}: {
  directAnswer: string;
  bestTime: string;
  cautionTime: string;
  betterOption: string;
  actionLine: string;
  simpleWhy?: string;
}) {
  return (
    <div data-testid="ask-answer" className="mr-4">
    <ProseBlock>
      <p className="text-[15px] leading-relaxed text-ink">{directAnswer}</p>
      {bestTime ? (
        <p className="mt-3 text-sm text-ink-secondary">
          <span className="font-medium text-ink">Best time: </span>
          {bestTime}
        </p>
      ) : null}
      {cautionTime ? (
        <p className="mt-2 text-sm text-ink-secondary">
          <span className="font-medium text-ink">Go lighter: </span>
          {cautionTime}
        </p>
      ) : null}
      {betterOption ? (
        <p className="mt-2 text-sm text-ink-secondary">
          <span className="font-medium text-ink">Better option: </span>
          {betterOption}
        </p>
      ) : null}
      {actionLine ? <p className="mt-2 text-sm text-ink-secondary">{actionLine}</p> : null}
      {simpleWhy ? <p className="mt-2 text-xs text-ink-tertiary">{simpleWhy}</p> : null}
    </ProseBlock>
    </div>
  );
}

function AskInner() {
  const params = useSearchParams();
  const seed = params.get("q") ?? "";
  const { views, loading, error } = useAppData();
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [input, setInput] = useState(seed);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) return <LoadingState message="Loading Ask…" />;
  if (error || !views) {
    return <PageHeader title="Ask" subtitle={error ?? "Unavailable"} />;
  }

  const suggestions = views.askSuggestions();
  const currentChapter = views.currentChapter();

  async function send(text: string) {
    const q = text.trim();
    if (!q) return;
    setInput("");
    const userMsg: AskMessage = { id: crypto.randomUUID(), role: "user", text: q };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);

    try {
      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ask",
          question: q,
          locale: "en",
          ...(sessionId ? { session_id: sessionId } : {}),
        }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const code = json.error_code?.toString() ?? "";
        const errText =
          code === "free_ask_limit_reached"
            ? "You’ve used today’s free Ask limit. Try again tomorrow or upgrade."
            : json.error?.toString() ?? "Ask failed. Try again.";
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant", text: errText },
        ]);
        return;
      }
      const parsed = parseAskAnswer(json);
      if (parsed.sessionId) setSessionId(parsed.sessionId);
      const answer = formatAskMessage(parsed);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: answer,
          meta: parsed,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <PageHeader
        eyebrow="Ask"
        title="One clear question"
        subtitle="Spacious answers grounded in your pack — not a junk drawer."
      />

      {currentChapter?.title ? (
        <div className="mb-4 rounded-2xl border border-line bg-gold-wash/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">From your life map</p>
          <p className="mt-1 text-sm font-medium text-ink">{currentChapter.title}</p>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-gold-text"
            onClick={() =>
              void send("Explain my current life chapter and its main themes.")
            }
          >
            Ask about this chapter →
          </button>
        </div>
      ) : null}

      {messages.length === 0 && suggestions.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="rounded-full border border-line bg-paper px-3 py-2 text-left text-xs text-ink-secondary hover:border-gold-accent/50"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.map((m) =>
          m.role === "user" ? (
            <div
              key={m.id}
              className="ml-8 rounded-2xl bg-gold-wash px-4 py-3 text-sm text-ink"
            >
              {m.text}
            </div>
          ) : m.meta ? (
            <AskAnswerCard
              key={m.id}
              directAnswer={m.meta.directAnswer}
              bestTime={m.meta.bestTime}
              cautionTime={m.meta.cautionTime}
              betterOption={m.meta.betterOption}
              actionLine={m.meta.actionLine}
              simpleWhy={m.meta.simpleWhy}
            />
          ) : (
            <div
              key={m.id}
              className="mr-4 rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink-secondary"
            >
              {m.text}
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] flex gap-2 border-t border-line bg-canvas pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask one thing…"
          className="min-h-11 flex-1 rounded-full border border-line bg-paper px-4 text-sm outline-none focus:ring-2 focus:ring-gold-text/25"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-gold-button px-5 text-sm font-semibold text-ink disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading Ask…" />}>
      <AskInner />
    </Suspense>
  );
}
