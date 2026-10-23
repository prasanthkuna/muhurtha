"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Check, Loader2 } from "@/components/celestial/muh-icon";
import { SettingsRow } from "@/components/editorial/settings-row";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import {
  disablePush,
  enablePush,
  pushDeviceStatus,
  sendTestPush,
  updatePushPrefs,
  type PushDeviceStatus,
  type PushPrefs,
  DEFAULT_PREFS,
} from "@/lib/web-push";
import { InstallChip } from "@/components/pwa/install-chip";
import { usePwaInstall } from "@/lib/pwa-install";

function StatusRow({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/80 py-2.5 last:border-0">
      <dt className="text-sm text-ink-tertiary">{label}</dt>
      <dd
        className={`max-w-[60%] text-right text-sm font-medium ${
          tone === "ok" ? "text-success-ink" : tone === "warn" ? "text-warning-ink" : "text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/** Settings → Notifications: real Web Push (works with the app closed), status and test. */
export function PushSection() {
  const { t, locale } = useLocale();
  const { profileTimezone, chartProfiles } = useAppData();
  const { standalone, ready: installReady } = usePwaInstall();
  const [status, setStatus] = useState<PushDeviceStatus | null>(null);
  const [busy, setBusy] = useState<"toggle" | "test" | "prefs" | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);

  const reload = useCallback(async () => {
    setStatus(await pushDeviceStatus());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const on = Boolean(status?.subscribed && status.serverKnowsDevice && status.permission === "granted");

  function formatWhen(iso: string | null): string {
    if (!iso) return t("settings.pushNever");
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return t("settings.pushNever");
    return new Intl.DateTimeFormat(locale === "te" ? "te-IN" : locale === "hi" ? "hi-IN" : "en-IN", {
      timeZone: profileTimezone || "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(d);
  }

  async function toggle() {
    setMsg(null);
    setBusy("toggle");
    try {
      if (on) {
        await disablePush();
      } else {
        await enablePush(locale, profileTimezone || "Asia/Kolkata", status?.prefs);
        setMsg({ text: t("settings.pushEnabled"), tone: "ok" });
      }
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setMsg({
        text:
          code === "denied"
            ? t("settings.pushBlockedHelp")
            : code === "unsupported"
              ? t("settings.pushUnsupported")
              : code === "dismissed"
                ? t("settings.permissionRequired")
                : code === "server_not_configured"
                  ? t("settings.pushServerDown")
                  : `${t("settings.pushFailed")} ${code}`.trim(),
        tone: "warn",
      });
    } finally {
      setBusy(null);
      await reload();
    }
  }

  async function test() {
    setMsg(null);
    setBusy("test");
    try {
      const r = await sendTestPush(locale);
      if (r.total === 0) {
        setMsg({ text: t("settings.pushNoDevice"), tone: "warn" });
      } else if (r.sent > 0) {
        const code = r.results.find((x) => x.ok)?.status ?? 201;
        setMsg({ text: `${t("settings.pushTestSent")} (${code})`, tone: "ok" });
      } else {
        const first = r.results[0];
        setMsg({
          text: `${t("settings.pushTestFailed")} ${first?.status ?? ""} ${first?.error ?? ""}`.trim(),
          tone: "warn",
        });
      }
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : t("settings.pushTestFailed"), tone: "warn" });
    } finally {
      setBusy(null);
      await reload();
    }
  }

  async function setPref(key: keyof PushPrefs, value: boolean) {
    if (!status) return;
    const prefs = { ...status.prefs, [key]: value };
    setStatus({ ...status, prefs });
    setBusy("prefs");
    try {
      await updatePushPrefs(prefs, locale, profileTimezone || "Asia/Kolkata");
    } finally {
      setBusy(null);
    }
  }

  const permissionLabel =
    !status || status.permission === "unsupported"
      ? t("settings.pushUnsupportedShort")
      : status.permission === "granted"
        ? t("settings.pushAllowed")
        : status.permission === "denied"
          ? t("settings.pushBlocked")
          : t("settings.pushNotAsked");

  return (
    <div className="space-y-2">
      <p className="px-1 text-sm text-ink-secondary">{t("settings.alertsHint")}</p>
      <dl className="rounded-2xl border border-line bg-paper px-4 py-1">
        <StatusRow
          label={t("install.openedAs")}
          value={installReady ? (standalone ? t("install.modeApp") : t("install.modeBrowser")) : "…"}
          tone={installReady ? (standalone ? "ok" : "warn") : undefined}
        />
        <StatusRow
          label={t("settings.pushPermission")}
          value={status ? permissionLabel : "…"}
          tone={status?.permission === "granted" ? "ok" : status?.permission === "denied" ? "warn" : undefined}
        />
        <StatusRow
          label={t("settings.pushThisPhone")}
          value={status ? (on ? t("settings.pushSubscribed") : t("settings.pushNotSubscribed")) : "…"}
          tone={on ? "ok" : undefined}
        />
        <StatusRow
          label={t("settings.pushLastDelivered")}
          value={status ? formatWhen(status.lastSuccessAt ?? status.lastDeliveredAt) : "…"}
        />
      </dl>
      <SettingsRow
        onClick={() => void toggle()}
        icon={
          busy === "toggle" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : on ? (
            <BellOff className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )
        }
        title={on ? t("settings.alertsOn") : t("settings.alertsOff")}
      />
      <InstallChip variant="row" force />
      {on ? (
        <>
          <div className="rounded-2xl border border-line bg-paper px-4 py-2">
            {(
              [
                ["daily", t("settings.pushPrefDaily")],
                ["good", t("settings.pushPrefGood")],
                ["rahu", t("settings.pushPrefRahu")],
                ["chapter", t("settings.pushPrefChapter")],
                ...(chartProfiles.length > 0
                  ? ([
                      ["child", t("settings.pushPrefChild")],
                      ["friends", t("settings.pushPrefFriends")],
                    ] as const)
                  : []),
                ["weekly", t("settings.pushPrefWeekly")],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex min-h-11 items-center justify-between gap-3 text-sm text-ink">
                <span>{label}</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--color-gold-text,#8a6a2f)]"
                  checked={status?.prefs[key] ?? DEFAULT_PREFS[key]}
                  disabled={busy === "prefs"}
                  onChange={(e) => void setPref(key, e.target.checked)}
                />
              </label>
            ))}
            <p className="border-t border-line/70 py-2 text-xs text-ink-tertiary">{t("settings.pushQuiet")}</p>
          </div>
          <SettingsRow
            onClick={() => void test()}
            icon={busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            title={t("settings.pushTest")}
            detail={t("settings.pushTestHint")}
          />
        </>
      ) : null}
      {on ? <p className="px-1 text-xs text-ink-tertiary">{t("settings.pushSpamHelp")}</p> : null}
      {status?.permission === "denied" && !msg ? (
        <p className="px-1 text-sm text-warning-ink">{t("settings.pushBlockedHelp")}</p>
      ) : null}
      {msg ? (
        <p className={`px-1 text-sm ${msg.tone === "ok" ? "text-success-ink" : "text-warning-ink"}`}>{msg.text}</p>
      ) : null}
    </div>
  );
}
