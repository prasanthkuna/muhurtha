"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { StarTeaser } from "@/components/welcome/star-teaser";
import { useLocale } from "@/context/locale-context";
import { signInWithGoogle } from "@/lib/auth/google";
import { LOCALE_STORAGE_KEY, type AppLocale } from "@/lib/locale";
import { logProduct } from "@/lib/product-events";

/** Below the friend's card: their language, a 10-second star teaser (or the match check), WhatsApp forward. */
export function ShareLanding({
  id,
  type,
  cardLocale,
  shareUrl,
}: {
  id: string;
  type: string;
  cardLocale: AppLocale;
  shareUrl: string;
}) {
  const { t, previewLocale } = useLocale();
  const [busy, setBusy] = useState(false);
  const logged = useRef(false);
  const src = `share_${type}`;

  useEffect(() => {
    // The friend's language is the best first guess for the visitor, unless they already chose one.
    if (!localStorage.getItem(LOCALE_STORAGE_KEY)) {
      localStorage.setItem(LOCALE_STORAGE_KEY, cardLocale);
      previewLocale(cardLocale);
    }
    if (!logged.current) {
      logged.current = true;
      logProduct("share_landing_view", { type, locale: cardLocale });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function google(from: string) {
    setBusy(true);
    logProduct("signin_click", { surface: "share", from, type });
    const err = await signInWithGoogle("/decode");
    if (err) setBusy(false);
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(`${t("share.friend")} ${shareUrl}`)}`;

  return (
    <div className="mt-6 space-y-4" data-testid="share-landing">
      {type === "match" ? (
        <Link
          href={`/match?src=${src}&ref=${id}`}
          onClick={() => logProduct("share_cta", { type, to: "match" })}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-button px-6 text-base font-semibold text-ink shadow-sm"
          data-testid="share-match-cta"
        >
          {t("share.matchCta")}
        </Link>
      ) : (
        <>
          <p className="text-center font-serif text-lg leading-snug text-ink">{t("share.friend")}</p>
          <StarTeaser surface="share" onSave={() => void google("teaser")} shareUrl={shareUrl} />
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">
            <span className="h-px flex-1 bg-line" />
            {t("welcome.or")}
            <span className="h-px flex-1 bg-line" />
          </div>
          <OAuthButtons onGoogle={() => void google("hero")} busy={busy} label={t("welcome.google")} />
        </>
      )}
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        onClick={() => logProduct("share_whatsapp", { surface: "share", type })}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#25D366] text-sm font-semibold text-white"
        data-testid="share-wa"
      >
        {t("welcome.result.share")}
      </a>
      <p className="text-center text-xs text-ink-tertiary">{t("welcome.price")}</p>
    </div>
  );
}
