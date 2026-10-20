"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

const tabs = [
  { href: "/decode", label: "Decode" },
  { href: "/life", label: "Life" },
  { href: "/today", label: "Today", center: true },
  { href: "/timing", label: "Timing" },
  { href: "/ask", label: "Ask" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip bg-canvas text-ink">
      <main className="flex-1 px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        {children}
      </main>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-paper/95 backdrop-blur-md"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-gold-text" : "text-ink-tertiary",
                  tab.center && active && "font-semibold",
                )}
              >
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    active ? "bg-gold-accent" : "bg-transparent",
                  )}
                />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
