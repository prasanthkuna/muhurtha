"use client";

import { useState } from "react";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { NAKSHATRAS } from "@/lib/nakshatras";
import { TIME_BUCKETS } from "@/lib/chart-profiles";

export function ChartProfilesSection() {
  const { t } = useLocale();
  const {
    chartProfiles,
    activeChartProfileId,
    setActiveChartProfile,
    saveChartProfile,
    deleteChartProfile,
  } = useAppData();

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [dob, setDob] = useState("");
  const [place, setPlace] = useState("");
  const [bucket, setBucket] = useState("morning");
  const [nakshatra, setNakshatra] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSave() {
    if (!label.trim() || !dob || !place.trim() || !bucket) {
      setMsg(t("chart.incomplete"));
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await saveChartProfile({
        label: label.trim(),
        dateOfBirth: dob,
        birthPlace: place.trim(),
        timeBucket: bucket,
        janmaNakshatra: nakshatra || undefined,
      });
      setOpen(false);
      setLabel("");
      setDob("");
      setPlace("");
      setNakshatra("");
    } catch (e) {
      const text = e instanceof Error ? e.message : t("chart.incomplete");
      setMsg(text.includes("limit") ? t("chart.limit") : text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gold-text">{t("chart.sectionTitle")}</h2>
      <p className="text-sm text-ink-secondary">{t("chart.sectionHint")}</p>

      <button
        type="button"
        onClick={() => void setActiveChartProfile(null)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${
          !activeChartProfileId
            ? "border-gold-accent/50 bg-gold-wash text-ink"
            : "border-line bg-paper text-ink-secondary"
        }`}
      >
        {t("common.you")}
        {!activeChartProfileId ? <span className="text-xs text-gold-text">●</span> : null}
      </button>

      {chartProfiles.map((p) => (
        <div
          key={p.id}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
            activeChartProfileId === p.id
              ? "border-gold-accent/50 bg-gold-wash/50"
              : "border-line bg-paper"
          }`}
        >
          <button
            type="button"
            className="min-h-10 flex-1 text-left text-sm font-medium text-ink"
            onClick={() => void setActiveChartProfile(p.id, p.label)}
          >
            {p.label}
            {p.dateOfBirth ? (
              <span className="mt-0.5 block text-xs font-normal text-ink-tertiary">
                {p.dateOfBirth}
                {p.birthPlace ? ` · ${p.birthPlace}` : ""}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs text-warning-ink"
            onClick={() => void deleteChartProfile(p.id)}
          >
            {t("common.delete")}
          </button>
        </div>
      ))}

      {chartProfiles.length === 0 ? (
        <p className="text-sm text-ink-tertiary">{t("chart.empty")}</p>
      ) : null}

      {!open ? (
        <PrimaryButton type="button" className="w-full" onClick={() => setOpen(true)}>
          {t("chart.addTitle")}
        </PrimaryButton>
      ) : (
        <div className="space-y-3 rounded-2xl border border-line bg-paper p-4">
          <p className="text-sm font-semibold text-ink">{t("chart.addTitle")}</p>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("chart.name")}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          />
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder={t("chart.place")}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          />
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          >
            {TIME_BUCKETS.map((b) => (
              <option key={b.value} value={b.value}>
                {t(b.key)}
              </option>
            ))}
          </select>
          <select
            value={nakshatra}
            onChange={(e) => setNakshatra(e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          >
            <option value="">{t("chart.nakshatra")}</option>
            {NAKSHATRAS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <PrimaryButton type="button" className="flex-1" onClick={() => void onSave()}>
              {busy ? t("chart.saving") : t("chart.addButton")}
            </PrimaryButton>
            <button
              type="button"
              className="rounded-full border border-line px-4 text-sm"
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
      {msg ? <p className="text-sm text-ink-secondary">{msg}</p> : null}
    </section>
  );
}
