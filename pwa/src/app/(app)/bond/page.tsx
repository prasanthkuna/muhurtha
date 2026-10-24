"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/editorial/page-header";
import { LoadingState } from "@/components/editorial/loading-state";
import { ShareCardButton } from "@/components/share/share-button";
import { BondLoader } from "@/components/bond/bond-loader";
import { InviteCard } from "@/components/bond/invite-card";
import { LoveView, MatchView } from "@/components/bond/match-view";
import { MonthView } from "@/components/bond/month-view";
import { PartnerForm } from "@/components/bond/partner-form";
import { QuickMatch, type QuickResult } from "@/components/bond/quick-match";
import { ScoreRing } from "@/components/bond/score-ring";
import { TodayCard } from "@/components/bond/today-card";
import type { BirthDetailsValues } from "@/components/birth/birth-details-fields";
import { cn } from "@/components/ui/cn";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { usePaywall } from "@/context/paywall-context";
import { bondPost, monthLabel, type BondStatus, type MatchFull, type MatchText, type MonthFactsView, type MonthText, type Progress } from "@/lib/bond";
import { fill } from "@/lib/messages-bond";

type Tab = "match" | "love" | "month";
const POLL_MS = 3500;

function useBondStatus() {
  const [status, setStatus] = useState<BondStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setStatus(await bondPost<BondStatus>("bond_status"));
      setErr(null);
    } catch (e) {
      setErr((e as { code?: string }).code ?? "failed");
    }
  }, []);
  return { status, err, load, setStatus };
}

function MatchPanel({ tab, initial }: { tab: "match" | "love"; initial: BondStatus }) {
  const { t } = useLocale();
  const [match, setMatch] = useState<MatchFull | undefined>(initial.match);
  const [text, setText] = useState<MatchText | null>(initial.match_text ?? null);
  const [prog, setProg] = useState<Progress | null>(initial.match_progress ?? null);
  const timer = useRef<number | null>(null);

  const pull = useCallback(async (retry = false) => {
    const r = await bondPost<{ match: MatchFull; text: MatchText | null; progress: Progress }>("match_get", retry ? { retry: true } : {});
    setMatch(r.match);
    setText(r.text);
    setProg(r.progress);
    return r;
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const r = await pull().catch(() => null);
      if (alive && r && r.progress.state === "generating") timer.current = window.setTimeout(() => void tick(), POLL_MS);
    };
    if (!text) void tick();
    return () => {
      alive = false;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [pull, text]);

  if (!match) return null;
  const writing = !text && prog && (prog.state === "generating" || prog.state === "none");
  return (
    <div className="space-y-5">
      {writing ? <BondLoader pct={prog?.pct ?? 5} title={t("bond.writing")} /> : null}
      {!text && prog?.state === "failed" ? <BondLoader pct={0} failed title={t("bond.failed")} onRetry={() => void pull(true)} /> : null}
      {tab === "match" ? <MatchView match={match} text={text} /> : <LoveView match={match} text={text} />}
    </div>
  );
}

function MonthPanel({ today }: { today: string }) {
  const { t, locale } = useLocale();
  const thisMonth = today.slice(0, 7);
  const next = (() => {
    const [y, m] = thisMonth.split("-").map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  })();
  const [month, setMonth] = useState(thisMonth);
  const [facts, setFacts] = useState<MonthFactsView | null>(null);
  const [text, setText] = useState<MonthText | null>(null);
  const [prog, setProg] = useState<Progress | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    let tm: number | null = null;
    setFacts(null);
    setText(null);
    setProg(null);
    const tick = async (retry = false) => {
      try {
        const r = await bondPost<{ facts: MonthFactsView; text: MonthText | null; progress: Progress }>("bond_month_get", { month, ...(retry ? { retry: true } : {}) });
        if (!alive) return;
        setFacts(r.facts);
        setText(r.text);
        setProg(r.progress);
        if (r.progress.state === "generating") tm = window.setTimeout(() => void tick(), POLL_MS);
      } catch {
        if (alive) setErr(true);
      }
    };
    void tick();
    return () => {
      alive = false;
      if (tm) window.clearTimeout(tm);
    };
  }, [month]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist">
        {[thisMonth, next].map((m, i) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonth(m)}
            className={cn("rounded-full px-4 py-2 text-sm font-semibold", month === m ? "bg-ink text-paper" : "border border-line text-ink-secondary")}
            data-testid={`month-pick-${i}`}
          >
            {i === 0 ? t("bond.month.this") : t("bond.month.next")} · {monthLabel(m, locale, false)}
          </button>
        ))}
      </div>
      {err ? <p className="text-sm text-warning-ink">{t("bond.failed")}</p> : null}
      {!facts ? <LoadingState /> : null}
      {facts && !text && prog?.state === "generating" ? <BondLoader pct={prog.pct} title={t("bond.writingMonth")} /> : null}
      {facts ? <MonthView facts={facts} text={text} today={today} /> : null}
    </div>
  );
}

function LockedTeaser({ status, onUnlock }: { status: BondStatus; onUnlock: () => void }) {
  const { t } = useLocale();
  const m = status.match;
  return (
    <section className="space-y-5" data-testid="bond-locked">
      {m ? (
        <div className="rounded-3xl border border-gold-accent/30 bg-paper px-5 py-6">
          <ScoreRing total={m.total} band={m.band} names={[m.a_name, m.b_name]} />
          <p className="mx-auto mt-3 max-w-xs text-center text-sm text-ink-secondary">{t(`bond.bandLine.${m.band}`)}</p>
        </div>
      ) : null}
      <div className="rounded-3xl border border-line bg-gradient-to-b from-paper to-gold-wash/40 px-5 py-5">
        <h2 className="font-serif text-xl text-ink">{t("bond.unlock.title")}</h2>
        <p className="mt-1 text-sm text-ink-secondary">{t("bond.unlock.sub")}</p>
        <ul className="mt-3 space-y-2 text-sm text-ink">
          {(["kootas", "kuja", "love", "month", "streak"] as const).map((k) => (
            <li key={k} className="flex gap-2"><span className="text-gold-accent">✦</span>{t(`bond.unlock.${k}`)}</li>
          ))}
        </ul>
        <button type="button" onClick={onUnlock} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-button text-sm font-semibold text-ink" data-testid="bond-unlock">
          {t("bond.unlock.cta")}
        </button>
      </div>
    </section>
  );
}

