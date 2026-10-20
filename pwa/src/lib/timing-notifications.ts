import { DateTime } from "luxon";
import type { AppLocale } from "@/lib/locale";
import type { TodayPayload } from "@/lib/today-types";

const ENABLED_KEY = "muh_timing_notifications_v1";
const QUEUE_KEY = "muh_notif_queue_v1";
const FIRED_KEY = "muh_notif_fired_v1";

export type QueuedNotification = {
  key: string;
  at: string;
  title: string;
  body: string;
};

const timers = new Map<string, ReturnType<typeof setTimeout>>();
let pollerStarted = false;

export function notificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ENABLED_KEY) === "1";
}

export function setNotificationsEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  if (!on) {
    clearScheduledNotifications();
    writeQueue([]);
  }
}

function readQueue(): QueuedNotification[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(rows: QueuedNotification[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(rows.slice(0, 64)));
}

function readFired(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function markFired(key: string) {
  const fired = readFired();
  fired.add(key);
  localStorage.setItem(FIRED_KEY, JSON.stringify([...fired].slice(-128)));
}

export function clearScheduledNotifications() {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}

function showNotification(title: string, body: string, key: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (readFired().has(key)) return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/icons/icon-192.png",
      tag: key,
    });
    markFired(key);
    n.onclick = () => {
      window.focus();
      window.location.assign("/today");
      n.close();
    };
  } catch {
    /* ignore */
  }
}

function scheduleOne(key: string, whenMs: number, title: string, body: string) {
  if (whenMs < 5_000 || whenMs > 8 * 24 * 60 * 60 * 1000) return;
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  const handle = setTimeout(() => {
    timers.delete(key);
    showNotification(title, body, key);
  }, whenMs);
  timers.set(key, handle);
}

function windowStartMs(date: string, hhmm: string, timeZone: string): number | null {
  const dt = DateTime.fromISO(`${date}T${hhmm}`, { zone: timeZone });
  if (!dt.isValid) return null;
  return dt.toMillis();
}

function mergeQueue(rows: QueuedNotification[]) {
  const byKey = new Map<string, QueuedNotification>();
  for (const row of readQueue()) byKey.set(row.key, row);
  for (const row of rows) byKey.set(row.key, row);
  const merged = [...byKey.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  writeQueue(merged);
  return merged;
}

export function processDueNotifications(now = Date.now()) {
  if (!notificationsEnabled()) return;
  if (Notification.permission !== "granted") return;
  const fired = readFired();
  for (const row of readQueue()) {
    const at = Date.parse(row.at);
    if (!Number.isFinite(at) || fired.has(row.key)) continue;
    if (at <= now && now - at < 15 * 60 * 1000) {
      showNotification(row.title, row.body, row.key);
    }
  }
}

export function startNotificationPoller() {
  if (pollerStarted || typeof window === "undefined") return;
  pollerStarted = true;
  processDueNotifications();
  window.setInterval(() => processDueNotifications(), 30_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") processDueNotifications();
  });
}

function scheduleLocalWindowReminders(today: TodayPayload | null, timeZone: string) {
  if (!today?.date) return;
  const rows: QueuedNotification[] = [];
  const scheduleWindow = (w: { start: string; label?: string }, tone: "good" | "caution") => {
    const startMs = windowStartMs(today.date, w.start, timeZone);
    if (startMs == null) return;
    const reminderMs = startMs - 10 * 60 * 1000;
    const keyPrefix = tone === "good" ? "local-good-reminder" : "local-caution-reminder";
    rows.push({
      key: `${keyPrefix}:${today.date}:${w.start}`,
      at: new Date(reminderMs).toISOString(),
      title: tone === "good" ? "Good window in 10 minutes" : "Caution window in 10 minutes",
      body: w.label || (tone === "good" ? "A supportive window opens soon." : "Plan to go lighter soon."),
    });
  };
  for (const w of today.goodWindows.slice(0, 3)) scheduleWindow(w, "good");
  for (const w of today.cautionWindows.slice(0, 3)) scheduleWindow(w, "caution");
  return rows;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function syncTimingNotifications(
  today: TodayPayload | null,
  locale: AppLocale = "en",
  timeZone = "Asia/Kolkata",
): Promise<void> {
  if (!notificationsEnabled()) return;
  if (Notification.permission !== "granted") return;

  clearScheduledNotifications();
  startNotificationPoller();

  const queued: QueuedNotification[] = [];

  try {
    const res = await fetch("/api/engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "notification_schedule_get",
        locale,
        date: today?.date,
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (res.ok && Array.isArray(json.notifications)) {
      for (const row of json.notifications) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        const key = r.notification_key?.toString() ?? "";
        const at = r.scheduled_at?.toString() ?? "";
        const title = r.title?.toString() ?? "";
        const body = r.body?.toString() ?? "";
        if (!key || !at || !title) continue;
        queued.push({ key, at, title, body });
        scheduleOne(key, Date.parse(at) - Date.now(), title, body);
      }
    }
  } catch {
    /* fall back to local windows */
  }

  queued.push(...(scheduleLocalWindowReminders(today, timeZone) ?? []));
  const merged = mergeQueue(queued);
  for (const row of merged) {
    scheduleOne(row.key, Date.parse(row.at) - Date.now(), row.title, row.body);
  }
}
