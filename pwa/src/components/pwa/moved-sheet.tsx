"use client";

import { useEffect, useState } from "react";
import { LOCALE_STORAGE_KEY, normalizeLocale, type AppLocale } from "@/lib/locale";
import { logProduct } from "@/lib/product-events";
import { APP_MODE_COOKIE, CANONICAL_HOST, CANONICAL_ORIGIN, isLegacyHost } from "@/lib/site";

const SEEN_KEY = "muh_moved_seen_v1";

const COPY: Record<AppLocale, { title: string; body: string; note: string; steps: string[]; open: string; later: string; how: string }> = {
  en: {
    title: "Muhūrta has a new home",
    body: "We've moved to a new address. Your readings, Pro and profile come with you: just sign in once there.",
    note: "This app keeps working for now. Reminders need switching on again in the new app.",
    how: "Move in 4 taps",
    steps: [
      "Tap Open new app. It opens in Chrome.",
      "Sign in with the same Google account.",
      "Tap ⋮ → Install app (or Add to Home screen).",
      "Then remove this old icon: long-press → Uninstall.",
    ],
    open: "Open new app",
    later: "Later",
  },
  te: {
    title: "Muhūrta కి కొత్త అడ్రస్",
    body: "మేము కొత్త అడ్రస్ కి మారాం. మీ readings, Pro, profile అన్నీ అక్కడే ఉంటాయి. ఒక్కసారి sign in అయితే చాలు.",
    note: "ఈ పాత app ఇప్పటికి పని చేస్తుంది. Reminders మాత్రం కొత్త app లో మళ్ళీ on చేయాలి.",
    how: "4 taps లో షిఫ్ట్ అవ్వండి",
    steps: [
      "‘కొత్త app ఓపెన్ చేయండి’ నొక్కండి. Chrome లో ఓపెన్ అవుతుంది.",
      "అదే Google account తో sign in అవ్వండి.",
      "⋮ → Install app (లేదా Add to Home screen) నొక్కండి.",
      "తర్వాత ఈ పాత icon తీసేయండి: long-press → Uninstall.",
    ],
    open: "కొత్త app ఓపెన్ చేయండి",
    later: "తర్వాత",
  },
  hi: {
    title: "Muhūrta का नया पता",
    body: "हम नए पते पर आ गए हैं। आपकी readings, Pro और profile वहीं मिलेंगे, बस एक बार sign in करें।",
    note: "यह पुराना app अभी चलता रहेगा। Reminders नए app में फिर से on करने होंगे।",
    how: "4 taps में shift करें",
    steps: [
      "‘नया app खोलें’ दबाएँ। यह Chrome में खुलेगा।",
      "उसी Google account से sign in करें।",
      "⋮ → Install app (या Add to Home screen) दबाएँ।",
      "फिर यह पुराना icon हटा दें: long-press → Uninstall।",
    ],
    open: "नया app खोलें",
    later: "बाद में",
  },
};

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Marks installed-app sessions with a cookie (so the old host never redirects them), and on
 * an old host shows a one-time sheet pointing to the new address. The old app keeps working.
 */
export function MovedSheet() {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<AppLocale>("en");

  useEffect(() => {
    const standalone = isStandalone();
    if (standalone) {
      document.cookie = `${APP_MODE_COOKIE}=1; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
    }
    if (!isLegacyHost(window.location.hostname)) return;
    if (window.location.pathname.startsWith("/auth")) return;
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
    } catch {
      return;
    }
    setLocale(normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY) ?? "en"));
    const id = window.setTimeout(() => {
      setOpen(true);
      logProduct("moved_sheet_view", { standalone });
    }, 900);
    return () => window.clearTimeout(id);
  }, []);

  if (!open) return null;
  const c = COPY[locale] ?? COPY.en;
  const href = `${CANONICAL_ORIGIN}/welcome?src=moved&lang=${locale}`;

  function close(how: "later" | "open") {
    try {
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
    } catch {
      /* private mode */
    }
    logProduct("moved_sheet_action", { how });
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-ink/45 sm:items-center sm:p-4" data-testid="moved-sheet">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={c.later} onClick={() => close("later")} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="moved-title"
        lang={locale}
        className="relative w-full max-w-lg rounded-t-3xl border border-line bg-canvas px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={56} height={56} className="h-14 w-14 rounded-2xl border border-line" />
          <div className="min-w-0">
            <h2 id="moved-title" className="font-serif text-xl font-semibold leading-tight text-ink">
              {c.title}
            </h2>
            <p className="mt-0.5 truncate text-sm font-semibold text-gold-text">{CANONICAL_HOST}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{c.body}</p>

        <div className="mt-4 rounded-2xl border border-line bg-paper p-4">
          <p className="text-sm font-semibold text-ink">{c.how}</p>
          <ol className="mt-2 space-y-2 text-sm text-ink-secondary">
            {c.steps.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-wash text-xs font-bold text-gold-text">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-tertiary">{c.note}</p>

        <div className="mt-5 flex gap-2">
          <a
            href={href}
            target="_blank"
            rel="noopener"
            onClick={() => close("open")}
            data-testid="moved-open"
            className="inline-flex min-h-12 flex-[1.6] items-center justify-center rounded-xl bg-gold-button px-3 text-sm font-semibold text-ink"
          >
            {c.open}
          </a>
          <button
            type="button"
            onClick={() => close("later")}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-line bg-paper text-sm font-semibold text-gold-text"
          >
            {c.later}
          </button>
        </div>
      </div>
    </div>
  );
}
