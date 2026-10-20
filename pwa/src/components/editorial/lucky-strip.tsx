import type { ReactNode } from "react";
import type { NatalLuckInfo } from "@/lib/types";

function Chip({ children, gold }: { children: ReactNode; gold?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-secondary ${
        gold ? "bg-gold-wash/80" : "bg-paper"
      }`}
    >
      {children}
    </span>
  );
}

export function LuckyStrip({ luck, compact }: { luck: NatalLuckInfo; compact?: boolean }) {
  if (
    luck.luckyNumbers.length === 0 &&
    luck.luckyDays.length === 0 &&
    luck.luckyColours.length === 0
  ) {
    return null;
  }

  return (
    <section
      className={`rounded-2xl border border-line bg-paper ${compact ? "px-4 py-4" : "px-5 py-5"}`}
      data-testid="lucky-strip"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-gold-text">Your natal luck</h2>
        {luck.moonSignLabel ? (
          <span className="text-xs text-ink-tertiary">
            {luck.moonSymbol} {luck.moonSignLabel}
          </span>
        ) : null}
      </div>

      {luck.luckyNumbers.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-ink-tertiary">Lucky numbers</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {luck.luckyNumbers.map((n) => (
              <Chip key={n} gold>
                {n}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {luck.luckyDays.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-ink-tertiary">Lucky days</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {luck.luckyDays.map((d) => (
              <Chip key={d}>{d}</Chip>
            ))}
          </div>
        </div>
      ) : null}

      {luck.luckyColours.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-ink-tertiary">Lucky colours</p>
          <div className="mt-1.5 flex flex-wrap gap-3">
            {luck.luckyColours.map((c) => (
              <span key={c.key || c.label} className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
                <span
                  className="h-3.5 w-3.5 rounded-full border border-line"
                  style={{ backgroundColor: c.hex }}
                />
                {c.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
