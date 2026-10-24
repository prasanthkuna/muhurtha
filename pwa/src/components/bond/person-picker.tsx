"use client";

import { MuhField, MuhInput, MuhSegment, MuhSelect } from "@/components/ui/form-fields";
import { useLocale } from "@/context/locale-context";
import { NAKSHATRAS } from "@/lib/nakshatras";
import { nakLabel } from "@/lib/messages-bond";

export type PersonInput = { mode: "star" | "date"; nakshatra: string; pada: string; dob: string; time: string };
export const emptyPerson: PersonInput = { mode: "star", nakshatra: "", pada: "", dob: "", time: "" };

/** Engine payload for match_quick: a star, or a birth date (+ optional time, India time). */
export function personPayload(p: PersonInput): Record<string, unknown> | null {
  if (p.mode === "star") return p.nakshatra ? { nakshatra: p.nakshatra, ...(p.pada ? { pada: Number(p.pada) } : {}) } : null;
  return p.dob ? { date_of_birth: p.dob, ...(p.time ? { time: p.time } : {}), timezone: "Asia/Kolkata" } : null;
}

export function PersonPicker({ value, onChange, idPrefix, starLabel, dobLabel }: {
  value: PersonInput;
  onChange: (v: PersonInput) => void;
  idPrefix: string;
  starLabel?: string;
  dobLabel?: string;
}) {
  const { t, locale } = useLocale();
  return (
    <div className="space-y-3">
      <MuhSegment
        value={value.mode}
        onChange={(id) => onChange({ ...value, mode: id as PersonInput["mode"] })}
        options={[
          { id: "star", label: t("bond.quick.byStar") },
          { id: "date", label: t("bond.quick.byDate") },
        ]}
      />
      {value.mode === "star" ? (
        <div className="grid grid-cols-[1fr_6.5rem] gap-2">
          <MuhField label={starLabel ?? t("bond.quick.star")} htmlFor={`${idPrefix}-nak`}>
            <MuhSelect id={`${idPrefix}-nak`} value={value.nakshatra} onChange={(e) => onChange({ ...value, nakshatra: e.target.value })} data-testid={`${idPrefix}-nak`}>
              <option value="">—</option>
              {NAKSHATRAS.map((n) => (
                <option key={n} value={n}>
                  {nakLabel(n, locale)}
                </option>
              ))}
            </MuhSelect>
          </MuhField>
          <MuhField label={t("bond.quick.pada")} htmlFor={`${idPrefix}-pada`}>
            <MuhSelect id={`${idPrefix}-pada`} value={value.pada} onChange={(e) => onChange({ ...value, pada: e.target.value })}>
              <option value="">{t("bond.quick.padaUnknown")}</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </MuhSelect>
          </MuhField>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <MuhField label={dobLabel ?? t("bond.quick.dob")} htmlFor={`${idPrefix}-dob`}>
            <MuhInput id={`${idPrefix}-dob`} type="date" value={value.dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => onChange({ ...value, dob: e.target.value })} data-testid={`${idPrefix}-dob`} />
          </MuhField>
          <MuhField label={t("bond.quick.time")} htmlFor={`${idPrefix}-time`}>
            <MuhInput id={`${idPrefix}-time`} type="time" value={value.time} onChange={(e) => onChange({ ...value, time: e.target.value })} />
          </MuhField>
        </div>
      )}
    </div>
  );
}
