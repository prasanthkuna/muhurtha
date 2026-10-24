import type { Metadata } from "next";
import { Suspense } from "react";
import { WelcomeActions } from "./welcome-client";
import { LocaleProvider } from "@/context/locale-context";
import { InstallChip } from "@/components/pwa/install-chip";
import { AttributionCapture } from "@/components/share/attribution-capture";

export const metadata: Metadata = {
  title: "Muhūrta — your life has a story",
  description:
    "Find out who you are by the stars, see your life in chapters, and get good times for your city every day.",
};

/** Sample reading shown before sign-in (illustrative, not anyone's real chart). */
function SampleReading() {
  return (
    <section
      aria-label="Sample reading"
      className="mt-10 overflow-hidden rounded-2xl border border-gold-accent/35 bg-gradient-to-br from-paper via-paper to-gold-wash/30 shadow-[0_10px_32px_rgba(119,84,31,0.08)]"
    >
      <div className="border-b border-line/70 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
          Sample · Thu, 23 Oct
        </p>
        <p className="mt-1 font-serif text-2xl font-bold leading-tight text-gold-text">
          Finish what you started
        </p>
        <p className="mt-1 text-sm text-ink-secondary">
          Saturn–Mercury day (your planet period). Great for wrapping things up, not for big new promises.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-line/60 text-sm">
        <div className="bg-paper px-5 py-3">
          <dt className="text-xs font-semibold uppercase text-success-ink">Next good time</dt>
          <dd className="mt-1 font-medium text-ink">10:42 AM – 12:10 PM</dd>
        </div>
        <div className="bg-paper px-5 py-3">
          <dt className="text-xs font-semibold uppercase text-warning-ink">Take it easy</dt>
          <dd className="mt-1 font-medium text-ink">1:30 PM – 3:00 PM</dd>
        </div>
      </dl>
      <div className="px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">Current chapter</p>
        <p className="mt-1 font-serif text-lg text-ink">Building the long game</p>
        <p className="text-sm text-ink-secondary">Jan 2024 – Aug 2026 · Saturn · Mercury</p>
      </div>
    </section>
  );
}

export default function WelcomePage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip bg-canvas px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(3.5rem,env(safe-area-inset-top))]">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold-text">Muhūrta</p>
      <h1 className="mt-4 font-serif text-4xl leading-[1.1] text-ink">Your life has a story.</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
        Find out who you are by the stars, see your life in chapters, and get good times for your
        city every day.
      </p>
      <SampleReading />
      <LocaleProvider>
        <AttributionCapture />
        <InstallChip variant="banner" className="mt-6" />
      </LocaleProvider>
      <ul className="mt-6 space-y-2 text-sm text-ink-secondary">
        <li>• A reading from your own birth details, not a generic sun-sign feed</li>
        <li>• Today&apos;s good times and go-slow times, worked out for your city</li>
        <li>• Pick a date for an interview, a trip, a launch and more</li>
      </ul>
      <div className="mt-auto pt-10">
        <Suspense fallback={<div className="h-12" />}>
          <WelcomeActions />
        </Suspense>
        <p className="mt-4 text-center text-xs text-ink-tertiary">
          Traditional Jyotish guidance. Not medical, legal or financial advice.
        </p>
        <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-tertiary">
          <a href="/pricing" className="hover:text-gold-text">Pricing</a>
          <a href="/refund" className="hover:text-gold-text">Refunds</a>
          <a href="/contact" className="hover:text-gold-text">Contact</a>
          <a href="/terms" className="hover:text-gold-text">Terms</a>
          <a href="/privacy" className="hover:text-gold-text">Privacy</a>
        </nav>
      </div>
    </div>
  );
}
