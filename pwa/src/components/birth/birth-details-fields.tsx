"use client";

import { LocationPicker } from "@/components/location/location-picker";
import { MuhField, MuhInput, MuhSegment, MuhSelect } from "@/components/ui/form-fields";
import { TIME_BUCKETS } from "@/lib/chart-profiles";
import { NAKSHATRAS } from "@/lib/nakshatras";
import type { ResolvedPlace } from "@/lib/location/resolved-place";
import { useLocale } from "@/context/locale-context";
import { useEffect, useState } from "react";

export type BirthDetailsValues = {
  displayName: string;
  dateOfBirth: string;
  birthPlace: ResolvedPlace | null;
  currentPlace: ResolvedPlace | null;
  timeMode: "bucket" | "exact";
  timeBucket: string;
  exactTime: string;
  janmaNakshatra: string;
};

export function BirthDetailsFields({
  values,
  onChange,
  showName = true,
  nameLabel,
  showCurrentPlace = true,
  syncBirthFromCurrent = true,
}: {
  values: BirthDetailsValues;
  onChange: (patch: Partial<BirthDetailsValues>) => void;
  showName?: boolean;
  nameLabel?: string;
  showCurrentPlace?: boolean;
  syncBirthFromCurrent?: boolean;
}) {
  const { t } = useLocale();
  const [birthUnlinked, setBirthUnlinked] = useState(false);

  useEffect(() => {
    if (!syncBirthFromCurrent || birthUnlinked) return;
    if (values.currentPlace && !values.birthPlace) {
      onChange({ birthPlace: values.currentPlace });
    }
  }, [values.currentPlace, values.birthPlace, syncBirthFromCurrent, birthUnlinked, onChange]);

  return (
    <div className="space-y-4">
      {showName ? (
        <MuhField label={nameLabel ?? t("onboarding.name")} htmlFor="birth-name">
          <MuhInput
            id="birth-name"
            value={values.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            autoComplete="name"
          />
        </MuhField>
      ) : null}

      <MuhField label={t("onboarding.dob")} htmlFor="birth-dob">
        <MuhInput
          id="birth-dob"
          type="date"
          value={values.dateOfBirth}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => onChange({ dateOfBirth: e.target.value })}
        />
      </MuhField>

      {showCurrentPlace ? (
        <LocationPicker
          label={t("onboarding.currentCity")}
          value={values.currentPlace}
          onChange={(currentPlace) => onChange({ currentPlace })}
          autoDetect
        />
      ) : null}

      <LocationPicker
        label={t("onboarding.birthPlace")}
        value={values.birthPlace}
        onChange={(birthPlace) => {
          setBirthUnlinked(true);
          onChange({ birthPlace });
        }}
        autoDetect={!showCurrentPlace}
      />

      {showCurrentPlace && syncBirthFromCurrent && !birthUnlinked ? (
        <button
          type="button"
          className="text-xs font-medium text-gold-text"
          onClick={() => setBirthUnlinked(true)}
        >
          {t("onboarding.bornElsewhere")}
        </button>
      ) : null}

      <div className="space-y-2">
        <span className="text-xs font-medium text-ink-tertiary">{t("onboarding.birthTime")}</span>
        <MuhSegment
          value={values.timeMode}
          onChange={(id) => onChange({ timeMode: id as "bucket" | "exact" })}
          options={[
            { id: "bucket", label: t("onboarding.timeWindow") },
            { id: "exact", label: t("onboarding.exactTime") },
          ]}
        />
        {values.timeMode === "bucket" ? (
          <MuhSelect value={values.timeBucket} onChange={(e) => onChange({ timeBucket: e.target.value })}>
            {TIME_BUCKETS.filter((b) => b.value !== "unknown").map((b) => (
              <option key={b.value} value={b.value}>
                {t(b.key)}
              </option>
            ))}
          </MuhSelect>
        ) : (
          <MuhInput type="time" value={values.exactTime} onChange={(e) => onChange({ exactTime: e.target.value })} />
        )}
      </div>

      <MuhField label={t("onboarding.nakshatra")} htmlFor="birth-nak">
        <MuhSelect
          id="birth-nak"
          value={values.janmaNakshatra}
          onChange={(e) => onChange({ janmaNakshatra: e.target.value })}
        >
          <option value="">{t("onboarding.nakshatraSkip")}</option>
          {NAKSHATRAS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </MuhSelect>
      </MuhField>
    </div>
  );
}
