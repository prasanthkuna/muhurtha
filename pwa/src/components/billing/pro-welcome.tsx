"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ComponentType } from "react";
import { Calendar, Crown, Heart, ScrollText, Users, X } from "@/components/celestial/muh-icon";
import { ShareCardButton } from "@/components/share/share-button";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { fill, nakLabel } from "@/lib/messages-bond";
import { logProduct } from "@/lib/product-events";
import { clip, rashiGlyph } from "@/lib/share/builders";
import { featureForReason, orderedFeatures, type PaywallReason, type ProFeature } from "./paywall-sheet";

export const PRO_WELCOMED_PREFIX = "muh_pro_welcomed_";

export function proWelcomedKey(userId: string | null, subscriptionId: string | null | undefined) {
  return `${PRO_WELCOMED_PREFIX}${userId ?? "anon"}_${subscriptionId ?? "none"}`;
}

const HREF: Record<ProFeature, string> = {
  calendar: "/calendar?view=year",
  bond: "/bond?tab=match",
  chapters: "/life",
  family: "/settings#charts",
  ask: "/ask",
  timing: "/timing",
  language: "/settings#language",
  birth: "/settings#birth",
};

const ICON: Partial<Record<ProFeature, ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>>> = {
  calendar: Calendar,
  bond: Heart,
  chapters: ScrollText,
  family: Users,
};

function localeTag(l: string) {
  return l === "te" ? "te-IN" : l === "hi" ? "hi-IN" : "en-IN";
}

/** Full-screen "you're Pro" moment. Shown once per subscription, however Pro started. */
export function ProWelcome({
  reason,
  lockedBefore,
  onClose,
}: {
  reason: PaywallReason;
  lockedBefore: number;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { pack, views, today, access, activeChartProfileId } = useAppData();
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logProduct("pro_welcome_view", { reason, locked: lockedBefore });
  }, [reason, lockedBefore]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const first = !activeChartProfileId ? (pack?.displayName ?? "").trim().split(/\s+/)[0] : "";
  const star = today?.birthStar ? nakLabel(today.birthStar, locale) : null;
  const chapter = views?.currentChapter()?.title?.trim() || null;
  const { hero, strip } = orderedFeatures(reason);
  const lead = featureForReason(reason) ?? "calendar";
  const until = access?.currentPeriodEnd
    ? new Date(access.currentPeriodEnd).toLocaleDateString(localeTag(locale), { day: "numeric", month: "short", year: "numeric" })
    : null;
  const luck = views?.natalLuck ?? null;

  function go(f: ProFeature, where: "primary" | "card" | "chip") {
    logProduct("pro_welcome_cta", { feature: f, where });
    onClose();
    router.push(HREF[f]);
  }

  return (
    <div className="fixed inset-0 z-[130] overflow-y-auto bg-paper" role="dialog" aria-modal="true" aria-labelledby="pro-welcome-title" data-testid="pro-welcome">
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => {
            logProduct("pro_welcome_cta", { feature: "close", where: "x" });
            onClose();
          }}
          aria-label={t("pwel.later")}
          className="absolute right-3 top-3 rounded-full p-2 text-ink-tertiary hover:bg-gold-wash/40"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="flex flex-col items-center pt-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold-wash to-gold-accent/40 text-gold-text shadow-[0_0_40px_rgba(201,162,74,0.35)] ring-1 ring-gold-accent/40">
            <Crown className="h-8 w-8" strokeWidth={1.5} aria-hidden />
          </span>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-text">{t("pwel.eyebrow")}</p>
          <h1 id="pro-welcome-title" className="mt-1 font-serif text-[1.65rem] leading-tight text-ink">
            {first ? fill(t("pwel.title"), { name: first }) : t("pwel.titleNoName")}
          </h1>
          {star ? (
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-secondary" data-testid="pro-welcome-star">
              {chapter ? fill(t("pwel.star"), { star, chapter }) : fill(t("pwel.starOnly"), { star })}
            </p>
          ) : null}
          {lockedBefore > 0 ? (
            <p className="mt-3 rounded-full bg-gold-wash/70 px-3.5 py-1.5 text-sm font-semibold text-gold-text" data-testid="pro-welcome-stat">
              {fill(t("pwel.stat"), { n: lockedBefore })}
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-tertiary">{t("pwel.section")}</p>
        <div className="mt-2 grid grid-cols-2 gap-2.5" data-testid="pro-welcome-cards">
          {hero.map((f) => {
            const Icon = ICON[f] ?? Crown;
            return (
              <button
                key={f}
                type="button"
                onClick={() => go(f, "card")}
                data-testid={`pwel-card-${f}`}
                className={
                  "flex flex-col items-start rounded-2xl border px-3.5 py-3 text-left transition active:scale-[0.98] " +
                  (f === lead ? "border-gold-accent/60 bg-gold-wash/50" : "border-line bg-gold-wash/10")
                }
              >
                <Icon className="h-5 w-5 text-gold-text" strokeWidth={1.7} aria-hidden />
                <span className="mt-2 text-sm font-semibold text-ink">{t(`pwel.c.${f}`)}</span>
                <span className="mt-0.5 text-xs leading-snug text-ink-secondary">{t(`pwel.cs.${f}`)}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {strip.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => go(f, "chip")}
              className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-secondary"
            >
              {t(`pw.s.${f}`)}
            </button>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={() => go(lead, "primary")}
            className="w-full rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-paper shadow-lg active:scale-[0.99]"
            data-testid="pro-welcome-primary"
          >
            {t(`pwel.cta.${lead}`)}
          </button>
          {views && star ? (
            <div className="mt-3 flex justify-center">
              <ShareCardButton
                type="decode"
                label={t("pwel.share")}
                build={() => ({
                  title: fill(t("pwel.shareTitle"), { star }),
                  value: luck?.moonSignLabel || undefined,
                  subtitle: t("decode.janmaLabel"),
                  body: clip(views.identitySummary, 230),
                  chips: views.strengths.filter((x) => x.length <= 28).slice(0, 2),
                  glyph: rashiGlyph(luck?.moonSignKey || luck?.moonSymbol) ?? "decode",
                })}
              />
            </div>
          ) : null}
          <button type="button" onClick={onClose} className="mt-3 w-full py-2 text-sm text-ink-secondary">
            {t("pwel.later")}
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-tertiary">
            {until ? `${fill(t("pwel.until"), { date: until })} · ` : ""}
            <Link href="/settings" onClick={onClose} className="underline underline-offset-2">
              {t("pwel.manage")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
