"use client";

import { useEffect } from "react";
import { useAppData } from "@/context/app-data-context";
import { notificationsEnabled, syncTimingNotifications } from "@/lib/timing-notifications";

/** Schedules browser notifications for today-ready and good/caution windows when enabled. */
export function TimingNotificationsSync() {
  const { today } = useAppData();

  useEffect(() => {
    if (!notificationsEnabled()) return;
    void syncTimingNotifications(today);
  }, [today]);

  return null;
}
