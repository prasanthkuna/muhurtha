"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/editorial/page-header";
import { LoadingState } from "@/components/editorial/loading-state";
import { useAppData } from "@/context/app-data-context";
import type { AskMessage } from "@/lib/types";

function AskInner() {
  const params = useSearchParams();
  const seed = params.get("q") ?? "";
  const { views, loading, error } = useAppData();
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [input, setInput] = useState(seed);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) return <LoadingState message="Loading Ask…" />;
  if (error || !views) {
    return <PageHeader title="Ask" subtitle={error ?? "Unavailable"} />;
  }

  const suggestions = views.askSuggestions();

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
        body: JSON.stringify({ action: "ask", question: q, locale: "en" }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      let answer = "";
      if (res.ok) {
        answer =
          json.answer?.toString() ??
          json.reply?.toString() ??
          json.message?.toString() ??
          "";
      } else {
        answer = json.error?.toString() ?? "Ask failed. Try again.";
      }
      if (!answer) answer = "Keep the next step small and verifiable.";
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", text: answer },
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
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-8 rounded-2xl bg-gold-wash px-4 py-3 text-sm text-ink"
                : "mr-4 rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink-secondary"
            }
          >
            {m.text}
          </div>
        ))}
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
