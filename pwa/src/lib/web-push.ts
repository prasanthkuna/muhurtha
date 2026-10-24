/**
 * Web Push client: permission (from a user tap), PushManager subscription with the
 * server's VAPID key, and saving it to the engine. Delivery is server-side (pg_cron),
 * so alerts arrive with the app closed. Android Chrome / installed PWA is the main target.
 */

export type PushPermission = NotificationPermission | "unsupported";

export type PushDeviceStatus = {
  supported: boolean;
  standalone: boolean;
  permission: PushPermission;
  subscribed: boolean;
  serverConfigured: boolean;
  serverKnowsDevice: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastDeliveredAt: string | null;
  prefs: PushPrefs;
};

export type PushPrefs = {
  daily: boolean;
  good: boolean;
  rahu: boolean;
  chapter: boolean;
  child: boolean;
  friends: boolean;
  weekly: boolean;
  bond: boolean;
};
export const DEFAULT_PREFS: PushPrefs = {
  daily: true,
  good: true,
  rahu: true,
  chapter: true,
  child: true,
  friends: false,
  weekly: false,
  bond: true,
};

const SYNC_KEY = "muh_push_sync_v1";

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, json };
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function permissionState(): PushPermission {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (!existing) await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return await navigator.serviceWorker.ready;
}

function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob(b64url.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function sameKey(sub: PushSubscription, key: Uint8Array): boolean {
  const current = sub.options?.applicationServerKey;
  if (!current) return true;
  const a = new Uint8Array(current);
  return a.length === key.length && a.every((v, i) => v === key[i]);
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function saveSubscription(
  sub: PushSubscription | PushSubscriptionJSON,
  locale: string,
  timezone: string,
  prefs?: PushPrefs,
) {
  const json = "toJSON" in sub ? sub.toJSON() : sub;
  const { res, json: out } = await post({
    action: "push_subscribe",
    locale,
    timezone,
    user_agent: navigator.userAgent,
    installed: isStandalone(),
    subscription: json,
    ...(prefs ? { prefs } : {}),
  });
  if (!res.ok) throw new Error(out.error?.toString() ?? "Could not save this device");
  try {
    localStorage.setItem(
      SYNC_KEY,
      JSON.stringify({ endpoint: json.endpoint, locale, installed: isStandalone(), at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

/** Must run from a tap (Android/iOS only show the prompt for a user gesture). */
export async function enablePush(locale: string, timezone: string, prefs?: PushPrefs): Promise<void> {
  if (!pushSupported()) throw new Error("unsupported");
  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new Error(permission === "denied" ? "denied" : "dismissed");
  const { res, json } = await post({ action: "push_config" });
  const publicKey = json.publicKey?.toString() ?? "";
  if (!res.ok || !publicKey) throw new Error("server_not_configured");
  const key = keyBytes(publicKey);
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub, key)) {
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await saveSubscription(sub, locale, timezone, prefs);
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => false);
  await post({ action: "push_unsubscribe", endpoint });
  try {
    localStorage.removeItem(SYNC_KEY);
  } catch {
    /* ignore */
  }
}

export async function updatePushPrefs(prefs: PushPrefs, locale: string, timezone: string) {
  const sub = await currentSubscription();
  if (!sub) return;
  await saveSubscription(sub, locale, timezone, prefs);
}

/**
 * Keeps the server copy fresh (language, timezone, rotated endpoints) without prompting.
 * Cheap: at most once a day unless the language or endpoint changed.
 */
export async function syncPushSubscription(locale: string, timezone: string): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") return;
  const sub = await currentSubscription();
  if (!sub) return;
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    const last = raw
      ? (JSON.parse(raw) as { endpoint?: string; locale?: string; installed?: boolean; at?: number })
      : null;
    if (
      last?.endpoint === sub.endpoint &&
      last.locale === locale &&
      last.installed === isStandalone() &&
      Date.now() - (last.at ?? 0) < 24 * 60 * 60 * 1000
    ) {
      return;
    }
  } catch {
    /* re-sync */
  }
  await saveSubscription(sub, locale, timezone).catch(() => undefined);
}

export async function resubscribed(json: PushSubscriptionJSON, locale: string, timezone: string) {
  await saveSubscription(json, locale, timezone).catch(() => undefined);
}

export async function pushDeviceStatus(): Promise<PushDeviceStatus> {
  const supported = pushSupported();
  const sub = supported ? await currentSubscription().catch(() => null) : null;
  const base: PushDeviceStatus = {
    supported,
    standalone: isStandalone(),
    permission: permissionState(),
    subscribed: Boolean(sub),
    serverConfigured: false,
    serverKnowsDevice: false,
    lastSuccessAt: null,
    lastError: null,
    lastDeliveredAt: null,
    prefs: DEFAULT_PREFS,
  };
  try {
    const { res, json } = await post({ action: "push_status", endpoint: sub?.endpoint ?? "" });
    if (!res.ok) return base;
    const device = json.thisDevice as Record<string, unknown> | null | undefined;
    const prefs = (device?.prefs ?? null) as Partial<PushPrefs> | null;
    return {
      ...base,
      serverConfigured: json.configured === true,
      serverKnowsDevice: Boolean(device?.active),
      lastSuccessAt: device?.lastSuccessAt?.toString() ?? null,
      lastError: device?.lastError?.toString() ?? null,
      lastDeliveredAt: json.lastDeliveredAt?.toString() ?? null,
      prefs: { ...DEFAULT_PREFS, ...(prefs ?? {}) },
    };
  } catch {
    return base;
  }
}

export async function sendTestPush(locale: string): Promise<{
  sent: number;
  total: number;
  results: { ok: boolean; status: number | null; host: string; error: string | null }[];
}> {
  const { res, json } = await post({ action: "push_test", locale });
  if (!res.ok) throw new Error(json.error?.toString() ?? "Test failed");
  return json as never;
}
