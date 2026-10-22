"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { ChartProfileBanner } from "@/components/shell/chart-profile-banner";
import { cn } from "@/components/ui/cn";
import { useLocale } from "@/context/locale-context";
import { Settings } from "@/components/celestial/muh-icon";
import {
  NavIconAsk,
  NavIconDecode,
  NavIconLife,
  NavIconTiming,
  NavIconToday,
} from "./nav-icons";

const tabKeys = [
  { href: "/decode", key: "nav.decode", Icon: NavIconDecode },
  { href: "/life", key: "nav.life", Icon: NavIconLife },
  { href: "/today", key: "nav.today", center: true, Icon: NavIconToday },
  { href: "/timing", key: "nav.timing", Icon: NavIconTiming },
  { href: "/ask", key: "nav.ask", Icon: NavIconAsk },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLocale();

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
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-text">
          Muhūrta
        </span>
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-paper hover:text-gold-text"
          aria-label={t("common.settings")}
        >
          <Settings className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </Link>
      </header>
      <main className="flex-1 px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-2">
        <ChartProfileBanner />
        <PageTransition>{children}</PageTransition>
      </main>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-paper/95 backdrop-blur-md [html[data-kb=open]_&]:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {tabKeys.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.Icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-medium leading-none transition-colors",
                  active ? "text-gold-text" : "text-ink-tertiary",
                  "center" in tab && tab.center && active && "font-semibold",
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
