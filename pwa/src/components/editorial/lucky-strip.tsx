import type { ReactNode } from "react";
import { SignMedallion } from "@/components/celestial/sign-medallion";
import { useLocale } from "@/context/locale-context";
import type { NatalLuckInfo } from "@/lib/types";

function Chip({ children, gold }: { children: ReactNode; gold?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border border-line px-2 py-0.5 text-xs font-medium text-ink-secondary ${
        gold ? "bg-gold-wash/80" : "bg-paper"
      }`}
    >
      {children}
    </span>
  );
}

function LuckGroup({
  label,
  compact,
  children,
}: {
  label: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={compact ? "min-w-0" : undefined}>
      <p className={`font-medium text-ink-tertiary ${compact ? "text-xs uppercase tracking-wide" : "text-xs"}`}>
        {label}
      </p>
      <div className={`flex flex-wrap gap-1.5 ${compact ? "mt-1" : "mt-1.5"}`}>{children}</div>
    </div>
  );
}

export function LuckyStrip({
  luck,
  compact,
  showMedallion = true,
}: {
  luck: NatalLuckInfo;
  compact?: boolean;
  showMedallion?: boolean;
}) {
  const { t } = useLocale();
  const hasChips =
    luck.luckyNumbers.length > 0 || luck.luckyDays.length > 0 || luck.luckyColours.length > 0;

  if (!hasChips && !(showMedallion && (luck.moonSignLabel || luck.moonSymbol))) {
    return null;
  }

  const medallionVisible = showMedallion && (luck.moonSignLabel || luck.moonSymbol);

  const chips = (
    <>
      {luck.luckyNumbers.length > 0 ? (
        <LuckGroup label={t("luck.numbers")} compact={compact}>
          {luck.luckyNumbers.map((n) => (
            <Chip key={n} gold>
              {n}
            </Chip>
          ))}
        </LuckGroup>
      ) : null}
      {luck.luckyDays.length > 0 ? (
        <LuckGroup label={t("luck.days")} compact={compact}>
          {luck.luckyDays.map((d) => (
            <Chip key={d}>{d}</Chip>
          ))}
        </LuckGroup>
      ) : null}
      {luck.luckyColours.length > 0 ? (
        <LuckGroup label={t("luck.colours")} compact={compact}>
          {luck.luckyColours.map((c) => (
            <span
              key={c.key || c.label}
              className="inline-flex items-center gap-1 text-xs text-ink-secondary"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-line shadow-sm"
                style={{ backgroundColor: c.hex }}
              />
              {c.label}
            </span>
          ))}
        </LuckGroup>
      ) : null}
    </>
  );

  if (compact && !medallionVisible) {
    if (!hasChips) return null;
    return (
      <section
        className="rounded-xl border border-line bg-paper px-3 py-3"
        data-testid="lucky-strip"
      >
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-text">
          {t("luck.title")}
        </h2>
        <p className="mt-1 text-xs text-ink-tertiary">{t("luck.associationNote")}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">{chips}</div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-line bg-paper ${compact ? "px-4 py-4" : "px-5 py-5"}`}
      data-testid="lucky-strip"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        {medallionVisible ? (
          <SignMedallion
            signKey={luck.moonSignKey}
            symbol={luck.moonSymbol}
            size={compact ? "md" : "lg"}
            label={luck.moonSignLabel}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gold-text">{t("luck.title")}</h2>
          {medallionVisible && luck.moonSignLabel ? (
            <p className="mt-0.5 text-xs text-ink-tertiary">
              {t("luck.moonIn")} {luck.moonSignLabel}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-ink-tertiary">{t("luck.associationNote")}</p>
          <div className={compact ? "mt-2 space-y-2" : "mt-3 space-y-3"}>{chips}</div>
        </div>
      </div>
    </section>
  );
}
