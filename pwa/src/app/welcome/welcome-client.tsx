"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { cn } from "@/components/ui/cn";
import { StarTeaser } from "@/components/welcome/star-teaser";
import { useLocale } from "@/context/locale-context";
import { signInWithGoogle } from "@/lib/auth/google";
import { resolveInitialAppPath } from "@/lib/auth/routing";
import { clock } from "@/lib/bond";
import { tithiLabel } from "@/lib/cal-text";
import { APP_LOCALES, LOCALE_STORAGE_KEY, localeLabel, type AppLocale } from "@/lib/locale";
import { fill, nakLabel } from "@/lib/messages-bond";
import type { PublicPanchang } from "@/lib/panchang-public";
import { logProduct } from "@/lib/product-events";
import { createClient } from "@/lib/supabase/client";

function localeTag(l: AppLocale) {
  return l === "te" ? "te-IN" : l === "hi" ? "hi-IN" : "en-IN";
}

/** Device language → app locale, used only when nothing is saved yet. */
function guessLocale(): AppLocale {
  const langs = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [];
  for (const l of langs) {
    const c = (l ?? "").toLowerCase().slice(0, 2);
    if (c === "te" || c === "hi") return c;
    if (c === "en") return "en";
  }
  return "en";
}

function LocaleToggle() {
  const { locale, previewLocale } = useLocale();
  return (
    <div className="flex rounded-full border border-line bg-paper p-0.5 text-xs" role="radiogroup" aria-label="Language" data-testid="welcome-locale">
      {APP_LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          onClick={() => {
            if (l === locale) return;
            // Before sign-in the device choice is the language; onboarding reads it.
            localStorage.setItem(LOCALE_STORAGE_KEY, l);
            previewLocale(l);
            logProduct("welcome_locale", { locale: l, how: "toggle" });
          }}
          className={cn(
            "rounded-full px-2.5 py-1 font-semibold transition-colors",
            locale === l ? "bg-ink text-paper" : "text-ink-secondary",
          )}
        >
          {l === "en" ? "EN" : localeLabel(l)}
        </button>
      ))}
    </div>
  );
}

function SampleCard({ p }: { p: PublicPanchang | null }) {
  const { t, locale } = useLocale();
  const [data, setData] = useState<PublicPanchang | null>(p);
  useEffect(() => {
    if (p) return;
    void fetch("/api/public/panchang")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && typeof j.date === "string" ? setData(j as PublicPanchang) : null))
      .catch(() => {});
  }, [p]);
  if (!data) return <div className="h-[168px] animate-pulse rounded-2xl border border-line bg-gold-wash/20" aria-hidden />;
  const d = new Date(`${data.date}T12:00:00+05:30`);
  const dateLabel = d.toLocaleDateString(localeTag(locale), { weekday: "short", day: "numeric", month: "short" });
  return (
    <section
      aria-label={fill(t("welcome.sampleEyebrow"), { date: dateLabel })}
      className="overflow-hidden rounded-2xl border border-gold-accent/35 bg-gradient-to-br from-paper via-paper to-gold-wash/30 shadow-[0_10px_32px_rgba(119,84,31,0.08)]"
      data-testid="welcome-sample"
    >
      <div className="border-b border-line/70 px-5 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
          {fill(t("welcome.sampleEyebrow"), { date: dateLabel })}
        </p>
        <p className="mt-1 font-serif text-xl leading-tight text-gold-text">
          {fill(t("welcome.sampleStar"), { star: nakLabel(data.nakshatra, locale) })}
        </p>
        <p className="mt-0.5 text-sm text-ink-secondary">{tithiLabel(data.tithi, locale)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-line/60 text-sm">
        <div className="bg-paper px-4 py-2.5">
          <dt className="text-[11px] font-semibold uppercase text-success-ink">{t("welcome.sampleGood")}</dt>
          <dd className="mt-0.5 whitespace-nowrap text-[13px] font-medium text-ink">{data.good ? `${clock(data.good.start)} – ${clock(data.good.end)}` : "—"}</dd>
        </div>
        <div className="bg-paper px-4 py-2.5">
          <dt className="text-[11px] font-semibold uppercase text-warning-ink">{t("welcome.sampleEasy")}</dt>
          <dd className="mt-0.5 whitespace-nowrap text-[13px] font-medium text-ink">{data.rahu ? `${clock(data.rahu.start)} – ${clock(data.rahu.end)}` : "—"}</dd>
        </div>
      </dl>
      <p className="px-5 py-2 text-[11px] text-ink-tertiary">{t("welcome.sampleCity")}</p>
    </section>
  );
}

