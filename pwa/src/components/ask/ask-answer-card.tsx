"use client";

import { ProseBlock } from "@/components/editorial/prose-block";
import { WindowPillRow } from "@/components/editorial/window-time-pill";
import { useLocale } from "@/context/locale-context";
import type { AskAnswerResult } from "@/lib/engine-parsers";
import { formatTimesInString } from "@/lib/format-time";

export function AskAnswerCard({ result }: { result: AskAnswerResult }) {
  const { t } = useLocale();

  const best = formatTimesInString(result.bestTime);
  const caution = formatTimesInString(result.cautionTime);

  return (
    <div data-testid="ask-answer" className="mr-1 space-y-3">
      <ProseBlock>
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
          {t("ask.answerLabel")}
        </p>
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

      <p className="px-1 text-xs text-ink-tertiary">{t("ask.disclaimer")}</p>
    </div>
  );
}
