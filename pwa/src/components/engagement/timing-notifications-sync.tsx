"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { clearScheduledNotifications, setNotificationsEnabled } from "@/lib/timing-notifications";
import { resubscribed, syncPushSubscription } from "@/lib/web-push";

const LEGACY_KEY = "muh_timing_notifications_v1";

/**
 * Notifications are server-sent Web Push now (they arrive with the app closed). This keeps
 * the device's subscription in sync (language/timezone/rotated endpoint), retires the old
 * in-tab timers (which never fired on Android: `new Notification()` is not allowed there),
 * and follows deep links the service worker posts when a notification is tapped.
 */
export function TimingNotificationsSync() {
  const { profileTimezone } = useAppData();
  const { locale } = useLocale();
  const router = useRouter();

  useEffect(() => {
    try {
      if (localStorage.getItem(LEGACY_KEY) !== null) {
        clearScheduledNotifications();
        setNotificationsEnabled(false);
        localStorage.removeItem(LEGACY_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void syncPushSubscription(locale, profileTimezone || "Asia/Kolkata");
  }, [locale, profileTimezone]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string; subscription?: PushSubscriptionJSON };
      if (data?.type === "muh-navigate" && typeof data.url === "string" && data.url.startsWith("/")) {
        router.push(data.url);
      } else if (data?.type === "muh-push-resubscribed" && data.subscription) {
        void resubscribed(data.subscription, locale, profileTimezone || "Asia/Kolkata");
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router, locale, profileTimezone]);

  return null;
}
