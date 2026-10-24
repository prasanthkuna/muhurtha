"use client";

import { useState } from "react";
import { BirthDetailsFields, type BirthDetailsValues } from "@/components/birth/birth-details-fields";
import { MuhSegment } from "@/components/ui/form-fields";
import { useLocale } from "@/context/locale-context";
import { bondPost } from "@/lib/bond";
import { resolveBirthInputMode } from "@/lib/onboarding/engine-resolution";

const KINDS = ["married", "engaged", "relationship", "prefer_not"] as const;

export function PartnerForm({ initial, replace, onSaved, onProRequired, onCancel }: {
  initial?: Partial<BirthDetailsValues>;
  replace?: boolean;
  onSaved: () => void;
  onProRequired: () => void;
  onCancel?: () => void;
}) {
  const { t } = useLocale();
  const [values, setValues] = useState<BirthDetailsValues>({
    displayName: "",
    dateOfBirth: "",
    birthPlace: null,
    currentPlace: null,
    timeMode: "bucket",
    timeBucket: "morning",
    exactTime: "",
    janmaNakshatra: "",
    ...initial,
  });
  const [kind, setKind] = useState<(typeof KINDS)[number]>("prefer_not");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (!values.displayName.trim() || !values.dateOfBirth || !values.birthPlace) {
      setMsg(t("bond.add.incomplete"));
      return;
    }
    if (!consent) {
      setMsg(t("bond.add.consentNeeded"));
      return;
    }
    const exact = values.timeMode === "exact" && values.exactTime
      ? `${values.exactTime.split(":")[0].padStart(2, "0")}:${values.exactTime.split(":")[1].padStart(2, "0")}:00`
      : null;
    const bucket = values.timeMode === "bucket" ? values.timeBucket : null;
    setBusy(true);
    setMsg(null);
    try {
      await bondPost("partner_add", {
        name: values.displayName.trim(),
        relationship_kind: kind,
        consent: true,
        replace: Boolean(replace),
        date_of_birth: values.dateOfBirth,
        exact_birth_time: exact,
        time_bucket: bucket,
        janma_nakshatra: values.janmaNakshatra || null,
        birth_place: values.birthPlace.label,
        birth_lat: values.birthPlace.lat,
        birth_lng: values.birthPlace.lng,
        birth_timezone: values.birthPlace.timezone,
        birth_input_mode: resolveBirthInputMode({ exactBirthTime: exact, timeBucket: bucket, janmaNakshatra: values.janmaNakshatra || null }),
      });
      onSaved();
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code.startsWith("pro_required")) onProRequired();
      else setMsg(code === "birth_required" ? t("bond.needBirth") : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-paper px-5 py-5" data-testid="partner-form">
      <div>
        <h2 className="font-serif text-xl text-ink">{t("bond.add.title")}</h2>
        <p className="mt-1 text-sm text-ink-secondary">{t("bond.add.sub")}</p>
      </div>
      <div className="space-y-2">
        <span className="text-xs font-medium text-ink-tertiary">{t("bond.add.kind")}</span>
        <MuhSegment value={kind} onChange={(id) => setKind(id as (typeof KINDS)[number])} options={KINDS.map((k) => ({ id: k, label: t(`bond.kind.${k}`) }))} />
      </div>
      <BirthDetailsFields
        values={values}
        onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
        nameLabel={t("bond.add.name")}
        showCurrentPlace={false}
        syncBirthFromCurrent={false}
        detectBirthPlace={false}
      />
      <label className="flex items-start gap-3 rounded-xl bg-gold-wash/30 px-3 py-3 text-sm text-ink">
        <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--gold-text)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="partner-consent" />
        <span>{t("bond.add.consent")}</span>
      </label>
      {msg ? <p className="text-sm text-warning-ink" role="status">{msg}</p> : null}
      <div className="flex gap-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="min-h-12 flex-1 rounded-full border border-line text-sm font-semibold text-ink-secondary">
            {t("common.cancel")}
          </button>
        ) : null}
        <button type="button" disabled={busy} onClick={() => void save()} className="min-h-12 flex-[2] rounded-full bg-gold-button text-sm font-semibold text-ink disabled:opacity-60" data-testid="partner-save">
          {busy ? t("bond.add.saving") : t("bond.add.save")}
        </button>
      </div>
    </section>
  );
}
