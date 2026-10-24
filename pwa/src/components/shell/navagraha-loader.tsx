"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/context/locale-context";
import { useAppData, type PackPreparing } from "@/context/app-data-context";
import { MYTH_COUNT } from "@/lib/messages-reading";
import { currentSubscription, enablePush, permissionState, pushSupported } from "@/lib/web-push";

/**
 * Full-height "your reading is being written" screen: the nine grahas on a rashi wheel,
 * cycling drishti (aspect) lines, myth-vs-fact lines and progress driven by the real job
 * status from the engine. Pure SVG + CSS transforms (GPU friendly on Android Chrome);
 * motion is disabled under prefers-reduced-motion.
 */

type Graha = { key: string; glyph: string; sign: number; aspects: number[] };

// Sign index (0 = Mesha) is illustrative only; aspects are house counts from the graha.
const GRAHAS: Graha[] = [
  { key: "Sun", glyph: "☉", sign: 0, aspects: [7] },
  { key: "Mercury", glyph: "☿", sign: 1, aspects: [7] },
  { key: "Moon", glyph: "☽", sign: 2, aspects: [7] },
  { key: "Ketu", glyph: "☋", sign: 3, aspects: [7] },
  { key: "Mars", glyph: "♂", sign: 4, aspects: [4, 7, 8] },
  { key: "Saturn", glyph: "♄", sign: 6, aspects: [3, 7, 10] },
  { key: "Jupiter", glyph: "♃", sign: 8, aspects: [5, 7, 9] },
  { key: "Rahu", glyph: "☊", sign: 9, aspects: [7] },
  { key: "Venus", glyph: "♀", sign: 11, aspects: [7] },
];
const DRISHTI_CYCLE = ["Mars", "Jupiter", "Saturn", "Moon", "Sun", "Venus"];
const R_GLYPH = 86;
const R_RING = 112;

