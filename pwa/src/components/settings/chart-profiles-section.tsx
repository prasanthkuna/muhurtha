"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Users } from "@/components/celestial/muh-icon";
import {
  BirthDetailsFields,
  type BirthDetailsValues,
} from "@/components/birth/birth-details-fields";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { chartBirthLine, initialOf } from "@/lib/chart-profiles";
import { resolveBirthInputMode } from "@/lib/onboarding/engine-resolution";

const emptyPartner: BirthDetailsValues = {
  displayName: "",
  dateOfBirth: "",
  birthPlace: null,
  currentPlace: null,
  timeMode: "bucket",
  timeBucket: "morning",
  exactTime: "",
  janmaNakshatra: "",
};

export function ChartProfilesSection() {
  const { t, locale } = useLocale();
  const {
    chartProfiles,
    activeChartProfileId,
    setActiveChartProfile,
    saveChartProfile,
    deleteChartProfile,
  } = useAppData();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<BirthDetailsValues>(emptyPartner);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Deep link from the profile switcher ("Add someone" → /settings#add-chart).
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#add-chart") {
        setOpen(true);
        window.setTimeout(
          () => document.getElementById("charts")?.scrollIntoView({ behavior: "smooth", block: "start" }),
          50,
        );
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  async function onSave() {
    if (!values.displayName.trim() || !values.dateOfBirth || !values.birthPlace) {
      setMsg(t("chart.incomplete"));
      return;
    }
    if (values.timeMode === "exact" && !values.exactTime) {
      setMsg(t("onboarding.exactRequired"));
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const exactDb =
        values.timeMode === "exact" && values.exactTime
          ? `${values.exactTime.split(":")[0].padStart(2, "0")}:${values.exactTime.split(":")[1].padStart(2, "0")}:00`
          : null;
      const bucket = values.timeMode === "bucket" ? values.timeBucket : null;
      const birthInputMode = resolveBirthInputMode({
        exactBirthTime: exactDb,
        timeBucket: bucket,
        janmaNakshatra: values.janmaNakshatra || null,
      });

      await saveChartProfile({
        label: values.displayName.trim(),
        dateOfBirth: values.dateOfBirth,
        birthPlace: values.birthPlace.label,
        birthLat: values.birthPlace.lat,
        birthLng: values.birthPlace.lng,
        birthTimezone: values.birthPlace.timezone,
        birthInputMode,
        timeBucket: bucket,
        exactBirthTime: exactDb,
        janmaNakshatra: values.janmaNakshatra || undefined,
      });
      setOpen(false);
      setValues(emptyPartner);
      setMsg(`${t("chart.added")} ${t("chart.preparingShort")}`);
    } catch (e) {
      const text = e instanceof Error ? e.message : t("chart.incomplete");
      setMsg(text.includes("limit") ? t("chart.limit") : text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="charts" className="scroll-mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gold-text" aria-hidden />
        <h2 className="text-sm font-semibold text-gold-text">{t("chart.sectionTitle")}</h2>
      </div>
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
            className="flex min-h-10 flex-1 items-center gap-3 text-left text-sm font-medium text-ink"
            onClick={() => void setActiveChartProfile(p.id, p.label)}
            aria-pressed={activeChartProfileId === p.id}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-wash text-xs font-semibold text-gold-text"
              aria-hidden
            >
              {initialOf(p.label)}
            </span>
            <span className="min-w-0">
              <span className="block truncate">{p.label}</span>
              {p.dateOfBirth ? (
                <span className="mt-0.5 block text-xs font-normal text-ink-tertiary">
                  {chartBirthLine(p, locale, t)}
                </span>
              ) : null}
            </span>
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-warning-ink hover:bg-warning-wash/40"
            aria-label={`${t("common.delete")} ${p.label}`}
            onClick={() => {
              if (window.confirm(`${t("chart.confirmDelete")} ${p.label}?`)) {
                void deleteChartProfile(p.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}

      {chartProfiles.length === 0 ? (
        <p className="text-sm text-ink-tertiary">{t("chart.empty")}</p>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold-accent/40 bg-gold-wash/20 py-3 text-sm font-medium text-gold-text hover:bg-gold-wash/40"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("chart.addTitle")}
        </button>
      ) : (
        <div className="space-y-3 rounded-2xl border border-line bg-paper p-4">
          <p className="text-sm font-semibold text-ink">{t("chart.addTitle")}</p>
          <BirthDetailsFields
            values={values}
            onChange={(p) => setValues((v) => ({ ...v, ...p }))}
            nameLabel={t("chart.name")}
            showCurrentPlace={false}
            syncBirthFromCurrent={false}
            detectBirthPlace={false}
          />
          <div className="flex gap-2">
            <PrimaryButton
              type="button"
              className="flex-1"
              onClick={() => void onSave()}
              disabled={busy}
            >
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
