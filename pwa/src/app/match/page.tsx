"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { AttributionCapture } from "@/components/share/attribution-capture";
import { PublicShell } from "@/components/bond/public-shell";
import { ScoreRing } from "@/components/bond/score-ring";
import { emptyPerson, PersonPicker, personPayload, type PersonInput } from "@/components/bond/person-picker";
import { MuhField, MuhInput } from "@/components/ui/form-fields";
import { useLocale } from "@/context/locale-context";
import type { Band } from "@/lib/bond";
import { fill } from "@/lib/messages-bond";

type R = { total: number; band: Band; approximate: boolean };

function MatchInner() {
  const { t } = useLocale();
  const [names, setNames] = useState(["", ""]);
  const [a, setA] = useState<PersonInput>(emptyPerson);
  const [b, setB] = useState<PersonInput>(emptyPerson);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [res, setRes] = useState<R | null>(null);
  const nm = [names[0].trim() || t("match.you"), names[1].trim() || t("match.partner")] as [string, string];

  async function run() {
    const pa = personPayload(a), pb = personPayload(b);
    if (!pa || !pb) {
      setMsg(t("bond.quick.needInput"));
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/public/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ a: pa, b: pb }) });
      const j = (await r.json()) as R & { error_code?: string };
      if (!r.ok) throw new Error(j.error_code);
      setRes(j);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setMsg(t("bond.failed"));
    } finally {
      setBusy(false);
    }
  }

  const shareText = res ? `${fill(t("bond.share.title"), { a: nm[0], b: nm[1] })}: ${res.total}/36 — ${t(`bond.band.${res.band}`)}. ${t("match.title")}` : "";
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/match?src=match_share` : "/match";

  return (
    <PublicShell>
      <AttributionCapture />
      {res ? (
        <section className="rounded-3xl border border-gold-accent/30 bg-paper px-5 py-6 shadow-[0_12px_36px_rgba(119,84,31,0.08)]" data-testid="public-result">
          <ScoreRing total={res.total} band={res.band} names={nm} />
          <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-relaxed text-ink-secondary">{t(`bond.bandLine.${res.band}`)}</p>
          {res.approximate ? <p className="mt-2 text-center text-xs text-ink-tertiary">{t("bond.approx")}</p> : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#25D366] text-sm font-semibold text-white" data-testid="public-share-wa">
              {t("bond.invite.whatsapp")}
            </a>
            <button type="button" onClick={() => void (navigator.share ? navigator.share({ text: shareText, url: shareUrl }).catch(() => undefined) : navigator.clipboard?.writeText(`${shareText} ${shareUrl}`))} className="inline-flex min-h-11 items-center justify-center rounded-full border border-line text-sm font-semibold text-ink">
              {t("bond.shareMatch")}
            </button>
          </div>
          <div className="mt-5 rounded-2xl bg-gold-wash/40 px-4 py-4 text-center">
            <p className="font-serif text-lg text-ink">{t("match.full")}</p>
            <p className="mt-1 text-sm text-ink-secondary">{t("match.fullSub")}</p>
            <Link href="/auth?next=/bond" className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-button text-sm font-semibold text-ink" data-testid="public-full">
              {t("match.start")} →
            </Link>
          </div>
          <button type="button" onClick={() => setRes(null)} className="mt-3 w-full text-center text-xs font-semibold text-ink-tertiary">{t("bond.quick.again")}</button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-tertiary">{t("bond.myth")}</p>
        </section>
      ) : (
        <div className="space-y-5" data-testid="public-match">
          <div className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-text">{t("match.eyebrow")}</p>
            <h1 className="font-serif text-[2rem] leading-tight text-ink">{t("match.title")}</h1>
            <p className="text-sm text-ink-secondary">{t("match.sub")}</p>
          </div>
          {[0, 1].map((i) => (
            <section key={i} className="space-y-3 rounded-3xl border border-line bg-paper px-5 py-5">
              <MuhField label={i === 0 ? t("match.you") : t("match.partner")} htmlFor={`pm-n${i}`}>
                <MuhInput id={`pm-n${i}`} value={names[i]} maxLength={30} autoComplete="off" onChange={(e) => setNames((n) => (i === 0 ? [e.target.value, n[1]] : [n[0], e.target.value]))} placeholder={t("bond.add.name")} />
              </MuhField>
              <PersonPicker value={i === 0 ? a : b} onChange={i === 0 ? setA : setB} idPrefix={`pm${i}`} />
            </section>
          ))}
          {msg ? <p className="text-center text-sm text-warning-ink">{msg}</p> : null}
          <button type="button" disabled={busy} onClick={() => void run()} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-button text-sm font-semibold text-ink shadow-sm disabled:opacity-60" data-testid="public-cta">
            {busy ? t("bond.quick.busy") : t("match.cta")}
          </button>
          <p className="text-center text-[11px] text-ink-tertiary">{t("match.privacy")}</p>
        </div>
      )}
    </PublicShell>
  );
}

export default function PublicMatchPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-canvas" />}>
      <MatchInner />
    </Suspense>
  );
}
