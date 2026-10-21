"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin, Navigation, Search, X } from "@/components/celestial/muh-icon";
import { MuhField, MuhInput } from "@/components/ui/form-fields";
import { useLocale } from "@/context/locale-context";
import {
  detectCurrentPlace,
  searchPlaces,
  type ResolvedPlace,
} from "@/lib/location/resolved-place";
import { cn } from "@/components/ui/cn";

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

  useEffect(() => setMounted(true), []);

  const detect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const place = await detectCurrentPlace();
      onChange(place);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("onboarding.geoFailed"));
    } finally {
      setBusy(false);
    }
  }, [onChange, t]);

  useEffect(() => {
    if (!mounted || !autoDetect || value) return;
    void detect();
  }, [mounted, autoDetect, value, detect]);

  useEffect(() => {
    if (!sheetOpen) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        setSearchBusy(true);
        setError(null);
        try {
          const rows = await searchPlaces(q, 8);
          setResults(rows);
          if (rows.length === 0) {
            setError(t("location.noResults"));
          }
        } catch (e) {
          setResults([]);
          setError(e instanceof Error ? e.message : t("location.searchFailed"));
        } finally {
          setSearchBusy(false);
        }
      })();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, sheetOpen, t]);

  function pick(place: ResolvedPlace) {
    onChange(place);
    setSheetOpen(false);
    setQuery("");
    setResults([]);
    setError(null);
  }

  const placeholder = mounted && busy ? t("settings.detecting") : "—";

  return (
    <div className={cn("space-y-2", className)}>
      <MuhField label={label}>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-[3rem] w-full items-center gap-3 rounded-xl border border-gold-accent/20 bg-gradient-to-br from-paper to-gold-wash/10 px-3 py-2.5 text-left transition-colors hover:border-gold-accent/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-wash/80 text-gold-text">
            <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{value?.label ?? placeholder}</p>
            {value?.timezone ? (
              <p className="truncate text-[11px] text-ink-tertiary">{value.timezone}</p>
            ) : (
              <p className="text-[11px] text-ink-tertiary">{t("location.tapToSearch")}</p>
            )}
          </div>
          {busy ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold-text" aria-hidden />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden />
          )}
        </button>
      </MuhField>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void detect()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-gold-text underline-offset-2 hover:underline disabled:opacity-50"
        >
          <Navigation className="h-3.5 w-3.5" aria-hidden />
          {t("settings.detectLocation")}
        </button>
      </div>

      {error && !sheetOpen ? (
        <p className="text-xs text-warning-ink" role="alert">
          {error}
        </p>
      ) : null}

      {sheetOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label={t("common.cancel")}
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-2xl border border-line bg-canvas shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="font-serif text-lg text-ink">{t("location.sheetTitle")}</p>
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
              />
            </div>
            <ul
              id={listId}
              className="flex-1 overflow-y-auto px-2 py-2"
              role="listbox"
              aria-label={t("location.sheetTitle")}
            >
              {searchBusy ? (
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
              <p className="border-t border-line px-4 py-2 text-xs text-warning-ink">{error}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
