"use client";

import { ReadingUnavailable } from "@/components/shell/reading-unavailable";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AskAnswerCard } from "@/components/ask/ask-answer-card";
import { PageHeader } from "@/components/editorial/page-header";
import { LoadingState } from "@/components/editorial/loading-state";
import { useAppData, useEngineBody } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { parseAskAnswer } from "@/lib/engine-parsers";
import type { AskMessage } from "@/lib/types";

type SessionRow = { id: string; title: string; updatedAt: string };
type Thread = { messages: AskMessage[]; sessionId?: string; sessions: SessionRow[] };
const EMPTY_THREAD: Thread = { messages: [], sessions: [] };
/**
 * Ask history per user + chart. Questions asked on a friend's chart live with that chart
 * (engine stores them against its birth_input_id) and never show on yours, and vice versa.
 * Module-level so switching charts or tabs keeps each chart's open thread.
 */
const askThreads = new Map<string, Thread>();

function AskInner() {
  const params = useSearchParams();
  const seed = params.get("q") ?? "";
  const { t } = useLocale();
  const engineBody = useEngineBody();
  const { views, loading, error, userId, activeChartProfileId } = useAppData();
  const chartKey = `${userId ?? "anon"}:${activeChartProfileId ?? "self"}`;
  const [threads, setThreads] = useState<Record<string, Thread>>(() =>
    Object.fromEntries(askThreads),
  );
  const thread = threads[chartKey] ?? askThreads.get(chartKey) ?? EMPTY_THREAD;
  const { messages, sessionId, sessions } = thread;
  const [input, setInput] = useState(seed);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  /** Updates one chart's thread; async results always land on the chart they were asked on. */
  const updateThread = useCallback((key: string, fn: (t: Thread) => Thread) => {
    setThreads((prev) => {
      const next = fn(prev[key] ?? askThreads.get(key) ?? EMPTY_THREAD);
      askThreads.set(key, next);
      return { ...prev, [key]: next };
    });
  }, []);

  useEffect(() => {
    if (loading || !views) return;
    const key = chartKey;
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
        const parsed = rows
          .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
          .map((r) => ({
            id: r.id?.toString() ?? "",
            title: r.title?.toString() ?? "Chat",
            updatedAt: r.updatedAt?.toString() ?? "",
          }))
          .filter((r) => r.id);
        updateThread(key, (t) => ({ ...t, sessions: parsed }));
      } catch {
        /* ignore */
      }
    })();
  }, [engineBody, loading, views, messages.length, chartKey, updateThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading && !views) return <LoadingState message={t("ask.loading")} />;
  if (error || !views) {
    return <ReadingUnavailable title={t("nav.ask")} />;
  }

  const suggestions = views.askSuggestions();
  const currentChapter = views.currentChapter();

  async function send(text: string) {
    const q = text.trim();
    if (!q) return;
    setInput("");
    const key = chartKey;
    const userMsg: AskMessage = { id: crypto.randomUUID(), role: "user", text: q };
    updateThread(key, (t) => ({ ...t, messages: [...t.messages, userMsg] }));
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
        updateThread(key, (t) => ({
          ...t,
          messages: [...t.messages, { id: crypto.randomUUID(), role: "assistant", text: errText }],
        }));
        return;
      }
      const parsed = parseAskAnswer(json);
      updateThread(key, (t) => ({
        ...t,
        sessionId: parsed.sessionId || t.sessionId,
        messages: [
          ...t.messages,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: parsed.directAnswer,
            meta: parsed,
          },
        ],
      }));
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
                  const key = chartKey;
                  void (async () => {
                    const res = await fetch("/api/engine", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(engineBody("chat_session_load", { session_id: s.id })),
                    });
                    const json = (await res.json()) as Record<string, unknown>;
                    if (!res.ok) return;
                    const rows = json.messages;
                    if (!Array.isArray(rows)) return;
                    const loaded: AskMessage[] = rows
                      .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
                      .map((m) => ({
                        id: m.id?.toString() ?? crypto.randomUUID(),
                        role: (m.role?.toString() === "user" ? "user" : "assistant") as
                          | "user"
                          | "assistant",
                        text: m.text?.toString() ?? "",
                      }));
                    updateThread(key, (t) => ({ ...t, sessionId: s.id, messages: loaded }));
                  })();
                }}
                className="min-h-9 shrink-0 rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-ink-secondary hover:border-gold-accent/50"
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
            className="mt-2 min-h-9 text-sm font-medium text-gold-text"
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
                className="rounded-full border border-line bg-paper px-3 py-2 text-left text-sm text-ink-secondary hover:border-gold-accent/50"
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

      <p className="px-1 pb-2 text-xs leading-relaxed text-ink-tertiary">{t("ask.disclaimer")}</p>
      <form
        className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex gap-2 border-t border-line bg-canvas pb-2 pt-3 [html[data-kb=open]_&]:bottom-0"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("ask.placeholder")}
          enterKeyHint="send"
          onFocus={(e) => {
            const el = e.currentTarget;
            // Keep the composer visible above the on-screen keyboard.
            window.setTimeout(() => el.scrollIntoView({ block: "nearest", behavior: "smooth" }), 250);
          }}
          className="min-h-11 flex-1 rounded-full border border-line bg-paper px-4 text-base outline-none focus:ring-2 focus:ring-gold-text/25"
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
