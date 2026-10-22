"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MapPin, Navigation, Search, X } from "@/components/celestial/muh-icon";
import { MuhField, MuhInput } from "@/components/ui/form-fields";
import { useLocale } from "@/context/locale-context";
import { localPlaceHints } from "@/lib/location/place-hints";
import {
  detectCurrentPlace,
  geolocationErrorMessage,
  searchPlaces,
  type ResolvedPlace,
} from "@/lib/location/resolved-place";
import { cn } from "@/components/ui/cn";

const AUTO_DETECT_KEY = "muh_autodetect_done_v1";

export function LocationPicker({
  label,
  value,
  onChange,
  autoDetect = false,
  className,
}: {
  label: string;
  value: ResolvedPlace | null;
  onChange: (place: ResolvedPlace) => void;
  autoDetect?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResolvedPlace[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const listId = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const detectStarted = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!sheetOpen || !mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen, mounted]);

  const detect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const place = await detectCurrentPlace();
      onChange(place);
      setSheetOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : geolocationErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [onChange]);

  useEffect(() => {
    if (!mounted || !autoDetect || value || detectStarted.current) return;
    detectStarted.current = true;
    // Auto-detect at most once per browser session; afterwards the user taps Detect.
    try {
      if (sessionStorage.getItem(AUTO_DETECT_KEY)) return;
      sessionStorage.setItem(AUTO_DETECT_KEY, "1");
    } catch {
      /* private mode: still detect once for this mount */
    }
    void detect();
  }, [mounted, autoDetect, value, detect]);

  useEffect(() => {
    if (!sheetOpen) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchBusy(false);
      setError(null);
      return;
    }

    setResults(localPlaceHints(q, 8));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      void (async () => {
        setSearchBusy(true);
        setError(null);
        try {
          const rows = await searchPlaces(q, 8, ac.signal);
          if (ac.signal.aborted) return;
          setResults(rows);
        } catch (e) {
          if (ac.signal.aborted) return;
          const instant = localPlaceHints(q, 8);
          if (instant.length > 0) {
            setResults(instant);
            setError(null);
          } else {
            setResults([]);
            setError(e instanceof Error ? e.message : t("location.searchFailed"));
          }
        } finally {
          if (!ac.signal.aborted) setSearchBusy(false);
        }
      })();
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, sheetOpen, t]);

  useEffect(() => {
    if (!sheetOpen) {
      abortRef.current?.abort();
      setSearchBusy(false);
    }
  }, [sheetOpen]);

  function pick(place: ResolvedPlace) {
    onChange(place);
    setSheetOpen(false);
    setQuery("");
    setResults([]);
    setError(null);
  }

  function openSheet() {
    setSheetOpen(true);
    setQuery(value?.label ?? "");
    setResults(value ? [value] : []);
    setError(null);
  }

  const placeholder =
    !mounted ? t("location.tapToSearch") : busy ? t("settings.detecting") : t("location.tapToSearch");

  const sheet =
    sheetOpen && mounted ? (
      <div
        className="fixed inset-0 z-[120] flex items-end justify-center bg-ink/45 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${listId}-title`}
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label={t("common.cancel")}
          onClick={() => setSheetOpen(false)}
        />
        <div
          className="relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-2xl border border-line bg-canvas pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p id={`${listId}-title`} className="font-serif text-lg text-ink">
                {t("location.sheetTitle")}
              </p>
              <p className="text-xs text-ink-tertiary">{t("location.sheetHint")}</p>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="rounded-full p-2 text-ink-secondary hover:bg-paper"
              aria-label={t("common.cancel")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-4 pt-3">
            <MuhInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("location.searchPlaceholder")}
              aria-controls={listId}
              autoFocus
              enterKeyHint="search"
            />
          </div>
          <button
            type="button"
            onClick={() => void detect()}
            disabled={busy}
            className="mx-4 mt-2 flex items-center gap-2 rounded-xl border border-gold-accent/30 bg-gold-wash/25 px-3 py-2.5 text-left text-sm font-medium text-gold-text disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Navigation className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {busy ? t("settings.detecting") : t("settings.detectLocation")}
          </button>
          <ul
            id={listId}
            className="min-h-[8rem] flex-1 overflow-y-auto px-2 py-2"
            role="listbox"
            aria-label={t("location.sheetTitle")}
          >
            {searchBusy && results.length === 0 ? (
              <li className="flex items-center gap-2 px-3 py-4 text-sm text-ink-secondary">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("location.searching")}
              </li>
            ) : null}
            {!searchBusy && query.trim().length >= 2 && results.length === 0 && !error ? (
              <li className="px-3 py-4 text-sm text-ink-secondary">{t("location.noResults")}</li>
            ) : null}
            {results.map((place) => (
              <li key={`${place.lat}-${place.lng}-${place.label}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.lat === place.lat && value?.lng === place.lng}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-gold-wash/30"
                  onClick={() => pick(place)}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-text" aria-hidden />
                  <span>
                    <span className="block text-sm font-medium text-ink">{place.label}</span>
                    <span className="text-xs text-ink-tertiary">{place.timezone}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {error && sheetOpen ? (
            <p className="border-t border-line px-4 py-2 text-xs text-warning-ink" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    ) : null;

  return (
    <div className={cn("space-y-2", className)}>
      <MuhField label={label}>
        <button
          type="button"
          onClick={openSheet}
          className="flex min-h-[3rem] w-full items-center gap-3 rounded-xl border border-gold-accent/20 bg-gradient-to-br from-paper to-gold-wash/10 px-3 py-2.5 text-left transition-colors hover:border-gold-accent/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-wash/80 text-gold-text">
            <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {value?.label ?? (busy ? t("settings.detecting") : placeholder)}
            </p>
            {value?.timezone ? (
              <p className="truncate text-xs text-ink-tertiary">{value.timezone}</p>
            ) : (
              <p className="text-xs text-ink-tertiary">{t("location.tapToSearch")}</p>
            )}
          </div>
          {busy ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold-text" aria-hidden />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden />
          )}
        </button>
      </MuhField>

      <button
        type="button"
        onClick={() => void detect()}
        disabled={busy}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-gold-text underline-offset-2 hover:underline disabled:opacity-50"
      >
        <Navigation className="h-4 w-4" aria-hidden />
        {busy ? t("settings.detecting") : t("settings.detectLocation")}
      </button>

      {error && !sheetOpen ? (
        <p className="text-sm text-warning-ink" role="alert">
          {error}
        </p>
      ) : null}

      {mounted && sheet ? createPortal(sheet, document.body) : null}
    </div>
  );
}
