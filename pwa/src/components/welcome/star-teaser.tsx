"use client";

import { useState } from "react";
import { MuhInput, MuhSelect } from "@/components/ui/form-fields";
import { useLocale } from "@/context/locale-context";
import { TIME_BUCKETS } from "@/lib/chart-profiles";
import { fill } from "@/lib/messages-bond";
import { logProduct } from "@/lib/product-events";
import { fetchTeaser, saveTeaser, type TeaserResult } from "@/lib/teaser";

/** Date of birth (+ rough time) → birth star, rashi, current dasha and one line. Zero LLM, public. */
export function StarTeaser({
  onSave,
  surface,
  shareUrl,
}: {
  onSave: () => void;
  surface: "welcome" | "share";
  shareUrl: string;
}) {
  const { t, locale } = useLocale();
  const [dob, setDob] = useState("");
  const [bucket, setBucket] = useState<string>("unknown");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<TeaserResult | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function submit() {
    if (!dob) {
      setErr(t("welcome.teaserNeedDob"));
      return;
    }
    setErr(null);
    setBusy(true);
    const timeBucket = bucket === "unknown" ? null : bucket;
    logProduct("teaser_submit", { surface, time: Boolean(timeBucket), locale });
    const r = await fetchTeaser({ dob, timeBucket, locale });
    setBusy(false);
    if (!r) {
      setErr(t("welcome.teaserFailed"));
      return;
    }
    saveTeaser({ dob, timeBucket, nakshatra: r.nakshatra, at: Date.now() });
    logProduct("teaser_result", { surface, nak: r.nakshatra });
    setRes(r);
  }

  if (res) {
    const line = res.dasha_label && res.dasha_end_year
      ? fill(t("welcome.result.line"), { star: res.nakshatra_label, rashi: res.rashi_label, lord: res.dasha_label, year: res.dasha_end_year })
      : fill(t("welcome.result.lineNoYear"), { star: res.nakshatra_label, rashi: res.rashi_label });
    const shareText = `${fill(t("welcome.result.shareText"), { star: res.nakshatra_label })} ${shareUrl}`;
    return (
      <section className="rounded-2xl border border-gold-accent/45 bg-gradient-to-br from-paper via-paper to-gold-wash/40 px-5 py-5 shadow-[0_10px_32px_rgba(119,84,31,0.10)]" data-testid="teaser-result">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-text">{t("welcome.result.eyebrow")}</p>
        <p className="mt-1 font-serif text-3xl leading-tight text-ink">✦ {res.nakshatra_label}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink">{line}</p>
        <p className="mt-3 rounded-xl bg-gold-wash/50 px-3 py-2.5 text-sm italic leading-relaxed text-ink-secondary">“{res.line}”</p>
        {res.approximate ? <p className="mt-2 text-[11px] text-ink-tertiary">{t("welcome.result.approx")}</p> : null}
        <button
          type="button"
          onClick={() => {
            logProduct("signin_click", { surface, from: "teaser" });
            onSave();
          }}
          className="mt-4 min-h-12 w-full rounded-full bg-ink px-5 text-sm font-semibold text-paper active:scale-[0.99]"
          data-testid="teaser-save"
        >
          {t("welcome.result.cta")}
        </button>
        <div className="mt-2 flex items-center justify-between gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => logProduct("share_whatsapp", { surface, from: "teaser" })}
            className="text-sm font-semibold text-success-ink underline-offset-4 hover:underline"
          >
            {t("welcome.result.share")} →
          </a>
          <button type="button" onClick={() => setRes(null)} className="text-xs text-ink-tertiary underline underline-offset-2">
            {t("welcome.result.again")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-paper px-4 py-4 shadow-sm" data-testid="teaser">
      <p className="font-serif text-lg text-ink">{t("welcome.teaserTitle")}</p>
      <div className="mt-3 grid grid-cols-[1.25fr_1fr] gap-2">
        <label className="block min-w-0">
          <span className="mb-1 block text-[11px] font-medium text-ink-tertiary">{t("welcome.teaserLabel")}</span>
          <MuhInput type="date" value={dob} max={today} min="1920-01-01" onChange={(e) => setDob(e.target.value)} data-testid="teaser-dob" />
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-[11px] font-medium text-ink-tertiary">{t("welcome.teaserTime")}</span>
          <MuhSelect value={bucket} onChange={(e) => setBucket(e.target.value)}>
            <option value="unknown">{t("welcome.timeUnknown")}</option>
            {TIME_BUCKETS.filter((b) => b.value !== "unknown").map((b) => (
              <option key={b.value} value={b.value}>
                {t(b.key)}
              </option>
            ))}
          </MuhSelect>
        </label>
      </div>
      {err ? <p className="mt-2 text-xs text-warning-ink" role="alert">{err}</p> : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="mt-3 min-h-11 w-full rounded-full bg-gold-button px-5 text-sm font-semibold text-ink disabled:opacity-60"
        data-testid="teaser-cta"
      >
        {busy ? t("welcome.teaserBusy") : t("welcome.teaserCta")}
      </button>
    </section>
  );
}
