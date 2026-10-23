"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Glyph } from "@/components/ui/glyph";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { loadBirthProfileResult } from "@/lib/profile-bundle";
import { CARD_TYPES_WITH_BIRTH, type CardData, type CardSize, type CardType } from "@/lib/share/card-types";
import {
  canShareFiles,
  cardFile,
  cardImageUrl,
  createShareCard,
  downloadFile,
  revokeShareCard,
  whatsappHref,
  type CreatedShare,
} from "@/lib/share/share-client";

type Birth = { date?: string; time?: string; place?: string };

function useBirthDetails(enabled: boolean): Birth | null {
  const { activeChartProfileId, chartProfiles } = useAppData();
  const [own, setOwn] = useState<Birth | null>(null);
  const friend = activeChartProfileId ? chartProfiles.find((p) => p.id === activeChartProfileId) : null;
  useEffect(() => {
    if (!enabled || activeChartProfileId) return;
    let cancelled = false;
    void loadBirthProfileResult().then((r) => {
      if (cancelled || r.status !== "ok") return;
      setOwn({
        date: r.summary.dateOfBirth ?? undefined,
        time: r.summary.timeLabel ?? undefined,
        place: r.summary.birthPlace ?? undefined,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, activeChartProfileId]);
  if (!enabled) return null;
  if (friend) {
    return {
      date: friend.dateOfBirth,
      time: friend.exactBirthTime?.slice(0, 5) ?? undefined,
      place: friend.birthPlace,
    };
  }
  return own;
}

function prettyDate(iso: string | undefined, locale: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "te" ? "te-IN" : locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Bottom sheet: themed card preview + WhatsApp first, then the system share sheet with the
 * PNG, save image and copy link. Birth details are off by default (two explicit toggles).
 */
export function ShareSheet({
  open,
  onClose,
  type,
  data,
}: {
  open: boolean;
  onClose: () => void;
  type: CardType;
  data: CardData;
}) {
  const { t, locale } = useLocale();
  const { pack, activeChartLabel, activeChartProfileId } = useAppData();
  const allowsBirth = CARD_TYPES_WITH_BIRTH.includes(type);
  const [withDob, setWithDob] = useState(false);
  const [withTimePlace, setWithTimePlace] = useState(false);
  const [size, setSize] = useState<CardSize>("feed");
  const [share, setShare] = useState<CreatedShare | null>(null);
  const [busy, setBusy] = useState<null | "build" | "share" | "save">(null);
  const [note, setNote] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const birth = useBirthDetails(open && allowsBirth && (withDob || withTimePlace));
  const reqId = useRef(0);

  const name =
    data.name ??
    (activeChartProfileId ? activeChartLabel : pack?.displayName)?.trim().split(/\s+/)[0] ??
    undefined;

  const build = useCallback(async () => {
    const id = ++reqId.current;
    setBusy("build");
    setNote(null);
    setImgLoaded(false);
    try {
      const b: Birth | undefined =
        allowsBirth && birth && (withDob || withTimePlace)
          ? {
              date: withDob ? prettyDate(birth.date, locale) : undefined,
              time: withTimePlace ? birth.time : undefined,
              place: withTimePlace ? birth.place : undefined,
            }
          : undefined;
      const created = await createShareCard({
        type,
        locale: locale === "te" || locale === "hi" ? locale : "en",
        data: { ...data, name: name || undefined, birth: b },
      });
      if (id === reqId.current) setShare(created);
    } catch (e) {
      if (id !== reqId.current) return;
      const status = (e as { status?: number }).status;
      setNote({ text: status === 401 ? t("shareCard.signIn") : t("shareCard.failed"), tone: "warn" });
    } finally {
      if (id === reqId.current) setBusy(null);
    }
  }, [allowsBirth, birth, withDob, withTimePlace, type, locale, data, name, t]);

  // (Re)build when opened or when privacy choices change.
  const birthKey = birth ? `${birth.date}|${birth.time}|${birth.place}` : "";
  useEffect(() => {
    if (!open) return;
    if ((withDob || withTimePlace) && !birth) return; // wait for birth details
    void build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, withDob, withTimePlace, birthKey]);

  useEffect(() => {
    if (!open) {
      setShare(null);
      setNote(null);
      setWithDob(false);
      setWithTimePlace(false);
      setSize("feed");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const link = share ? `${share.url}?src=share_${type}` : "";

  async function shareImage() {
    if (!share) return;
    setBusy("share");
    setNote(null);
    try {
      const file = await cardFile(share.id, size, type);
      if (canShareFiles(file)) {
        await navigator.share({ files: [file], text: share.caption, title: "Muhūrta" });
      } else if (navigator.share) {
        await navigator.share({ title: "Muhūrta", text: share.caption, url: link });
      } else {
        downloadFile(file);
        setNote({ text: t("shareCard.saved"), tone: "ok" });
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setNote({ text: t("shareCard.failed"), tone: "warn" });
    } finally {
      setBusy(null);
    }
  }

  async function saveImage() {
    if (!share) return;
    setBusy("save");
    try {
      downloadFile(await cardFile(share.id, size, type));
      setNote({ text: t("shareCard.saved"), tone: "ok" });
    } catch {
      setNote({ text: t("shareCard.failed"), tone: "warn" });
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(link);
      setNote({ text: t("shareCard.copied"), tone: "ok" });
    } catch {
      setNote({ text: link, tone: "ok" });
    }
  }

  async function revoke() {
    if (!share) return;
    await revokeShareCard(share.id);
    setShare(null);
    setNote({ text: t("shareCard.revoked"), tone: "ok" });
  }

  const btn =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-paper px-3 text-sm font-semibold text-ink transition-colors active:bg-gold-wash/50 disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/45 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t("shareCard.close")} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-canvas px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:rounded-3xl"
        data-testid="share-sheet"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-center justify-between gap-3">
          <h2 id="share-sheet-title" className="flex items-center gap-2 font-serif text-xl font-semibold text-ink">
            <Glyph name="share" size={20} className="text-gold-text" />
            {t("shareCard.title")}
          </h2>
          <div className="flex rounded-full border border-line bg-paper p-0.5 text-xs font-semibold">
            {(["feed", "story"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSize(s);
                  setImgLoaded(false);
                }}
                className={`rounded-full px-3 py-1.5 ${size === s ? "bg-gold-wash text-gold-text" : "text-ink-tertiary"}`}
                aria-pressed={size === s}
              >
                {s === "feed" ? t("shareCard.feed") : t("shareCard.story")}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`relative mx-auto mt-4 overflow-hidden rounded-2xl border border-gold-accent/30 bg-paper shadow-[0_10px_30px_rgba(119,84,31,0.10)] ${
            size === "story" ? "aspect-[9/16] w-[62%]" : "aspect-[4/5] w-[78%]"
          }`}
        >
          {share ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${share.id}-${size}`}
              src={cardImageUrl(share.id, size)}
              alt={t("shareCard.cardAlt")}
              className={`h-full w-full object-cover transition-opacity ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
            />
          ) : null}
          {!share || !imgLoaded ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-ink-tertiary">
              <Glyph name="chandra" size={34} className="animate-pulse text-gold-accent" />
              <span className="text-xs">{busy === "build" || (share && !imgLoaded) ? t("shareCard.preparing") : ""}</span>
            </div>
          ) : null}
        </div>

        {allowsBirth ? (
          <div className="mt-4 rounded-2xl border border-line bg-paper px-4 py-2">
            <p className="py-1 text-xs text-ink-tertiary">{t("shareCard.privacyNote")}</p>
            {(
              [
                ["dob", t("shareCard.includeDob"), withDob, setWithDob],
                ["tp", t("shareCard.includeTimePlace"), withTimePlace, setWithTimePlace],
              ] as const
            ).map(([k, label, value, set]) => (
              <label key={k} className="flex min-h-11 items-center justify-between gap-3 text-sm text-ink">
                <span>{label}</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--color-gold-text,#8a6a2f)]"
                  checked={value}
                  onChange={(e) => set(e.target.checked)}
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-center text-xs text-ink-tertiary">{t("shareCard.privacyNote")}</p>
        )}

        <a
          href={share ? whatsappHref(share.caption) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!share}
          className={`mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1F7A4D] text-sm font-semibold text-white ${
            share ? "" : "pointer-events-none opacity-50"
          }`}
          data-testid="share-whatsapp"
        >
          <Glyph name="whatsapp" size={20} />
          {t("shareCard.whatsapp")}
        </a>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button type="button" className={btn} disabled={!share || busy === "share"} onClick={() => void shareImage()}>
            <Glyph name="share" size={18} className="text-gold-text" />
            <span className="truncate">{t("shareCard.more")}</span>
          </button>
          <button type="button" className={btn} disabled={!share || busy === "save"} onClick={() => void saveImage()}>
            <Glyph name="download" size={18} className="text-gold-text" />
            <span className="truncate">{t("shareCard.download")}</span>
          </button>
          <button type="button" className={btn} disabled={!share} onClick={() => void copyLink()}>
            <Glyph name="link" size={18} className="text-gold-text" />
            <span className="truncate">{t("shareCard.copyLink")}</span>
          </button>
        </div>
        {note ? (
          <p className={`mt-3 break-all text-center text-sm ${note.tone === "ok" ? "text-success-ink" : "text-warning-ink"}`}>
            {note.text}
          </p>
        ) : null}
        <div className="mt-3 flex items-center justify-between">
          {share ? (
            <button type="button" onClick={() => void revoke()} className="text-xs text-ink-tertiary underline-offset-2 hover:underline">
              {t("shareCard.revoke")}
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={onClose} className="text-sm font-semibold text-gold-text">
            {t("shareCard.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