function polar(sign: number, r: number) {
  const a = ((sign * 30 + 15 - 90) * Math.PI) / 180;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

export function NavagrahaWheel({ active }: { active: number }) {
  const { t } = useLocale();
  const focus = GRAHAS.find((g) => g.key === DRISHTI_CYCLE[active % DRISHTI_CYCLE.length])!;
  const from = polar(focus.sign, R_GLYPH);
  return (
    <svg viewBox="-140 -140 280 280" className="h-full w-full" role="img" aria-label={t("loader.title")}>
      <defs>
        <radialGradient id="ngl-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6de" />
          <stop offset="60%" stopColor="#f3e8d2" />
          <stop offset="100%" stopColor="#e7d3a8" />
        </radialGradient>
      </defs>
      {/* Rashi wheel */}
      <g className="ngl-spin-slow">
        <circle r={R_RING} fill="none" stroke="var(--gold-accent)" strokeOpacity="0.35" strokeWidth="1" />
        <circle r={R_RING + 10} fill="none" stroke="var(--gold-accent)" strokeOpacity="0.25" strokeWidth="0.8" strokeDasharray="2 6" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = ((i * 30 - 90) * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={Math.cos(a) * (R_RING - 6)}
              y1={Math.sin(a) * (R_RING - 6)}
              x2={Math.cos(a) * (R_RING + 6)}
              y2={Math.sin(a) * (R_RING + 6)}
              stroke="var(--gold-accent)"
              strokeOpacity="0.5"
              strokeWidth="1"
            />
          );
        })}
      </g>
      <circle r={R_GLYPH - 26} fill="none" stroke="var(--line)" strokeWidth="1" />
      {/* Drishti (aspect) lines for the graha in focus; keyed so they redraw on change. */}
      <g key={focus.key}>
        {focus.aspects.map((h) => {
          const to = polar((focus.sign + h - 1) % 12, R_GLYPH);
          const special = h !== 7;
          return (
            <line
              key={h}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              pathLength={1}
              className="ngl-drishti"
              stroke={special ? "var(--gold-button)" : "var(--gold-accent)"}
              strokeWidth={special ? 1.6 : 1.2}
              strokeLinecap="round"
              strokeOpacity={special ? 0.95 : 0.7}
            />
          );
        })}
        {focus.aspects.map((h) => {
          const to = polar((focus.sign + h - 1) % 12, R_GLYPH);
          return <circle key={`t${h}`} cx={to.x} cy={to.y} r={15} className="ngl-target" fill="var(--gold-wash)" />;
        })}
      </g>
      {/* Centre */}
      <circle r={26} fill="url(#ngl-core)" className="ngl-breathe" />
      <text y={6} textAnchor="middle" className="graha-glyph" fontSize="18" fill="var(--gold-text)">ॐ</text>
      {/* Grahas */}
      {GRAHAS.map((g) => {
        const p = polar(g.sign, R_GLYPH);
        const on = g.key === focus.key;
        return (
          <g key={g.key} transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`}>
            <circle
              r={on ? 15 : 13}
              fill="var(--paper)"
              stroke={on ? "var(--gold-button)" : "var(--gold-accent)"}
              strokeOpacity={on ? 1 : 0.45}
              strokeWidth={on ? 1.8 : 1}
              className={on ? "ngl-pulse" : undefined}
            />
            <text
              y={5.5}
              textAnchor="middle"
              className="graha-glyph"
              fontSize={on ? 16 : 14}
              fill={on ? "var(--gold-text)" : "var(--ink-secondary)"}
            >
              {g.glyph}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function stageKey(p: PackPreparing): string {
  if (p.failed) return "loader.failed";
  const s = p.stage ?? (p.total > 0 && p.done > 0 ? "writing" : "queued");
  return ["queued", "writing", "checking", "polishing", "retrying", "ready"].includes(s)
    ? `loader.stage.${s}`
    : "loader.stage.writing";
}

export function NavagrahaLoader({ preparing, name }: { preparing: PackPreparing; name: string | null }) {
  const { t, locale } = useLocale();
  const { retryPreparing, profileTimezone } = useAppData();
  const reduced = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);
  const [myth, setMyth] = useState(() => Math.floor(Math.random() * MYTH_COUNT));
  const [notify, setNotify] = useState<"hidden" | "offer" | "on" | "busy">("hidden");

  useEffect(() => {
    const a = window.setInterval(() => setTick((n) => n + 1), reduced ? 6000 : 3200);
    const b = window.setInterval(() => setMyth((n) => (n + 1) % MYTH_COUNT), reduced ? 11000 : 7000);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, [reduced]);

  useEffect(() => {
    void (async () => {
      if (!pushSupported() || permissionState() === "denied") return;
      const sub = await currentSubscription().catch(() => null);
      setNotify(sub && permissionState() === "granted" ? "on" : "offer");
    })();
  }, []);

  const pct = useMemo(() => {
    if (preparing.pct != null) return preparing.pct;
    return preparing.total > 0 ? Math.round((Math.min(preparing.done, preparing.total) / preparing.total) * 100) : 4;
  }, [preparing]);

  const failed = Boolean(preparing.failed);
  const slow = !failed && (preparing.slow || preparing.stalled);

  async function turnOnNotify() {
    setNotify("busy");
    try {
      await enablePush(locale, profileTimezone || "Asia/Kolkata");
      setNotify("on");
    } catch {
      setNotify("offer");
    }
  }

  return (
    <section
      className="relative mx-auto flex min-h-[70dvh] max-w-md flex-col items-center px-2 pb-8 pt-2 text-center"
      data-testid="reading-preparing"
      aria-busy={!failed}
    >
      <div className="relative aspect-square w-[min(78vw,300px)]" aria-hidden={false}>
        <div className="absolute inset-6 rounded-full bg-gold-wash/40 blur-2xl" aria-hidden />
        <div className="relative h-full w-full">
          <NavagrahaWheel active={tick} />
        </div>
      </div>

      <h1 className="mt-4 font-serif text-2xl leading-tight text-ink">
        {name ? `${t("loader.titleFor")} ${name}` : t("loader.title")}
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-secondary">{t("loader.sub")}</p>

      <div className="mt-6 w-full max-w-sm" role="status" aria-live="polite">
        <div className="flex items-baseline justify-between gap-3 text-xs font-medium">
          <span className={failed ? "text-warning-ink" : "text-gold-text"} data-testid="loader-stage">
            {t(stageKey(preparing))}
          </span>
          {!failed ? <span className="tabular-nums text-ink-tertiary">{pct}%</span> : null}
        </div>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line/60"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={t("loader.title")}
        >
          <div
            className={`ngl-bar h-full rounded-full ${failed ? "bg-warning-ink/60" : "bg-gold-accent"}`}
            style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-ink-secondary" data-testid={slow ? "loader-slow" : undefined}>
          {failed ? t("loader.failed") : slow ? t("loader.slow") : t("loader.hint")}
        </p>
        {failed ? (
          <button
            type="button"
            onClick={retryPreparing}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-gold-button px-5 text-sm font-semibold text-ink"
          >
            {t("loader.retry")}
          </button>
        ) : notify === "offer" || notify === "busy" ? (
          <button
            type="button"
            disabled={notify === "busy"}
            onClick={() => void turnOnNotify()}
            className="mt-4 inline-flex min-h-10 items-center rounded-full border border-gold-accent/40 bg-gold-wash px-4 text-sm font-semibold text-gold-text disabled:opacity-60"
          >
            {t("loader.notify")}
          </button>
        ) : notify === "on" ? (
          <p className="mt-3 text-xs text-success-ink">{t("loader.notifyOn")}</p>
        ) : null}
      </div>

      {!failed ? (
        <figure className="mt-8 w-full max-w-sm rounded-2xl border border-line bg-paper px-5 py-4 text-left shadow-[0_8px_24px_rgba(36,32,25,0.05)]">
          <figcaption className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-text">
            {t("loader.mythLabel")}
          </figcaption>
          <p key={myth} className="ngl-fade mt-2 min-h-[4.5rem] text-[15px] leading-relaxed text-ink" data-testid="loader-myth">
            {t(`loader.myth.${myth + 1}`)}
          </p>
        </figure>
      ) : null}
    </section>
  );
}
