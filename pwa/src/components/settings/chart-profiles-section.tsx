"use client";

import { useState } from "react";
import {
  BirthDetailsFields,
  type BirthDetailsValues,
} from "@/components/birth/birth-details-fields";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
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
  const { t } = useLocale();
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
          <BirthDetailsFields
            values={values}
            onChange={(p) => setValues((v) => ({ ...v, ...p }))}
            nameLabel={t("chart.name")}
            showCurrentPlace={false}
            syncBirthFromCurrent={false}
          />
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
