"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { NavagrahaWheel } from "@/components/shell/navagraha-loader";
import { PublicShell } from "@/components/bond/public-shell";
import { useLocale } from "@/context/locale-context";
import { PENDING_INVITE_KEY } from "@/lib/bond";
import { LOCALE_STORAGE_KEY, normalizeLocale } from "@/lib/locale";
import { fill } from "@/lib/messages-bond";
import { createClient } from "@/lib/supabase/client";

type Preview = { inviter: string; partner_name: string; expired: boolean; language: string };

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { t, previewLocale } = useLocale();
  const [p, setP] = useState<Preview | null>(null);
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 2600);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    fetch(`/api/public/invite?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("bad");
        const j = (await r.json()) as Preview;
        setP(j);
        if (!localStorage.getItem(LOCALE_STORAGE_KEY)) previewLocale(normalizeLocale(j.language));
      })
      .catch(() => setBad(true));
  }, [token, previewLocale]);

  async function accept() {
    setBusy(true);
    try {
      localStorage.setItem(PENDING_INVITE_KEY, token);
    } catch {
      /* private mode: the link still works after sign-in from the same tab */
    }
    const supabase = createClient();
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    router.push(data.session ? "/bond?src=invite" : "/auth?next=/bond");
  }

  return (
    <PublicShell>
      <section className="rounded-3xl border border-gold-accent/30 bg-paper px-6 py-8 text-center shadow-[0_12px_36px_rgba(119,84,31,0.08)]" data-testid="join-page">
        <div className="mx-auto h-24 w-24"><NavagrahaWheel active={tick} /></div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-gold-text">{t("join.eyebrow")}</p>
        {bad ? (
          <p className="mt-3 text-base text-ink">{t("join.invalid")}</p>
        ) : !p ? (
          <p className="mt-3 text-sm text-ink-tertiary">…</p>
        ) : p.expired ? (
          <p className="mt-3 text-base text-ink">{t("join.expired")}</p>
        ) : (
          <>
            <h1 className="mt-2 font-serif text-[1.8rem] leading-tight text-ink">{fill(t("join.title"), { name: p.inviter })}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-secondary">{t("join.sub")}</p>
            <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm text-ink">
              {(["join.point1", "join.point2", "join.point3"] as const).map((k) => (
                <li key={k} className="flex gap-2"><span className="text-gold-accent">✦</span>{t(k)}</li>
              ))}
            </ul>
            <button type="button" disabled={busy} onClick={() => void accept()} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-button text-sm font-semibold text-ink disabled:opacity-60" data-testid="join-accept">
              {busy ? t("join.accepting") : t("join.cta")}
            </button>
          </>
        )}
      </section>
    </PublicShell>
  );
}
