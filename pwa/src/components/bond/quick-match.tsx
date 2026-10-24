"use client";

import { useState } from "react";
import { MuhField, MuhInput } from "@/components/ui/form-fields";
import { ShareCardButton } from "@/components/share/share-button";
import { useLocale } from "@/context/locale-context";
import { bondPost, type Band } from "@/lib/bond";
import { fill } from "@/lib/messages-bond";
import { ScoreRing } from "./score-ring";
import { emptyPerson, PersonPicker, personPayload, type PersonInput } from "./person-picker";

export type QuickResult = { total: number; band: Band; approximate: boolean; partnerName: string; input: PersonInput };

/** Free hook (in app): your chart vs. their star or date → guna total + band + share card. */
export function QuickMatch({ myName, onSave }: { myName: string; onSave: (r: QuickResult) => void }) {
  const { t, locale } = useLocale();
  const [name, setName] = useState("");
  const [person, setPerson] = useState<PersonInput>(emptyPerson);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<QuickResult | null>(null);

  async function run() {
    const b = personPayload(person);
    if (!b) {
      setMsg(t("bond.quick.needInput"));
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await bondPost<{ total: number; band: Band; approximate: boolean }>("match_quick", { b });
      setResult({ total: r.total, band: r.band, approximate: r.approximate, partnerName: name.trim().split(/\s+/)[0] || t("match.partner"), input: person });
    } catch (e) {
      const code = (e as { code?: string }).code;
      setMsg(code === "birth_required" ? t("bond.needBirth") : t("bond.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <section className="rounded-3xl border border-gold-accent/30 bg-paper px-5 py-6 shadow-[0_12px_36px_rgba(119,84,31,0.08)]" data-testid="quick-result">
        <ScoreRing total={result.total} band={result.band} names={[myName, result.partnerName]} />
        <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-relaxed text-ink-secondary">{t(`bond.bandLine.${result.band}`)}</p>
        {result.approximate ? <p className="mt-2 text-center text-xs text-ink-tertiary">{t("bond.approx")}</p> : null}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <ShareCardButton
            type="match"
            label={t("bond.shareMatch")}
            build={() => ({
              title: fill(t("bond.share.title"), { a: myName, b: result.partnerName }),
              value: `${result.total} / 36`,
              subtitle: t(`bond.band.${result.band}`),
              body: t(`bond.bandLine.${result.band}`),
              glyph: "bond",
            })}
          />
          <button type="button" onClick={() => setResult(null)} className="min-h-9 rounded-full px-3 text-xs font-semibold text-ink-secondary">
            {t("bond.quick.again")}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onSave(result)}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-button px-6 text-sm font-semibold text-ink shadow-sm"
          data-testid="quick-save"
        >
          {fill(t("bond.save.cta"), { name: result.partnerName })}
        </button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-tertiary">{t("bond.myth")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-paper px-5 py-5" data-testid="quick-match" lang={locale}>
      <div>
        <h2 className="font-serif text-xl text-ink">{t("bond.quick.title")}</h2>
        <p className="mt-1 text-sm text-ink-secondary">{t("bond.quick.sub")}</p>
      </div>
      <MuhField label={t("bond.quick.partnerName")} htmlFor="qm-name">
        <MuhInput id="qm-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={40} />
      </MuhField>
      <PersonPicker value={person} onChange={setPerson} idPrefix="qm" />
      {msg ? <p className="text-sm text-warning-ink" role="status">{msg}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-button px-6 text-sm font-semibold text-ink shadow-sm disabled:opacity-60"
        data-testid="quick-cta"
      >
        {busy ? t("bond.quick.busy") : t("bond.quick.cta")}
      </button>
    </section>
  );
}
