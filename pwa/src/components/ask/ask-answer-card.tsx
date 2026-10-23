"use client";

import { ProseBlock } from "@/components/editorial/prose-block";
import { WindowPillRow } from "@/components/editorial/window-time-pill";
import { useLocale } from "@/context/locale-context";
import type { AskAnswerResult } from "@/lib/engine-parsers";
import { formatTimesInString, formatWindowRange } from "@/lib/format-time";
import { ShareCardButton } from "@/components/share/share-button";
import { clip } from "@/lib/share/builders";

export function AskAnswerCard({ result, question }: { result: AskAnswerResult; question?: string }) {
  const { t } = useLocale();

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

    </div>
  );
}
