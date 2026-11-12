"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useEngineBody } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { fill } from "@/lib/messages-bond";

/** Terms the engine glossary explains (three layers: simple, traditional, practical). */
export const TERM_TITLES: Record<string, Record<string, string>> = {
  "rahu_kalam": {
    "en": "Rahu Kalam",
    "te": "రాహుకాలం",
    "hi": "राहुकाल"
  },
  "yamagandam": {
    "en": "Yamagandam",
    "te": "యమగండం",
    "hi": "यमगंड"
  },
  "gulika": {
    "en": "Gulika Kalam",
    "te": "గుళిక కాలం",
    "hi": "गुलिक काल"
  },
  "good_slot": {
    "en": "Good time",
    "te": "మంచి టైమ్",
    "hi": "अच्छा समय"
  },
  "mahadasha": {
    "en": "Mahadasha",
    "te": "మహాదశ",
    "hi": "महादशा"
  },
  "antardasha": {
    "en": "Antardasha",
    "te": "అంతర్దశ",
    "hi": "अंतर्दशा"
  },
  "tara_bala": {
    "en": "Tara Bala",
    "te": "తారాబలం",
    "hi": "तारा बल"
  },
  "nakshatra": {
    "en": "Nakshatra (birth star)",
    "te": "నక్షత్రం (జన్మ నక్షత్రం)",
    "hi": "नक्षत्र (जन्म नक्षत्र)"
  },
  "tithi": {
    "en": "Tithi",
    "te": "తిథి",
    "hi": "तिथि"
  },
  "moon_sign": {
    "en": "Moon sign (Janma Rashi)",
    "te": "చంద్ర రాశి (జన్మ రాశి)",
    "hi": "चंद्र राशि (जन्म राशि)"
  },
  "chandrashtama": {
    "en": "Chandrashtama",
    "te": "చంద్రాష్టమం",
    "hi": "चंद्राष्टम"
  },
  "koota": {
    "en": "Koota score (Ashtakoota)",
    "te": "గుణ మేళనం (అష్టకూట)",
    "hi": "गुण मिलान (अष्टकूट)"
  },
  "varna": {
    "en": "Varna (1 point)",
    "te": "వర్ణ (1 పాయింట్)",
    "hi": "वर्ण (1 अंक)"
  },
  "vashya": {
    "en": "Vashya (2 points)",
    "te": "వశ్య (2 పాయింట్లు)",
    "hi": "वश्य (2 अंक)"
  },
  "koota_tara": {
    "en": "Tara (3 points)",
    "te": "తార (3 పాయింట్లు)",
    "hi": "तारा (3 अंक)"
  },
  "yoni": {
    "en": "Yoni (4 points)",
    "te": "యోని (4 పాయింట్లు)",
    "hi": "योनि (4 अंक)"
  },
  "graha_maitri": {
    "en": "Graha Maitri (5 points)",
    "te": "గ్రహ మైత్రి (5 పాయింట్లు)",
    "hi": "ग्रह मैत्री (5 अंक)"
  },
  "gana": {
    "en": "Gana (6 points)",
    "te": "గణ (6 పాయింట్లు)",
    "hi": "गण (6 अंक)"
  },
  "bhakoot": {
    "en": "Bhakoot (7 points)",
    "te": "భకూట (7 పాయింట్లు)",
    "hi": "भकूट (7 अंक)"
  },
  "nadi": {
    "en": "Nadi (8 points)",
    "te": "నాడి (8 పాయింట్లు)",
    "hi": "नाड़ी (8 अंक)"
  },
  "life_chapter": {
    "en": "Life chapter",
    "te": "లైఫ్ చాప్టర్",
    "hi": "लाइफ़ चैप्टर"
  },
  "day_card": {
    "en": "Today's card",
    "te": "ఈరోజు కార్డ్",
    "hi": "आज का कार्ड"
  }
};

export type ExplainScreen = "decode" | "today" | "bond" | "calendar" | "timing" | "life" | "ask";

type Layers = { title: string; simple: string; traditional: string; practical: string };
const cache = new Map<string, Layers>();

