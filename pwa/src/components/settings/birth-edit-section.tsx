"use client";

import { useCallback, useEffect, useState } from "react";
import { LocationPicker } from "@/components/location/location-picker";
import { MuhInput } from "@/components/ui/form-fields";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { usePaywall } from "@/context/paywall-context";
import { clearEngineCache } from "@/lib/engine-cache";
import type { ResolvedPlace } from "@/lib/location/resolved-place";

type Limits = {
  isPro: boolean;
  withinTypoWindow: boolean;
  typoWindowEndsAt: string;
  used30: number;
  used365: number;
  allowed: boolean;
  reason: "typo_window" | "pro_required" | "limit_30" | "limit_365" | "ok";
  current: {
    date_of_birth: string | null;
    exact_birth_time: string | null;
    time_bucket: string | null;
    birth_place: string | null;
    birth_lat: number | null;
    birth_lng: number | null;
    birth_timezone: string | null;
  };
};

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, json };
}

/** Settings › birth details editor. Limits are enforced by the engine (birth_edit). */
export function BirthEditSection({ onSaved }: { onSaved: () => void }) {
  const { t, locale } = useLocale();
  const { refresh, profileTimezone } = useAppData();
  const { openPaywall } = usePaywall();
  const [limits, setLimits] = useState<Limits | null>(null);
  const [open, setOpen] = useState(false);
  const [dob, setDob] = useState("");
  const [time, setTime] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);
  const [place, setPlace] = useState<ResolvedPlace | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);

  const load = useCallback(async () => {
    const { res, json } = await post({ action: "birth_edit", check: true, locale });
    if (res.ok && json.limits) setLimits(json.limits as Limits);
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit() {
    if (!limits) return;
    if (!limits.allowed) {
      if (limits.reason === "pro_required") openPaywall("general");
      else setMsg({ text: t("birthEdit.limit"), tone: "warn" });
      return;
    }
    const c = limits.current;
    setDob(c.date_of_birth ?? "");
    setTime(c.exact_birth_time ? c.exact_birth_time.slice(0, 5) : "");
    setUnknownTime(!c.exact_birth_time);
    setPlace(
      c.birth_place && c.birth_lat != null && c.birth_lng != null
        ? { label: c.birth_place, lat: Number(c.birth_lat), lng: Number(c.birth_lng), timezone: c.birth_timezone ?? "Asia/Kolkata" }
        : null,
    );
    setMsg(null);
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const { res, json } = await post({
        action: "birth_edit",
        locale,
        date_of_birth: dob,
        exact_birth_time: unknownTime ? null : time || null,
        ...(place
          ? { birth_place: place.label, birth_lat: place.lat, birth_lng: place.lng, birth_timezone: place.timezone }
          : {}),
      });
      if (!res.ok) {
        const code = json.error_code?.toString() ?? "";
        if (code === "pro_required_birth_edit") {
          setOpen(false);
          openPaywall("general");
        } else if (code === "birth_edit_limit_reached") {
          setMsg({ text: t("birthEdit.limit"), tone: "warn" });
        } else {
          setMsg({ text: json.error?.toString() || t("birthEdit.error"), tone: "warn" });
        }
        return;
      }
      if (json.limits) setLimits(json.limits as Limits);
      if (json.changed === false) {
        setMsg({ text: t("birthEdit.unchanged"), tone: "ok" });
        setOpen(false);
        return;
      }
      setOpen(false);
      setMsg({ text: t("birthEdit.saved"), tone: "ok" });
      clearEngineCache();
      onSaved();
      await refresh();
    } catch {
      setMsg({ text: t("birthEdit.error"), tone: "warn" });
    } finally {
      setBusy(false);
    }
  }

  if (!limits) return null;

  const when = new Intl.DateTimeFormat(locale === "te" ? "te-IN" : locale === "hi" ? "hi-IN" : "en-IN", {
    timeZone: profileTimezone || "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(limits.typoWindowEndsAt));
  const note = limits.withinTypoWindow
    ? t("birthEdit.typo").replace("{time}", when)
    : limits.isPro
      ? t("birthEdit.pro").replace("{used30}", String(limits.used30)).replace("{used365}", String(limits.used365))
      : t("birthEdit.locked");

  return (
    <div className="space-y-2" data-testid="birth-edit">
      {!open ? (
        <button
          type="button"
          onClick={startEdit}
          className="inline-flex min-h-10 items-center rounded-full border border-gold-accent/40 bg-gold-wash px-4 text-sm font-semibold text-gold-text"
        >
          {t("birthEdit.cta")}
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-line bg-paper p-4">
          <p className="font-serif text-lg text-ink">{t("birthEdit.title")}</p>
          <label className="block text-sm text-ink-secondary">
            {t("birthEdit.dob")}
            <MuhInput type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} className="mt-1" />
          </label>
          <label className="block text-sm text-ink-secondary">
            {t("birthEdit.time")}
            <MuhInput type="time" value={time} disabled={unknownTime} onChange={(e) => setTime(e.target.value)} className="mt-1" />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-secondary">
            <input type="checkbox" checked={unknownTime} onChange={(e) => setUnknownTime(e.target.checked)} />
            {t("birthEdit.timeUnknown")}
          </label>
          <LocationPicker label={t("birthEdit.place")} value={place} onChange={setPlace} allowDetect={false} />
          <p className="text-xs text-ink-tertiary">{t("birthEdit.warn")}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !dob}
              onClick={() => void save()}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-gold-button px-4 text-sm font-semibold text-ink disabled:opacity-60"
            >
              {busy ? t("birthEdit.saving") : t("birthEdit.save")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm text-ink-secondary"
            >
              {t("birthEdit.cancel")}
            </button>
          </div>
        </div>
      )}
      <p className="px-1 text-xs text-ink-tertiary">{note}</p>
      {msg ? (
        <p className={`px-1 text-sm ${msg.tone === "ok" ? "text-success-ink" : "text-warning-ink"}`}>{msg.text}</p>
      ) : null}
    </div>
  );
}
