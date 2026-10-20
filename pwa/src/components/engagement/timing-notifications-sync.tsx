"use client";

import { useEffect } from "react";
import { useAppData } from "@/context/app-data-context";
import { useLocale } from "@/context/locale-context";
import { notificationsEnabled, syncTimingNotifications } from "@/lib/timing-notifications";

/** Schedules browser notifications for today-ready and good/caution windows when enabled. */
export function TimingNotificationsSync() {
  const { today, profileTimezone } = useAppData();
  const { locale } = useLocale();

  useEffect(() => {
    if (!notificationsEnabled()) return;
    void syncTimingNotifications(today, locale, profileTimezone);
  }, [today, locale, profileTimezone]);

  return null;
}
