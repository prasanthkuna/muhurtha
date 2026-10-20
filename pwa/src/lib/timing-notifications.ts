import type { TodayPayload } from "@/lib/today-types";

const ENABLED_KEY = "muh_timing_notifications_v1";

export type ScheduledNotificationRow = {
  notification_key: string;
  notification_type: string;
  scheduled_at: string;
  title: string;
  body: string;
};

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function notificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ENABLED_KEY) === "1";
}

export function setNotificationsEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  if (!on) clearScheduledNotifications();
}

export function clearScheduledNotifications() {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}

function scheduleOne(key: string, whenMs: number, title: string, body: string) {
  if (whenMs < 60_000 || whenMs > 7 * 24 * 60 * 60 * 1000) return;
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  const handle = setTimeout(() => {
    timers.delete(key);
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try {
      const n = new Notification(title, {
        body,
        icon: "/icons/icon-192.png",
        tag: key,
      });
      n.onclick = () => {
        window.focus();
        window.location.assign("/today");
        n.close();
      };
    } catch {
      /* ignore */
    }
  }, whenMs);
  timers.set(key, handle);
}

function scheduleLocalWindowReminders(today: TodayPayload | null) {
  if (!today?.date) return;
  const date = today.date;
  for (const w of today.goodWindows.slice(0, 2)) {
    const startMs = Date.parse(`${date}T${w.start}:00`);
    if (!Number.isFinite(startMs)) continue;
    scheduleOne(
      `local-good-reminder:${date}:${w.start}`,
      startMs - Date.now() - 10 * 60 * 1000,
      "Good window in 10 minutes",
      w.label || "A supportive window opens soon.",
    );
  }
  for (const w of today.cautionWindows.slice(0, 2)) {
    const startMs = Date.parse(`${date}T${w.start}:00`);
    if (!Number.isFinite(startMs)) continue;
    scheduleOne(
      `local-caution-reminder:${date}:${w.start}`,
      startMs - Date.now() - 10 * 60 * 1000,
      "Caution window in 10 minutes",
      w.label || "Plan to go lighter soon.",
    );
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function syncTimingNotifications(today: TodayPayload | null): Promise<void> {
  if (!notificationsEnabled()) return;
  if (Notification.permission !== "granted") return;

  clearScheduledNotifications();

  try {
    const res = await fetch("/api/engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "notification_schedule_get", locale: "en" }),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (res.ok) {
      const rows = json.notifications;
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (!row || typeof row !== "object") continue;
          const r = row as Record<string, unknown>;
          const key = r.notification_key?.toString() ?? "";
          const at = r.scheduled_at?.toString() ?? "";
          const title = r.title?.toString() ?? "";
          const body = r.body?.toString() ?? "";
          if (!key || !at || !title) continue;
          scheduleOne(key, Date.parse(at) - Date.now(), title, body);
        }
      }
    }
  } catch {
    /* fall back to local windows */
  }

  scheduleLocalWindowReminders(today);
}
