"use client";

import { useLocale } from "@/context/locale-context";
import type { MatchFull, MatchText } from "@/lib/bond";
import { cn } from "@/components/ui/cn";

const ORDER = ["varna", "vashya", "tara", "yoni", "graha_maitri", "gana", "bhakoot", "nadi"];

/** Pro match: plain-words story, 8 koota bars (engine points), Kuja card (cancellations first). */
export function MatchView({ match, text }: { match: MatchFull; text: MatchText | null }) {
  const { t } = useLocale();
  const plain = new Map((text?.kootas ?? []).map((k) => [k.koota_id, k.plain]));
  const kootas = [...(match.kootas ?? [])].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const kuja = match.kuja;
  const kujaTone = kuja?.pair === "one_side" ? "border-warning-ink/25 bg-warning-wash/40" : "border-success-ink/20 bg-success-wash/50";
  return (
    <div className="space-y-5" data-testid="match-view">
      {text ? (
        <section className="rounded-3xl border border-gold-accent/25 bg-paper px-5 py-5">
          <h2 className="font-serif text-[1.35rem] leading-snug text-ink">{text.headline}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">{text.summary}</p>
        </section>
      ) : null}

      {kuja ? (
        <section className={cn("rounded-2xl border px-4 py-4", kujaTone)} data-testid="kuja-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-text">{t("bond.kuja.title")}</p>
          <p className="mt-1.5 text-[15px] font-medium text-ink">{t(`bond.kuja.pair.${kuja.pair}`)}</p>
          {text?.kuja_note ? <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{text.kuja_note}</p> : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {([["a", match.a_name], ["b", match.b_name]] as const).map(([k, name]) => {
              const side = kuja[k];
              return (
                <div key={k} className="rounded-xl bg-paper/80 px-3 py-2">
                  <p className="text-xs text-ink-tertiary">{name}</p>
                  <p className="text-sm font-semibold text-ink">{t(`bond.kuja.status.${side.status}`)}</p>
                  {side.cancellations.slice(0, 2).map((c) => (
                    <p key={c} className="mt-0.5 text-[11px] leading-snug text-success-ink">✓ {t(`bond.kuja.rule.${c}`)}</p>
                  ))}
                </div>
              );
            })}
          </div>
          {kuja.a.approximate || kuja.b.approximate ? <p className="mt-2 text-[11px] text-ink-tertiary">{t("bond.kuja.approx")}</p> : null}
        </section>
      ) : null}

      <section className="space-y-2.5">
        {kootas.map((k) => {
          const pct = Math.round((k.points / k.max) * 100);
          const tone = pct >= 75 ? "bg-success-ink/70" : pct >= 40 ? "bg-gold-accent" : "bg-warning-ink/60";
          return (
            <div key={k.id} className="rounded-2xl border border-line bg-paper px-4 py-3" data-testid={`koota-${k.id}`}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{t(`bond.koota.${k.id}`)}</p>
                <p className="tabular-nums text-sm text-ink-secondary">
                  <span className="font-semibold text-ink">{k.points}</span> / {k.max}
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/60">
                <div className={cn("h-full rounded-full transition-[width] duration-700", tone)} style={{ width: `${Math.max(4, pct)}%` }} />
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{plain.get(k.id) ?? t(`bond.kootaWhat.${k.id}`)}</p>
              {k.dosha ? (
                <p className={cn("mt-1.5 text-[12px] font-medium", k.dosha_cancelled ? "text-success-ink" : "text-warning-ink")}>
                  {k.dosha_cancelled ? `✓ ${t("bond.dosha.cancelled")}` : t("bond.dosha.present")}
                  {k.cancel_rule ? ` · ${t(`bond.cancel.${k.cancel_rule}`)}` : ""}
                </p>
              ) : null}
            </div>
          );
        })}
      </section>

      {text ? (
        <>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gold-text">{t("bond.strengths")}</h3>
            <ul className="space-y-2">
              {text.strengths.map((s) => (
                <li key={s} className="border-l-2 border-success-ink/40 pl-3 text-[15px] text-ink-secondary">{s}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl bg-gold-wash/40 px-4 py-3">
            <h3 className="text-sm font-semibold text-gold-text">{t("bond.practise")}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-ink">{text.practise}</p>
          </section>
          <p className="text-center text-xs leading-relaxed text-ink-tertiary">{text.myth_bust}</p>
        </>
      ) : null}
      {match.approximate ? <p className="text-center text-xs text-ink-tertiary">{t("bond.approx")}</p> : null}
    </div>
  );
}

export function LoveView({ match, text }: { match: MatchFull; text: MatchText | null }) {
  const { t } = useLocale();
  const sides = [
    { who: "a" as const, name: t("bond.love.you"), fact: match.a },
    { who: "b" as const, name: match.b_name, fact: match.b },
  ];
  return (
    <div className="space-y-4" data-testid="love-view">
      {sides.map(({ who, name, fact }) => {
        const p = text?.partners.find((x) => x.who === who);
        if (!fact) return null;
        return (
          <section key={who} className="rounded-3xl border border-line bg-paper px-5 py-5">
            <p className="font-serif text-xl text-ink">{name}</p>
            <dl className="mt-3 space-y-2.5">
              {(["needs", "shows", "conflict"] as const).map((k) => (
                <div key={k} className="flex items-start gap-3">
                  <dt className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-gold-text">{t(`bond.love.${k}`)}</dt>
                  <dd className="text-sm text-ink">{t(`bond.el.${k}.${fact.love[k]}`)}</dd>
                </div>
              ))}
            </dl>
            {p ? (
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                <p className="text-[15px] leading-relaxed text-ink-secondary">{p.feels_loved}</p>
                <div>
                  <p className="text-xs font-semibold text-success-ink">{t("bond.love.pleases")}</p>
                  <ul className="mt-1 space-y-1 text-sm text-ink">{p.pleases.map((x) => <li key={x}>• {x}</li>)}</ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-warning-ink">{t("bond.love.avoid")}</p>
                  <ul className="mt-1 space-y-1 text-sm text-ink">{p.avoid.map((x) => <li key={x}>• {x}</li>)}</ul>
                </div>
                <p className="rounded-xl bg-gold-wash/40 px-3 py-2 text-sm text-ink">
                  <span className="font-semibold text-gold-text">{t("bond.love.try")}: </span>
                  {p.try_this_week}
                </p>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
