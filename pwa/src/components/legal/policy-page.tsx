import Link from "next/link";
import type { ReactNode } from "react";

export const POLICY_UPDATED = "23 October 2026";
export const SUPPORT_EMAIL = "prasanthkuna@gmail.com";

/** Public policy pages (pricing, refunds, contact) — readable without signing in. */
export function PolicyPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl bg-paper px-5 pb-16 pt-8 text-ink">
      <Link href="/" className="font-serif text-lg text-gold-text">
        Muhūrta
      </Link>
      <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-secondary">
        <Link href="/pricing" className="hover:text-gold-text">Pricing</Link>
        <Link href="/refund" className="hover:text-gold-text">Refund &amp; cancellation</Link>
        <Link href="/contact" className="hover:text-gold-text">Contact</Link>
        <Link href="/terms" className="hover:text-gold-text">Terms</Link>
        <Link href="/privacy" className="hover:text-gold-text">Privacy</Link>
      </nav>
      <h1 className="mt-8 font-serif text-3xl leading-tight">{title}</h1>
      <p className="mt-1 text-xs text-ink-tertiary">Last updated: {POLICY_UPDATED}</p>
      {intro ? <p className="mt-4 text-[15px] leading-relaxed text-ink-secondary">{intro}</p> : null}
      <div className="policy mt-6 space-y-6 text-[15px] leading-relaxed text-ink [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_li]:py-0.5 [&_p]:text-ink-secondary">
        {children}
      </div>
      <p className="mt-12 border-t border-line pt-4 text-xs text-ink-tertiary">
        Muhūrta · Hyderabad, Telangana, India · <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </main>
  );
}