function prefillFrom(r: QuickResult | null): Partial<BirthDetailsValues> | undefined {
  if (!r) return undefined;
  const p = r.input;
  return {
    displayName: r.partnerName === "" ? "" : r.partnerName,
    ...(p.mode === "date" ? { dateOfBirth: p.dob, ...(p.time ? { timeMode: "exact" as const, exactTime: p.time } : {}) } : { janmaNakshatra: p.nakshatra }),
  };
}

function BondInner() {
  const params = useSearchParams();
  const { t } = useLocale();
  const { openPaywall } = usePaywall();
  const { isPro } = useAppData();
  const { status, err, load, setStatus } = useBondStatus();
  const [tab, setTab] = useState<Tab>(() => (params.get("tab") === "month" ? "month" : params.get("tab") === "love" ? "love" : "match"));
  const [adding, setAdding] = useState<QuickResult | null | "blank">(null);

  useEffect(() => {
    void load();
  }, [load, isPro]);

  if (err === "birth_required" || err === "profile_required") {
    return <p className="rounded-2xl bg-warning-wash/50 px-4 py-3 text-sm text-warning-ink">{t("bond.needBirth")}</p>;
  }
  if (err) return <p className="text-sm text-warning-ink">{t("bond.failed")}</p>;
  if (!status) return <LoadingState />;

  const startAdd = (r: QuickResult | null) => {
    if (!status.isPro) {
      openPaywall("bond");
      return;
    }
    setAdding(r ?? "blank");
  };

  if (adding) {
    return (
      <PartnerForm
        initial={prefillFrom(adding === "blank" ? null : adding)}
        replace={Boolean(status.link)}
        onCancel={() => setAdding(null)}
        onProRequired={() => openPaywall("bond")}
        onSaved={() => {
          setAdding(null);
          setStatus(null);
          void load();
        }}
      />
    );
  }

  if (!status.link) {
    return (
      <div className="space-y-5">
        <QuickMatch myName={t("match.you")} onSave={(r) => startAdd(r)} />
        <button type="button" onClick={() => startAdd(null)} className="w-full text-center text-sm font-semibold text-gold-text underline-offset-4 hover:underline" data-testid="bond-add-direct">
          {t("today.bond.add")}
        </button>
      </div>
    );
  }

  if (!status.access) return <LockedTeaser status={status} onUnlock={() => openPaywall("bond")} />;

  const m = status.match!;
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-gold-accent/30 bg-paper px-5 pb-5 pt-6 shadow-[0_12px_36px_rgba(119,84,31,0.08)]" data-testid="bond-hero">
        <ScoreRing total={m.total} band={m.band} names={[m.a_name, m.b_name]} />
        <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-relaxed text-ink-secondary">
          {status.match_text?.share_line ?? t(`bond.bandLine.${m.band}`)}
        </p>
        {status.link.status === "linked" ? <p className="mt-2 text-center text-xs font-medium text-success-ink">♥ {fill(t("bond.linked"), { name: status.link.partner_name })}</p> : null}
        <div className="mt-3 flex justify-center">
          <ShareCardButton
            type="match"
            label={t("bond.shareMatch")}
            build={() => ({
              title: fill(t("bond.share.title"), { a: m.a_name, b: m.b_name }),
              value: `${m.total} / 36`,
              subtitle: t(`bond.band.${m.band}`),
              body: status.match_text?.share_line ?? t(`bond.bandLine.${m.band}`),
              glyph: "bond",
            })}
          />
        </div>
      </section>

      <TodayCard status={status} partnerName={m.b_name} />
      <InviteCard link={status.link} myName={m.a_name} onChanged={() => void load()} />

      <div className="sticky top-0 z-10 -mx-1 flex gap-1 rounded-full bg-canvas/90 p-1 backdrop-blur" role="tablist">
        {(["match", "love", "month"] as Tab[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            type="button"
            onClick={() => setTab(k)}
            className={cn("min-h-10 flex-1 rounded-full text-sm font-semibold transition-colors", tab === k ? "bg-paper text-ink shadow-sm" : "text-ink-tertiary")}
            data-testid={`bond-tab-${k}`}
          >
            {t(`bond.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === "month" ? <MonthPanel today={status.today} /> : <MatchPanel key={tab} tab={tab} initial={status} />}

      <div className="flex justify-center gap-4 pt-4 text-xs text-ink-tertiary">
        {status.link.role === "owner" ? (
          <button type="button" onClick={() => startAdd(null)} className="underline-offset-4 hover:underline">{t("bond.changePartner")}</button>
        ) : null}
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(t("bond.unlinkConfirm"))) return;
            await bondPost("partner_unlink");
            setStatus(null);
            void load();
          }}
          className="underline-offset-4 hover:underline"
          data-testid="bond-unlink"
        >
          {t("bond.unlink")}
        </button>
      </div>
    </div>
  );
}

export default function BondPage() {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader eyebrow={t("bond.eyebrow")} title={t("bond.title")} subtitle={t("bond.subtitle")} className="mb-6" />
      <Suspense fallback={<LoadingState />}>
        <BondInner />
      </Suspense>
    </div>
  );
}
