"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { ChartProfileBanner } from "@/components/shell/chart-profile-banner";
import { ProfileSwitcher } from "@/components/shell/profile-switcher";
import { cn } from "@/components/ui/cn";
import { useLocale } from "@/context/locale-context";
import { useAppData } from "@/context/app-data-context";
import { prefetchBondStatus } from "@/lib/bond";
import { prefetchCalendar } from "@/lib/cal-cache";
import { Settings } from "@/components/celestial/muh-icon";
import { PendingInviteAccept } from "@/components/bond/pending-invite";
import {
  NavIconAsk,
  NavIconBond,
  NavIconCalendar,
  NavIconDecode,
  NavIconLife,
  NavIconToday,
} from "./nav-icons";

/** Decode (your birth-star profile) is the main tab and the landing screen; Today sits next to it.
 *  Ask moved to the header so five tabs fit at 360px. Find-a-date (/timing) keeps Calendar lit. */
const tabKeys = [
  { href: "/decode", key: "nav.decode", primary: true, Icon: NavIconDecode, also: [] as string[] },
  { href: "/today", key: "nav.today", Icon: NavIconToday, also: [] as string[] },
  { href: "/bond", key: "nav.bond", Icon: NavIconBond, also: [] as string[] },
  { href: "/calendar", key: "nav.calendar", Icon: NavIconCalendar, also: ["/timing"] },
  { href: "/life", key: "nav.life", Icon: NavIconLife, also: [] as string[] },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { userId, isPro } = useAppData();

  // Warm Bond's status a few seconds after the app settles, so the tab opens without a spinner.
  useEffect(() => {
    if (!userId || pathname?.startsWith("/bond")) return;
    const id = window.setTimeout(() => prefetchBondStatus(userId), 2500);
    return () => window.clearTimeout(id);
  }, [userId, isPro, pathname]);

  // Warm the Calendar month while Decode / Today are on screen, so its first open is instant.
  useEffect(() => {
    if (!userId || pathname?.startsWith("/calendar")) return;
    const id = window.setTimeout(() => prefetchCalendar(userId, isPro), 1500);
    return () => window.clearTimeout(id);
  }, [userId, isPro, pathname]);

  // Flag the on-screen keyboard on <html data-kb="open"> so the tab bar can step aside and
  // composers can pin to the keyboard edge instead of hiding behind the nav.
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    const isField = (el: Element | null) =>
      !!el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" &&
        !["checkbox", "radio", "button", "submit", "date", "range"].includes(
          (el as HTMLInputElement).type,
        )));
    const update = () => {
      const shrunk = vv ? window.innerHeight - vv.height > 150 : false;
      const open = shrunk || (isField(document.activeElement) && window.innerWidth < 768);
      if (open) root.dataset.kb = "open";
      else delete root.dataset.kb;
    };
    vv?.addEventListener("resize", update);
    window.addEventListener("focusin", update);
    const onOut = () => window.setTimeout(update, 50);
    window.addEventListener("focusout", onOut);
    return () => {
      vv?.removeEventListener("resize", update);
      window.removeEventListener("focusin", update);
      window.removeEventListener("focusout", onOut);
      delete root.dataset.kb;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip bg-canvas text-ink">
      <header className="flex items-center justify-between px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-text">
            Muhūrta
          </span>
          <ProfileSwitcher />
        </div>
        <div className="flex items-center gap-1">
        <Link
          href="/ask"
          data-testid="header-ask"
          aria-label={t("nav.ask")}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
            pathname === "/ask" || pathname.startsWith("/ask/")
              ? "border-gold-accent/60 bg-gold-wash/40 text-gold-text"
              : "border-line text-ink-secondary hover:border-gold-accent/40 hover:text-gold-text",
          )}
        >
          <NavIconAsk className="h-5 w-5" active={pathname === "/ask" || pathname.startsWith("/ask/")} />
          <span className="hidden min-[360px]:inline">{t("nav.ask")}</span>
        </Link>
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-paper hover:text-gold-text"
          aria-label={t("common.settings")}
        >
          <Settings className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </Link>
        </div>
      </header>
      <main className="flex-1 px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-2">
        <PendingInviteAccept />
        <ChartProfileBanner />
        <PageTransition>{children}</PageTransition>
      </main>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-paper/95 backdrop-blur-md [html[data-kb=open]_&]:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {tabKeys.map((tab) => {
            const active = [tab.href, ...tab.also].some(
              (h) => pathname === h || pathname.startsWith(`${h}/`),
            );
            const Icon = tab.Icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                data-testid={`tab-${tab.href.slice(1)}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-medium leading-none transition-colors",
                  active ? "text-gold-text" : "text-ink-tertiary",
                  "primary" in tab && tab.primary && "font-semibold",
                  "primary" in tab && tab.primary && (active ? "bg-gold-wash/50" : "text-gold-text/80"),
                )}
              >
                <span className="flex h-6 w-6 items-center justify-center">
                  <Icon active={active} className={active ? "text-gold-accent" : undefined} />
                </span>
                <span>{t(tab.key)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
