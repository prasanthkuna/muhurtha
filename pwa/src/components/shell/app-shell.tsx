"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageTransition } from "@/components/motion/page-transition";
import { cn } from "@/components/ui/cn";
import {
  NavIconAsk,
  NavIconDecode,
  NavIconLife,
  NavIconSettings,
  NavIconTiming,
  NavIconToday,
} from "./nav-icons";

const tabs = [
  { href: "/decode", label: "Decode", Icon: NavIconDecode },
  { href: "/life", label: "Life", Icon: NavIconLife },
  { href: "/today", label: "Today", center: true, Icon: NavIconToday },
  { href: "/timing", label: "Timing", Icon: NavIconTiming },
  { href: "/ask", label: "Ask", Icon: NavIconAsk },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip bg-canvas text-ink">
      <header className="flex items-center justify-between px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-text">
          Muhūrta
        </span>
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-paper hover:text-gold-text"
          aria-label="Settings"
        >
          <NavIconSettings />
        </Link>
      </header>
      <main className="flex-1 px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-2">
        <PageTransition>{children}</PageTransition>
      </main>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-paper/95 backdrop-blur-md"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.Icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[10px] font-medium transition-colors",
                  active ? "text-gold-text" : "text-ink-tertiary",
                  tab.center && active && "font-semibold",
                )}
              >
                <Icon active={active} className={active ? "text-gold-accent" : undefined} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
