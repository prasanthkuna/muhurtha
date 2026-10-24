"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { cn } from "@/components/ui/cn";
import { bondPost, DAY_STYLE, type BondStatus } from "@/lib/bond";

const KEY = "muhurta.bondStatus.v1";
const TTL = 10 * 60_000;

/** One quiet line on Today: "you two today" for couples, an invite to add a partner otherwise. */
export function TodayBondLine() {
  const { t } = useLocale();
  const { userId, isPro } = useAppData();
  const [s, setS] = useState<BondStatus | null>(null);
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const c = JSON.parse(raw) as { at: number; uid: string; pro: boolean; s: BondStatus };
        if (c.uid === userId && c.pro === isPro && Date.now() - c.at < TTL) {
          setS(c.s);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    bondPost<BondStatus>("bond_status")
      .then((r) => {
        setS(r);
        try {
          sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), uid: userId, pro: isPro, s: { ...r, match_text: null } }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => undefined);
  }, [userId, isPro]);
  if (!s) return null;
  const ct = s.couple_today;
  if (s.link && ct) {
    return (
      <Link href="/bond?src=today" className="flex items-center gap-3 rounded-2xl border border-gold-accent/25 bg-paper px-4 py-3" data-testid="today-bond">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DAY_STYLE[ct.type].dot)} />
        <span className="flex-1 text-sm text-ink">
          <span className="font-semibold">{t("bond.today.title")}:</span> {t(`bond.action.${ct.action_key}`)}
        </span>
        <span className="text-xs font-semibold text-gold-text">{t("today.bond.cta")} →</span>
      </Link>
    );
  }
  if (!s.link) {
    return (
      <Link href="/bond?src=today" className="block rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-secondary" data-testid="today-bond-add">
        ♥ {t("today.bond.add")}
      </Link>
    );
  }
  return null;
}
