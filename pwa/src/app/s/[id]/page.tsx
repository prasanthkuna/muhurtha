import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Glyph } from "@/components/ui/glyph";
import { AttributionCapture } from "@/components/share/attribution-capture";
import { CARD_CTA, CARD_LABELS, DEFAULT_GLYPH } from "@/lib/share/card-types";
import { SITE_URL, loadSharedCard } from "@/lib/share/server";

export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

const COPY = {
  en: { lead: "Shared from Muhūrta", cta: "See your own day", sub: "Free · personal timing from your birth details", alt: "Shared Muhūrta card" },
  te: { lead: "ముహూర్త నుండి పంచుకున్నది", cta: "మీ రోజు చూడండి", sub: "ఉచితం · మీ జన్మ వివరాలతో వ్యక్తిగత సమయాలు", alt: "ముహూర్త కార్డు" },
  hi: { lead: "मुहूर्त से साझा किया गया", cta: "अपना दिन देखें", sub: "मुफ़्त · आपके जन्म विवरण से व्यक्तिगत समय", alt: "मुहूर्त कार्ड" },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const card = await loadSharedCard(id);
  if (!card) return { title: "Muhūrta", robots: { index: false } };
  const L = CARD_LABELS[card.locale];
  const title = `${card.data.title} · ${L.brand}`;
  const description = [card.data.value, card.data.body].filter(Boolean).join(" — ").slice(0, 200) || L.cta;
  const image = `${SITE_URL}/api/card/${id}?size=og`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: `${SITE_URL}/s/${id}` },
    openGraph: {
      type: "article",
      siteName: "Muhūrta",
      title,
      description,
      url: `${SITE_URL}/s/${id}`,
      locale: card.locale === "te" ? "te_IN" : card.locale === "hi" ? "hi_IN" : "en_IN",
      images: [{ url: image, width: 1200, height: 630, alt: card.data.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SharedCardPage({ params }: Props) {
  const { id } = await params;
  const card = await loadSharedCard(id);
  if (!card) notFound();
  const c = COPY[card.locale];
  const L = CARD_LABELS[card.locale];
  const src = `share_${card.type}`;
  return (
    <main
      lang={card.locale}
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-canvas px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]"
    >
      <AttributionCapture src={src} refId={id} />
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold-text">
        <Glyph name={DEFAULT_GLYPH[card.type]} size={16} />
        {c.lead} · {L.eyebrow[card.type]}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/card/${id}?size=feed`}
        width={1080}
        height={1350}
        alt={`${c.alt}: ${card.data.title}`}
        className="mt-4 h-auto w-full rounded-2xl border border-gold-accent/30 shadow-[0_12px_36px_rgba(119,84,31,0.12)]"
      />
      <Link
        href={card.type === "match" ? `/match?src=${src}&ref=${id}` : `/welcome?src=${src}&ref=${id}`}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-gold-button px-6 text-base font-semibold text-ink shadow-sm"
      >
        {card.type === "match" ? (CARD_CTA.match?.[card.locale] ?? c.cta) : c.cta}
      </Link>
      <p className="mt-3 text-center text-sm text-ink-secondary">{c.sub}</p>
    </main>
  );
}
