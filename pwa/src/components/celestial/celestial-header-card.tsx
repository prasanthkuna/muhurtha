import { OrbitBackdrop } from "@/components/celestial/orbit-backdrop";
import { SignMedallion } from "@/components/celestial/sign-medallion";
import { normalizeRashiKey } from "@/design-system/rashi";

export function CelestialHeaderCard({
  heroLabel,
  heroTitle,
  moonSignKey,
  moonSymbol,
  moonSignLabel,
  heroSubline,
  explainer,
  disclaimer,
  children,
}: {
  heroLabel: string;
  heroTitle: string;
  moonSignKey?: string | null;
  moonSymbol?: string;
  moonSignLabel?: string;
  heroSubline?: string;
  explainer?: string;
  disclaimer?: string;
  children?: React.ReactNode;
}) {
  const key = normalizeRashiKey(moonSignKey ?? moonSymbol);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gold-accent/35 bg-gradient-to-br from-paper via-paper to-gold-wash/30 px-5 py-5 shadow-[0_10px_32px_rgba(119,84,31,0.08)]">
      <OrbitBackdrop />
      <div className="relative flex gap-4">
        <SignMedallion
          signKey={key}
          symbol={moonSymbol}
          size="lg"
          scintillate
          label={moonSignLabel}
        />
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
            {heroLabel}
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold leading-tight text-gold-text">
            {heroTitle}
          </h2>
          {heroSubline ? (
            <p className="mt-1 text-sm font-medium text-ink-secondary">{heroSubline}</p>
          ) : null}
          {explainer ? (
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{explainer}</p>
          ) : null}
          {disclaimer ? <p className="mt-2 text-xs text-ink-tertiary">{disclaimer}</p> : null}
          {children}
        </div>
      </div>
    </section>
  );
}
