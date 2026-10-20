import { ProseBlock } from "@/components/editorial/prose-block";
import type { PurposeCheckResult } from "@/lib/engine-parsers";

function WindowList({ title, windows }: { title: string; windows: PurposeCheckResult["bestWindows"] }) {
  if (windows.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
        {windows.map((w) => (
          <li key={`${w.start}-${w.end}`}>
            {w.start}–{w.end}
            {w.label ? ` · ${w.label}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PurposeResultCard({ result }: { result: PurposeCheckResult }) {
  const statusLabel = result.status.replaceAll("_", " ");
  return (
    <div data-testid="purpose-result">
    <ProseBlock>
      <p className="text-xs uppercase tracking-wide text-gold-text">{statusLabel || "Result"}</p>
      <p className="mt-2 text-lg text-ink">{result.headline || "Traditional timing read"}</p>
      {result.summary ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{result.summary}</p>
      ) : null}
      {result.actionLine ? (
        <p className="mt-3 text-sm text-ink-secondary">{result.actionLine}</p>
      ) : null}
      {result.timingNote ? (
        <p className="mt-2 text-xs text-ink-tertiary">{result.timingNote}</p>
      ) : null}
      {result.locationLabel ? (
        <p className="mt-2 text-xs text-ink-tertiary">
          {result.locationLabel}
          {result.timezone ? ` · ${result.timezone}` : ""}
          {result.targetDate ? ` · ${result.targetDate}` : ""}
        </p>
      ) : null}
      <WindowList title="Supportive daylight windows" windows={result.bestWindows} />
      <WindowList title="Traditional caution intervals" windows={result.cautionWindows} />
      {result.betterOptions.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink">Other dates</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
            {result.betterOptions.map((o) => (
              <li key={o.label}>
                {o.label}
                {o.detail ? ` · ${o.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-4 text-xs text-ink-tertiary">
        Traditional interpretation only; practical constraints come first.
      </p>
    </ProseBlock>
    </div>
  );
}
