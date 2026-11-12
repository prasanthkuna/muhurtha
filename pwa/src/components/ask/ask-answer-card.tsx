"use client";

import { ProseBlock } from "@/components/editorial/prose-block";
import { WindowPillRow } from "@/components/editorial/window-time-pill";
import { useLocale } from "@/context/locale-context";
import type { AskAnswerResult } from "@/lib/engine-parsers";
import { formatTimesInString, formatWindowRange } from "@/lib/format-time";
import { ShareCardButton } from "@/components/share/share-button";
import { clip } from "@/lib/share/builders";
import { useState } from "react";
import { savePlan } from "@/lib/saved-plans";

async function enginePost(action: string, body: Record<string, unknown>): Promise<boolean> {
  try {
    const r = await fetch("/api/engine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
    return r.ok;
  } catch {
    return false;
  }
}

export function AskAnswerCard({
  result,
  question,
  onAsk,
}: {
  result: AskAnswerResult;
  question?: string;
  onAsk?: (q: string) => void;
}) {
  const { t } = useLocale();
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [reminded, setReminded] = useState(false);

  const best = formatTimesInString(result.bestTime);
  const caution = formatTimesInString(result.cautionTime);

  return (
    <div data-testid="ask-answer" className="mr-1 space-y-3">
      <ProseBlock>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
            {t("ask.answerLabel")}
          </p>
          <ShareCardButton
            type="ask"
            className="-mt-1 shrink-0"
            build={() => {
              const w = result.goodWindows[0];
              return {
                title: clip(question || result.directAnswer, 88) ?? t("ask.answerLabel"),
                value: w ? formatWindowRange(w.start, w.end) : undefined,
                body: clip(
                  question
                    ? [result.directAnswer, result.simpleWhy ? formatTimesInString(result.simpleWhy) : ""].filter(Boolean).join(" ")
                    : formatTimesInString(result.simpleWhy ?? result.actionLine),
                  280,
                ),
                glyph: "ask",
              };
            }}
          />
        </div>
        <p className="mt-2 text-[17px] font-semibold leading-snug text-ink">
          {result.directAnswer}
        </p>
        {result.simpleWhy ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
            {formatTimesInString(result.simpleWhy)}
          </p>
        ) : null}
      </ProseBlock>

      {(result.goodWindows.length > 0 || best) && (
        <div className="rounded-2xl border border-success-ink/15 bg-success-wash/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-success-ink">{t("ask.bestTime")}</p>
          {result.goodWindows.length > 0 ? (
            <div className="mt-2">
              <WindowPillRow windows={result.goodWindows} tone="good" limit={2} />
            </div>
          ) : best ? (
            <p className="mt-2 text-sm font-medium text-ink">{best}</p>
          ) : null}
        </div>
      )}

      {(result.cautionWindows.length > 0 || caution) && (
        <div className="rounded-2xl border border-warning-ink/20 bg-warning-wash/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-warning-ink">{t("ask.cautionTime")}</p>
          {result.cautionWindows.length > 0 ? (
            <div className="mt-2">
              <WindowPillRow windows={result.cautionWindows} tone="caution" limit={2} />
            </div>
          ) : caution ? (
            <p className="mt-2 text-sm font-medium text-ink">{caution}</p>
          ) : null}
        </div>
      )}

      {result.betterOption ? (
        <p className="px-1 text-sm text-ink-secondary">
          <span className="font-medium text-gold-text">{t("ask.betterOption")}: </span>
          {formatTimesInString(result.betterOption)}
        </p>
      ) : null}

      {result.actionLine ? (
        <div className="rounded-2xl border border-line bg-paper px-4 py-3">
          <p className="text-xs font-semibold uppercase text-gold-text">{t("ask.actionNow")}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{result.actionLine}</p>
        </div>
      ) : null}

      {result.remember && result.remember.length > 0 ? (
        <div className="rounded-2xl border border-line bg-paper px-4 py-3" data-testid="ask-remember">
          <p className="text-xs font-semibold uppercase text-ink-tertiary">{t("live.rememberTitle")}</p>
          <ul className="mt-2 space-y-2">
            {result.remember.map((f) => (
              <li key={f} className="flex items-center justify-between gap-3 text-sm text-ink-secondary">
                <span>{f}</span>
                {saved[f] ? (
                  <span className="shrink-0 text-xs text-success-ink">{t("live.remembered")}</span>
                ) : (
                  <button
                    type="button"
                    className="min-h-9 shrink-0 rounded-full border border-gold-accent/50 px-3 text-xs font-semibold text-gold-text"
                    onClick={() => {
                      void enginePost("memory_save", { fact: f, source: "ask" }).then((ok) => ok && setSaved((s) => ({ ...s, [f]: true })));
                    }}
                  >
                    {t("live.rememberYes")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.chips && result.chips.length > 0 ? (
        <div className="space-y-2 px-1" data-testid="ask-followups">
          <p className="text-xs font-semibold uppercase text-ink-tertiary">{t("live.followUps")}</p>
          <div className="flex flex-wrap gap-2">
            {result.chips.map((c) =>
              c.kind === "save_event" ? (
                <button
                  key={c.label}
                  type="button"
                  disabled={reminded}
                  className="min-h-9 rounded-full border border-success-ink/30 bg-success-wash/40 px-3 py-1.5 text-sm text-success-ink disabled:opacity-70"
                  onClick={() => {
                    savePlan({
                      purposeType: "ask",
                      purposeLabel: clip(question || result.directAnswer, 80) ?? t("ask.answerLabel"),
                      eventDate: c.value,
                      cityLabel: "",
                    });
                    setReminded(true);
                  }}
                >
                  {reminded ? t("live.reminderSaved") : c.label}
                </button>
              ) : (
                <button
                  key={c.label}
                  type="button"
                  className="min-h-9 rounded-full border border-line bg-paper px-3 py-1.5 text-left text-sm text-ink-secondary hover:border-gold-accent/50"
                  onClick={() => onAsk?.(c.value)}
                >
                  {c.label}
                </button>
              ),
            )}
          </div>
        </div>
      ) : null}

    </div>
  );
}