/** Welcome = the one sign-in page: language toggle, Google above the fold, star teaser, today's real panchang. */
export function WelcomeScreen({ panchang }: { panchang: PublicPanchang | null }) {
  const { t, locale, previewLocale } = useLocale();
  const router = useRouter();
  // Read the query in an effect (not useSearchParams) so the whole screen is prerendered as
  // static HTML: real copy and the Google button paint before any JS runs.
  const [next, setNext] = useState("/decode");
  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) setNext(n);
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewed = useRef(false);

  useEffect(() => {
    // First visit: pick the language from the phone and save it before sign-in.
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    let how = "saved";
    const fromLink = new URLSearchParams(window.location.search).get("lang");
    if (!saved && (fromLink === "en" || fromLink === "te" || fromLink === "hi")) {
      // Arriving from the old address's "new home" sheet: keep the language they used there.
      localStorage.setItem(LOCALE_STORAGE_KEY, fromLink);
      previewLocale(fromLink);
      how = "link";
    } else if (!saved) {
      const g = guessLocale();
      localStorage.setItem(LOCALE_STORAGE_KEY, g);
      previewLocale(g);
      how = "device";
    }
    if (!viewed.current) {
      viewed.current = true;
      const q = new URLSearchParams(window.location.search);
      logProduct("welcome_view", { how, src: q.get("src") ?? "", next: q.get("next") ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const n = new URLSearchParams(window.location.search).get("next");
      const dest = n && n.startsWith("/") && !n.startsWith("//") ? n : "/decode";
      router.replace(await resolveInitialAppPath(supabase, dest));
    })();
  }, [router]);

  async function google(from: string) {
    setBusy(true);
    setError(null);
    logProduct("signin_click", { surface: "welcome", from, locale });
    const err = await signInWithGoogle(next);
    if (err) {
      setError(err);
      setBusy(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://muhurtha-app.vercel.app";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip bg-canvas px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-text">Muhūrta</p>
        <LocaleToggle />
      </header>

      <h1 className="mt-6 font-serif text-[2rem] leading-[1.12] text-ink" data-testid="welcome-h1">{t("welcome.h1")}</h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-ink-secondary">{t("welcome.sub")}</p>

      <div className="mt-5">
        <OAuthButtons onGoogle={() => void google("hero")} busy={busy} label={t("welcome.google")} />
        <p className="mt-2 text-center text-[11px] text-ink-tertiary">{t("welcome.reassure")}</p>
        {error ? <p className="mt-2 text-center text-xs text-warning-ink" role="alert">{error}</p> : null}
      </div>

      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">
        <span className="h-px flex-1 bg-line" />
        {t("welcome.or")}
        <span className="h-px flex-1 bg-line" />
      </div>

      <StarTeaser surface="welcome" onSave={() => void google("teaser")} shareUrl={`${origin}/welcome?src=teaser_share`} />

      <div className="mt-6">
        <SampleCard p={panchang} />
      </div>

      <section className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-tertiary">{t("welcome.how")}</p>
        <ol className="mt-2 grid grid-cols-3 gap-2 text-center">
          {["how1", "how2", "how3"].map((k, i) => (
            <li key={k} className="rounded-xl border border-line bg-paper px-2 py-2.5">
              <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-gold-wash text-xs font-bold text-gold-text">{i + 1}</span>
              <span className="mt-1.5 block text-[11px] leading-snug text-ink-secondary">{t(`welcome.${k}`)}</span>
            </li>
          ))}
        </ol>
      </section>

      <Link href="/match?src=welcome" className="mt-5 block rounded-2xl border border-line bg-paper px-4 py-3 text-sm font-semibold text-gold-text">
        {t("welcome.matchTile")}
      </Link>

      <div className="mt-6 space-y-1 text-center text-xs text-ink-secondary">
        <p>{t("welcome.trust")}</p>
        <p className="font-semibold text-ink">{t("welcome.price")}</p>
      </div>

      <div className="mt-auto pt-8">
        <p className="text-center text-[11px] text-ink-tertiary">{t("welcome.disclaimer")}</p>
        <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-tertiary">
          <a href="/pricing" className="hover:text-gold-text">Pricing</a>
          <a href="/refund" className="hover:text-gold-text">Refunds</a>
          <a href="/contact" className="hover:text-gold-text">Contact</a>
          <a href="/terms" className="hover:text-gold-text">Terms</a>
          <a href="/privacy" className="hover:text-gold-text">Privacy</a>
          <a href={`/auth?method=email&next=${encodeURIComponent(next)}`} className="hover:text-gold-text">Email sign-in</a>
        </nav>
      </div>
    </div>
  );
}
