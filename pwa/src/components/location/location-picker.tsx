"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { MuhField, MuhInput, fieldClass } from "@/components/ui/form-fields";
import {
  detectCurrentPlace,
  resolvePlaceByQuery,
  type ResolvedPlace,
} from "@/lib/location/resolved-place";
import { cn } from "@/components/ui/cn";

export function LocationPicker({
  label,
  value,
  onChange,
  autoDetect = true,
  className,
}: {
  label: string;
  value: ResolvedPlace | null;
  onChange: (place: ResolvedPlace) => void;
  autoDetect?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const listId = useId();

  const detect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const place = await detectCurrentPlace();
      onChange(place);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Location failed");
    } finally {
      setBusy(false);
    }
  }, [onChange]);

  useEffect(() => {
    if (!autoDetect || value) return;
    void detect();
  }, [autoDetect, value, detect]);

  async function runSearch() {
    setSearchBusy(true);
    setError(null);
    try {
      const place = await resolvePlaceByQuery(query);
      if (!place) throw new Error("No match for that place.");
      onChange(place);
      setSheetOpen(false);
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearchBusy(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <MuhField label={label}>
        <div
          className={cn(
            fieldClass,
            "flex min-h-[3rem] items-center gap-3 border-gold-accent/20 bg-gradient-to-br from-paper to-gold-wash/10 py-2.5",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-wash/80 text-gold-text">
            <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {value?.label ?? (busy ? "Detecting…" : "—")}
            </p>
            {value?.timezone ? (
              <p className="truncate text-[11px] text-ink-tertiary">{value.timezone}</p>
            ) : null}
          </div>
          {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold-text" aria-hidden /> : null}
        </div>
      </MuhField>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void detect()}
          disabled={busy}
          className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-gold-text"
        >
          Use device location
        </button>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink-secondary"
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          Pick place
        </button>
      </div>

      {error ? (
        <p className="text-xs text-warning-ink" role="alert">
          {error}
        </p>
      ) : null}

      {sheetOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-canvas p-4 shadow-xl">
            <p className="font-serif text-lg text-ink">Pick a place</p>
            <p className="mt-1 text-xs text-ink-tertiary">Search a city — we resolve coordinates automatically.</p>
            <div className="mt-3 flex gap-2">
              <MuhInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="City, region, country"
                aria-controls={listId}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void runSearch();
                }}
              />
              <button
                type="button"
                disabled={searchBusy || !query.trim()}
                onClick={() => void runSearch()}
                className="shrink-0 rounded-xl bg-gold-wash px-4 text-sm font-semibold text-gold-text disabled:opacity-50"
              >
                {searchBusy ? "…" : "Set"}
              </button>
            </div>
            <button
              type="button"
              className="mt-3 w-full py-2 text-sm text-ink-tertiary"
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
