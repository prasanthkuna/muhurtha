"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AskAnswerCard } from "@/components/ask/ask-answer-card";
import { PageHeader } from "@/components/editorial/page-header";
import { LoadingState } from "@/components/editorial/loading-state";
import { useAppData, useEngineBody } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { parseAskAnswer } from "@/lib/engine-parsers";
import type { AskMessage } from "@/lib/types";

function AskInner() {
  const params = useSearchParams();
  const seed = params.get("q") ?? "";
  const { t } = useLocale();
  const engineBody = useEngineBody();
  const { views, loading, error } = useAppData();
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [input, setInput] = useState(seed);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [sessions, setSessions] = useState<
    { id: string; title: string; updatedAt: string }[]
  >([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || !views) return;
    void (async () => {
      try {
        const res = await fetch("/api/engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(engineBody("chat_session_list")),
        });
        const json = (await res.json()) as Record<string, unknown>;
        if (!res.ok) return;
        const rows = json.sessions;
        if (!Array.isArray(rows)) return;
        setSessions(
          rows
            .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
            .map((r) => ({
              id: r.id?.toString() ?? "",
              title: r.title?.toString() ?? "Chat",
              updatedAt: r.updatedAt?.toString() ?? "",
            }))
            .filter((r) => r.id),
        );
      } catch {
        /* ignore */
      }
    })();
  }, [engineBody, loading, views, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) return <LoadingState message={t("ask.loading")} />;
  if (error || !views) {
    return <PageHeader title={t("nav.ask")} subtitle={error ?? "Unavailable"} />;
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
        body: JSON.stringify(
          engineBody("ask", {
            question: q,
            ...(sessionId ? { session_id: sessionId } : {}),
          }),
        ),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const code = json.error_code?.toString() ?? "";
        const errText =
          code === "free_ask_limit_reached"
            ? t("ask.limit")
            : json.error?.toString() ?? "Ask failed. Try again.";
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant", text: errText },
        ]);
        return;
      }
      const parsed = parseAskAnswer(json);
      if (parsed.sessionId) setSessionId(parsed.sessionId);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: parsed.directAnswer,
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
        eyebrow={t("ask.eyebrow")}
        title={t("ask.title")}
        subtitle={t("ask.subtitle")}
      />

      {sessions.length > 0 ? (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-ink-tertiary">{t("ask.priorChats")}</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sessions.slice(0, 8).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  void (async () => {
                    const res = await fetch("/api/engine", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(engineBody("chat_session_load", { session_id: s.id })),
                    });
                    const json = (await res.json()) as Record<string, unknown>;
                    if (!res.ok) return;
                    setSessionId(s.id);
                    const rows = json.messages;
                    if (!Array.isArray(rows)) return;
                    setMessages(
                      rows
                        .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
                        .map((m) => ({
                          id: m.id?.toString() ?? crypto.randomUUID(),
                          role: (m.role?.toString() === "user" ? "user" : "assistant") as
                            | "user"
                            | "assistant",
                          text: m.text?.toString() ?? "",
                        })),
                    );
                  })();
                }}
                className="shrink-0 rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-ink-secondary hover:border-gold-accent/50"
              >
                {s.title.slice(0, 42)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {currentChapter?.title ? (
        <div className="mb-4 rounded-2xl border border-line bg-gold-wash/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
            {t("ask.fromLife")}
          </p>
          <p className="mt-1 text-sm font-medium text-ink">{currentChapter.title}</p>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-gold-text"
            onClick={() =>
              void send("Explain my current life chapter and its main themes.")
            }
          >
            {t("ask.askChapter")}
          </button>
        </div>
      ) : null}

      {messages.length === 0 && suggestions.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase text-ink-tertiary">
            {t("ask.suggested")}
          </p>
          <div className="flex flex-wrap gap-2">
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
            <AskAnswerCard key={m.id} result={m.meta} />
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
          placeholder={t("ask.placeholder")}
          className="min-h-11 flex-1 rounded-full border border-line bg-paper px-4 text-sm outline-none focus:ring-2 focus:ring-gold-text/25"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-gold-button px-5 text-sm font-semibold text-ink disabled:opacity-50"
        >
          {t("ask.send")}
        </button>
      </form>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading…" />}>
      <AskInner />
    </Suspense>
  );
}