export function ExplainSheet({
  term,
  screen,
  value,
  open,
  onClose,
}: {
  term: string;
  screen: ExplainScreen;
  value?: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const engineBody = useEngineBody();
  const key = `${locale}:${term}:${screen}:${value ?? ""}`;
  const [data, setData] = useState<Layers | null>(() => cache.get(key) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || cache.has(key)) {
      if (cache.has(key)) setData(cache.get(key)!);
      return;
    }
    let alive = true;
    setFailed(false);
    void (async () => {
      try {
        const res = await fetch("/api/engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(engineBody("explain_get", { term, screen, value })),
        });
        const j = (await res.json()) as Record<string, unknown>;
        if (!res.ok || typeof j.simple !== "string") throw new Error("explain_failed");
        const l: Layers = {
          title: String(j.title ?? TERM_TITLES[term]?.[locale] ?? term),
          simple: String(j.simple ?? ""),
          traditional: String(j.traditional ?? ""),
          practical: String(j.practical ?? ""),
        };
        cache.set(key, l);
        if (alive) setData(l);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, key, engineBody, term, screen, value, locale]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const title = data?.title ?? TERM_TITLES[term]?.[locale] ?? term;
  const q = fill(t("live.askAboutQ"), { title });
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" data-testid="explain-sheet">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t("live.close")} onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="explain-title"
        className="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">{t("live.explainTitle")}</p>
        <h2 id="explain-title" className="mt-1 font-serif text-xl font-semibold text-gold-text">{title}</h2>
        {!data && !failed ? <p className="mt-4 text-sm text-ink-tertiary">{t("live.explainLoading")}</p> : null}
        {failed && !data ? <p className="mt-4 text-sm text-ink-secondary">{t("live.explainError")}</p> : null}
        {data ? (
          <div className="mt-4 space-y-4">
            <section>
              <p className="text-xs font-semibold uppercase text-gold-text">{t("live.layerSimple")}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-ink">{data.simple}</p>
            </section>
            <section>
              <p className="text-xs font-semibold uppercase text-gold-text">{t("live.layerTraditional")}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{data.traditional}</p>
            </section>
            <section>
              <p className="text-xs font-semibold uppercase text-gold-text">{t("live.layerPractical")}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{data.practical}</p>
            </section>
          </div>
        ) : null}
        <div className="mt-6 flex gap-2">
          <Link
            href={`/ask?q=${encodeURIComponent(q)}&screen=${screen}`}
            onClick={onClose}
            className="flex-1 rounded-xl border border-gold-accent/50 py-3 text-center text-sm font-semibold text-gold-text"
          >
            {t("live.askAbout")}
          </Link>
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gold-accent py-3 text-sm font-semibold text-paper">
            {t("explainer.gotIt")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small "Explain" chip that opens the three-layer sheet for one term. */
export function ExplainButton({ term, screen, value, label }: { term: string; screen: ExplainScreen; value?: string; label?: string }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const text = label ?? (term === "day_card" ? t("live.explain") : TERM_TITLES[term]?.[locale] ?? t("live.explain"));
  return (
    <>
      <button
        type="button"
        data-testid={`explain-${term}`}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-gold-text hover:border-gold-accent/50"
      >
        <span aria-hidden>ⓘ</span>
        {text}
      </button>
      <ExplainSheet term={term} screen={screen} value={value} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** A row of Explain chips for a screen's traditional terms. */
export function ExplainRow({ screen, terms, className }: { screen: ExplainScreen; terms: { term: string; value?: string }[]; className?: string }) {
  const { t } = useLocale();
  return (
    <div className={className ?? "mb-4"} data-testid={`explain-row-${screen}`}>
      <p className="mb-2 text-xs font-semibold uppercase text-ink-tertiary">{t("live.explainRow")}</p>
      <div className="flex flex-wrap gap-2">
        {terms.map((x) => <ExplainButton key={x.term} term={x.term} screen={screen} value={x.value} />)}
      </div>
    </div>
  );
}
