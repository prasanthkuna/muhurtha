/**
 * Web Push (RFC 8030/8291/8292) for the Muhurta PWA.
 * - Subscriptions live in public.push_subscriptions (service-role access only).
 * - pg_cron calls `push_dispatch` every 5 minutes; due alerts are computed live from the
 *   subscriber's saved city (sunrise-based windows), so delivery never depends on app opens.
 * - Every attempt is logged in public.push_deliveries (unique per subscription + key).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import * as webpush from "jsr:@negrel/webpush@0.3";
import { divideDaylight, goodAndCautionWindows, sunriseSunset } from "./solar.ts";

export type PushLocale = "en" | "te" | "hi";
export type PushKind =
  | "test"
  | "daily_brief"
  | "good_window"
  | "rahu_heads_up"
  | "chapter_change"
  | "child_milestone"
  | "friend_birthday"
  | "weekly_outlook"
  | "reading_ready"
  | "bond_month_ready"
  | "bond_heads_up";
export type PushPrefs = {
  daily: boolean;
  good: boolean;
  rahu: boolean;
  chapter: boolean;
  child: boolean;
  friends: boolean;
  weekly: boolean;
  /** Bond: monthly couple guide + day-before heads-up for key couple days */
  bond: boolean;
};

export const DEFAULT_PUSH_PREFS: PushPrefs = {
  daily: true,
  good: true,
  rahu: true,
  chapter: true,
  child: true,
  friends: false,
  weekly: false,
  bond: true,
};

/** Chart-specific moments come from engine.ts (injected by index.ts to avoid an import cycle). */
export type ChartMomentsFn = (
  admin: SupabaseClient,
  ownerProfileId: string,
  tz: string,
  dateStr: string,
  locale: string | null,
  prefs: { chapter: boolean; child: boolean; friends: boolean },
  goodWindowText: string,
) => Promise<
  { key: string; kind: "chapter_change" | "child_milestone" | "friend_birthday"; title: string; body: string; url: string; image: string }[]
>;

/** Bond heads-up for tomorrow (engine.ts / bond.ts, injected like chart moments). */
export type BondMomentsFn = (
  admin: SupabaseClient,
  profileId: string,
  tz: string,
  dateStr: string,
  locale: string | null,
) => Promise<{ key: string; title: string; body: string; url: string }[]>;
const BOND_LOCAL = "19:30";

// Spam-safety rules (Chrome's on-device classifier and plain good manners):
/** No scheduled alert in the first hour after someone turns notifications on. */
const NEW_SUBSCRIPTION_GRACE_MS = 60 * 60 * 1000;
/** Local quiet hours: nothing between 21:30 and 06:30. */
const QUIET_START = "21:30";
const QUIET_END = "06:30";
/** Never more than this many scheduled alerts per local day per device. */
const DAILY_CAP = 4;
/** A good-window alert this soon after the brief repeats it; skip. */
const BRIEF_OVERLAP_MS = 45 * 60 * 1000;
const CHART_MOMENT_LOCAL = "09:00";
const WEEKLY_LOCAL = "19:00";
/** Lower number = more important when the cap bites. */
const KIND_PRIORITY: Record<PushKind, number> = {
  test: 0,
  daily_brief: 1,
  chapter_change: 2,
  child_milestone: 2,
  friend_birthday: 3,
  rahu_heads_up: 4,
  good_window: 5,
  weekly_outlook: 6,
  reading_ready: 0,
  bond_month_ready: 0,
  bond_heads_up: 3,
};
const DAILY_BRIEF_LOCAL = "06:45";
const LEAD_MINUTES = 10;
/** Cron runs every 5 min; anything due in the last 12 min and not yet sent goes out. */
const DUE_LOOKBACK_MS = 12 * 60 * 1000;
const MAX_FAILURES = 5;

export type SubscriptionRow = {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  locale: string | null;
  timezone: string | null;
  prefs: Partial<PushPrefs> | null;
  failure_count: number | null;
  created_at?: string | null;
};

export type NotificationPayload = {
  title: string;
  body: string;
  icon: string;
  badge: string;
  image?: string;
  tag: string;
  renotify: boolean;
  url: string;
  lang: PushLocale;
  timestamp: number;
  actions: { action: string; title: string; url: string }[];
  kind: PushKind;
};

export type SendResult = {
  subscriptionId: string;
  ok: boolean;
  status: number | null;
  gone: boolean;
  error?: string;
  host: string;
};

function b64urlToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function vapidJson(): webpush.ExportedVapidKeys | null {
  const raw = Deno.env.get("VAPID_KEYS_JSON") ?? "";
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as webpush.ExportedVapidKeys;
    return parsed?.publicKey?.x && parsed?.privateKey?.d ? parsed : null;
  } catch {
    return null;
  }
}

export function pushConfigured(): boolean {
  return vapidJson() !== null;
}

/** Uncompressed P-256 point (base64url) for PushManager.subscribe({applicationServerKey}). */
export function vapidPublicKey(): string | null {
  const keys = vapidJson();
  if (!keys?.publicKey.x || !keys.publicKey.y) return null;
  const x = b64urlToBytes(keys.publicKey.x);
  const y = b64urlToBytes(keys.publicKey.y);
  const out = new Uint8Array(65);
  out[0] = 4;
  out.set(x, 1);
  out.set(y, 33);
  return bytesToB64url(out);
}

let appServerPromise: Promise<webpush.ApplicationServer> | null = null;
function appServer(): Promise<webpush.ApplicationServer> {
  if (!appServerPromise) {
    const keys = vapidJson();
    if (!keys) throw new Error("VAPID keys are not configured");
    appServerPromise = (async () =>
      await webpush.ApplicationServer.new({
        contactInformation: Deno.env.get("VAPID_SUBJECT") ?? "https://pwa-lyart-phi.vercel.app",
        vapidKeys: await webpush.importVapidKeys(keys, { extractable: false }),
      }))();
    appServerPromise.catch(() => {
      appServerPromise = null;
    });
  }
  return appServerPromise;
}

// The library throws on non-2xx but doesn't return the status; remember it per endpoint.
const lastStatus = new Map<string, number>();
const baseFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const res = await baseFetch(input, init);
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (init?.method === "POST" && lastStatus.has(url)) lastStatus.set(url, res.status);
  return res;
}) as typeof fetch;

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "invalid";
  }
}

export async function sendToSubscription(
  sub: Pick<SubscriptionRow, "id" | "endpoint" | "p256dh" | "auth">,
  payload: NotificationPayload,
  opts: { ttl: number; urgency: "high" | "normal" | "low"; topic?: string },
): Promise<SendResult> {
  const host = endpointHost(sub.endpoint);
  lastStatus.set(sub.endpoint, 0);
  try {
    const server = await appServer();
    const subscriber = server.subscribe({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    });
    await subscriber.pushTextMessage(JSON.stringify(payload), {
      ttl: opts.ttl,
      urgency: opts.urgency === "high"
        ? webpush.Urgency.High
        : opts.urgency === "low"
        ? webpush.Urgency.Low
        : webpush.Urgency.Normal,
      // Topic: max 32 url-safe chars; collapses an undelivered older alert of the same kind.
      topic: opts.topic?.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined,
    });
    const status = lastStatus.get(sub.endpoint) || 201;
    return { subscriptionId: sub.id, ok: true, status, gone: false, host };
  } catch (e) {
    if (e instanceof webpush.PushMessageError) {
      const status = e.response.status;
      const text = await e.response.text().catch(() => "");
      return {
        subscriptionId: sub.id,
        ok: false,
        status,
        gone: status === 404 || status === 410,
        error: `${status} ${text}`.slice(0, 300),
        host,
      };
    }
    return {
      subscriptionId: sub.id,
      ok: false,
      status: lastStatus.get(sub.endpoint) || null,
      gone: false,
      error: (e instanceof Error ? e.message : String(e)).slice(0, 300),
      host,
    };
  } finally {
    lastStatus.delete(sub.endpoint);
  }
}

function loc(raw: string | null | undefined): PushLocale {
  return raw === "te" || raw === "hi" ? raw : "en";
}

const COPY = {
  en: {
    testTitle: "Test notification you requested",
    testBody: "Muhūrta alerts are working on this phone. Your daily brief arrives at 6:45 AM.",
    dailyTitle: "Your day in Muhūrta",
    dailyBody: (good: string, rahu: string) =>
      `Good window ${good}. Rahu Kalam ${rahu}.`,
    goodTitle: (t: string) => `Good window from ${t}`,
    goodBody: (range: string) => `${range} is today's supportive window.`,
    rahuTitle: (t: string) => `Rahu Kalam from ${t}`,
    rahuBody: (range: string) => `${range}. A lighter hour for routine work.`,
    weeklyTitle: "Your week ahead",
    weeklyBody: (rahuLine: string) => `Good windows and Rahu Kalam for each day are ready. Monday's Rahu Kalam: ${rahuLine}.`,
    openToday: "Open today",
    openTiming: "Check timing",
  },
  te: {
    testTitle: "మీరు అడిగిన టెస్ట్ నోటిఫికేషన్",
    testBody: "ఈ ఫోన్‌లో ముహూర్త అలర్ట్‌లు పనిచేస్తున్నాయి. రోజువారీ సారాంశం ఉదయం 6:45కి వస్తుంది.",
    dailyTitle: "ముహూర్తలో మీ రోజు",
    dailyBody: (good: string, rahu: string) =>
      `మంచి సమయం ${good}. రాహుకాలం ${rahu}.`,
    goodTitle: (t: string) => `${t} నుండి మంచి సమయం`,
    goodBody: (range: string) => `${range} ఈ రోజు అనుకూల సమయం.`,
    rahuTitle: (t: string) => `${t} నుండి రాహుకాలం`,
    rahuBody: (range: string) => `${range}. సాధారణ పనులకు తేలికైన సమయం.`,
    weeklyTitle: "మీ వచ్చే వారం",
    weeklyBody: (rahuLine: string) => `ప్రతి రోజు మంచి సమయాలు, రాహుకాలం సిద్ధంగా ఉన్నాయి. సోమవారం రాహుకాలం: ${rahuLine}.`,
    openToday: "ఈ రోజు చూడండి",
    openTiming: "సమయం చూడండి",
  },
  hi: {
    testTitle: "आपकी माँगी हुई टेस्ट सूचना",
    testBody: "इस फ़ोन पर मुहूर्त अलर्ट काम कर रहे हैं। रोज़ का सार सुबह 6:45 बजे आएगा।",
    dailyTitle: "मुहूर्त में आपका दिन",
    dailyBody: (good: string, rahu: string) =>
      `शुभ समय ${good}। राहुकाल ${rahu}।`,
    goodTitle: (t: string) => `${t} से शुभ समय`,
    goodBody: (range: string) => `${range} आज का अनुकूल समय है।`,
    rahuTitle: (t: string) => `${t} से राहुकाल`,
    rahuBody: (range: string) => `${range}। रोज़मर्रा के कामों के लिए हल्का समय।`,
    weeklyTitle: "आपका आने वाला हफ़्ता",
    weeklyBody: (rahuLine: string) => `हर दिन के शुभ समय और राहुकाल तैयार हैं। सोमवार का राहुकाल: ${rahuLine}।`,
    openToday: "आज देखें",
    openTiming: "समय देखें",
  },
} as const;

function basePayload(kind: PushKind, l: PushLocale, tag: string): Omit<NotificationPayload, "title" | "body" | "url" | "actions"> {
  return {
    kind,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag,
    renotify: kind !== "daily_brief",
    lang: l,
    timestamp: Date.now(),
  };
}

export function testPayload(localeRaw: string | null | undefined): NotificationPayload {
  const l = loc(localeRaw);
  const c = COPY[l];
  return {
    ...basePayload("test", l, "muh-test"),
    renotify: true,
    title: c.testTitle,
    body: c.testBody,
    image: "/notifications/daily.png",
    url: "/today?src=push_test",
    actions: [
      { action: "today", title: c.openToday, url: "/today?src=push_test" },
      { action: "timing", title: c.openTiming, url: "/timing?src=push_test" },
    ],
  };
}

type DueEvent = { key: string; at: number; payload: NotificationPayload; urgency: "high" | "normal"; ttl: number };

function clock12(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
}

function fmtRange(a: string, b: string): string {
  return `${clock12(a)} – ${clock12(b)}`;
}

/** Today's alerts for one subscriber, from their saved city (same math as the Today screen). */
export function eventsForDay(
  dateStr: string,
  tz: string,
  lat: number,
  lng: number,
  localeRaw: string | null | undefined,
  prefs: PushPrefs,
): DueEvent[] {
  const l = loc(localeRaw);
  const c = COPY[l];
  const noon = DateTime.fromISO(dateStr, { zone: tz }).set({ hour: 12 }).toJSDate();
  const sun = sunriseSunset(noon, lat, lng);
  if (!Number.isFinite(sun.sunrise.getTime()) || !Number.isFinite(sun.sunset.getTime())) return [];
  const weekday = DateTime.fromISO(dateStr, { zone: tz }).weekday % 7;
  const { good, caution } = goodAndCautionWindows(divideDaylight(sun, weekday), tz);
  const rahu = caution.find((w) => w.label === "Rahu Kalam");
  const at = (hhmm: string) => DateTime.fromISO(`${dateStr}T${hhmm}`, { zone: tz }).toMillis();
  const out: DueEvent[] = [];

  if (prefs.daily && good[0]) {
    const goodTxt = good.slice(0, 2).map((w) => fmtRange(w.start, w.end)).join(", ");
    const rahuTxt = rahu ? fmtRange(rahu.start, rahu.end) : "—";
    out.push({
      key: `daily:${dateStr}`,
      at: at(DAILY_BRIEF_LOCAL),
      urgency: "normal",
      ttl: 3 * 60 * 60,
      payload: {
        ...basePayload("daily_brief", l, `muh-daily-${dateStr}`),
        title: c.dailyTitle,
        body: c.dailyBody(goodTxt, rahuTxt),
        image: "/notifications/daily.png",
        url: "/today?src=push_daily",
        actions: [
          { action: "today", title: c.openToday, url: "/today?src=push_daily" },
          { action: "timing", title: c.openTiming, url: "/timing?src=push_daily" },
        ],
      },
    });
  }
  if (prefs.good) {
    for (const w of good.slice(0, 2)) {
      out.push({
        key: `good:${dateStr}:${w.start}`,
        at: at(w.start) - LEAD_MINUTES * 60_000,
        urgency: "high",
        ttl: LEAD_MINUTES * 60 + 300,
        payload: {
          ...basePayload("good_window", l, `muh-good-${dateStr}`),
          title: c.goodTitle(clock12(w.start)),
          body: c.goodBody(fmtRange(w.start, w.end)),
          image: "/notifications/good.png",
          url: "/timing?src=push_good",
          actions: [
            { action: "timing", title: c.openTiming, url: "/timing?src=push_good" },
            { action: "today", title: c.openToday, url: "/today?src=push_good" },
          ],
        },
      });
    }
  }
  if (prefs.rahu && rahu) {
    out.push({
      key: `rahu:${dateStr}:${rahu.start}`,
      at: at(rahu.start) - LEAD_MINUTES * 60_000,
      urgency: "high",
      ttl: LEAD_MINUTES * 60 + 300,
      payload: {
        ...basePayload("rahu_heads_up", l, `muh-rahu-${dateStr}`),
        title: c.rahuTitle(clock12(rahu.start)),
        body: c.rahuBody(fmtRange(rahu.start, rahu.end)),
        image: "/notifications/rahu.png",
        url: "/today?src=push_rahu",
        actions: [{ action: "today", title: c.openToday, url: "/today?src=push_rahu" }],
      },
    });
  }
  return out;
}

export function normalizePrefs(raw: unknown): PushPrefs {
  const p = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const flag = (k: keyof PushPrefs) => (typeof p[k] === "boolean" ? (p[k] as boolean) : DEFAULT_PUSH_PREFS[k]);
  return {
    daily: flag("daily"),
    good: flag("good"),
    rahu: flag("rahu"),
    chapter: flag("chapter"),
    child: flag("child"),
    friends: flag("friends"),
    weekly: flag("weekly"),
    bond: flag("bond"),
  };
}

function firstGoodWindowText(dateStr: string, tz: string, lat: number, lng: number): string {
  const day = DateTime.fromISO(dateStr, { zone: tz });
  const sun = sunriseSunset(day.set({ hour: 12 }).toJSDate(), lat, lng);
  if (!Number.isFinite(sun.sunrise.getTime())) return "";
  const { good } = goodAndCautionWindows(divideDaylight(sun, day.weekday % 7), tz);
  return good[0] ? fmtRange(good[0].start, good[0].end) : "";
}

function inQuietHours(atMs: number, tz: string): boolean {
  const hm = DateTime.fromMillis(atMs, { zone: tz }).toFormat("HH:mm");
  return hm >= QUIET_START || hm < QUIET_END;
}

/** Sunday-evening outlook (+ Monday's Rahu Kalam so it carries something concrete). */
function weeklyEvent(dateStr: string, tz: string, lat: number, lng: number, l: PushLocale): DueEvent | null {
  const day = DateTime.fromISO(dateStr, { zone: tz });
  if (day.weekday !== 7) return null;
  const monday = day.plus({ days: 1 });
  const sun = sunriseSunset(monday.set({ hour: 12 }).toJSDate(), lat, lng);
  const { caution } = goodAndCautionWindows(divideDaylight(sun, 1), tz);
  const rahu = caution.find((w) => w.label === "Rahu Kalam");
  const c = COPY[l];
  return {
    key: `weekly:${dateStr}`,
    at: DateTime.fromISO(`${dateStr}T${WEEKLY_LOCAL}`, { zone: tz }).toMillis(),
    urgency: "normal",
    ttl: 6 * 60 * 60,
    payload: {
      ...basePayload("weekly_outlook", l, `muh-weekly-${dateStr}`),
      renotify: false,
      title: c.weeklyTitle,
      body: c.weeklyBody(rahu ? fmtRange(rahu.start, rahu.end) : "—"),
      image: "/notifications/daily.png",
      url: "/today?src=push_weekly",
      actions: [{ action: "today", title: c.openToday, url: "/today?src=push_weekly" }],
    },
  };
}

async function recordResult(
  admin: SupabaseClient,
  sub: SubscriptionRow,
  key: string,
  kind: PushKind,
  r: SendResult,
) {
  const now = new Date().toISOString();
  await admin.from("push_deliveries").upsert({
    subscription_id: sub.id,
    profile_id: sub.profile_id,
    notification_key: key,
    kind,
    status_code: r.status,
    ok: r.ok,
    error: r.error ?? null,
    sent_at: now,
  }, { onConflict: "subscription_id,notification_key" });
  if (r.ok) {
    await admin.from("push_subscriptions").update({
      last_success_at: now,
      last_status: r.status,
      last_error: null,
      failure_count: 0,
      updated_at: now,
    }).eq("id", sub.id);
  } else if (r.gone || (sub.failure_count ?? 0) + 1 >= MAX_FAILURES) {
    // 404/410 = the browser dropped this subscription; stop sending to it.
    await admin.from("push_subscriptions").update({
      disabled_at: now,
      last_status: r.status,
      last_error: r.error ?? null,
      failure_count: (sub.failure_count ?? 0) + 1,
      updated_at: now,
    }).eq("id", sub.id);
  } else {
    await admin.from("push_subscriptions").update({
      last_status: r.status,
      last_error: r.error ?? null,
      failure_count: (sub.failure_count ?? 0) + 1,
      updated_at: now,
    }).eq("id", sub.id);
  }
}

export async function sendTestToProfile(
  admin: SupabaseClient,
  profileId: string,
  localeRaw: string | null | undefined,
): Promise<SendResult[]> {
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, profile_id, endpoint, p256dh, auth, locale, timezone, prefs, failure_count")
    .eq("profile_id", profileId)
    .is("disabled_at", null);
  if (error) throw error;
  const subs = (data ?? []) as SubscriptionRow[];
  const results: SendResult[] = [];
  for (const sub of subs) {
    const payload = testPayload(localeRaw ?? sub.locale);
    const r = await sendToSubscription(sub, payload, { ttl: 600, urgency: "high", topic: "muhtest" });
    await recordResult(admin, sub, `test:${Date.now()}`, "test", r);
    results.push(r);
  }
  return results;
}

const READY_COPY: Record<PushLocale, { title: string; body: (who: string | null) => string; open: string }> = {
  en: {
    title: "Your reading is ready",
    body: (who) => who ? `${who}'s reading is ready. Open it to see the chapter and today's timing.` : "Your chapter, today's card and timing are ready. Tap to open.",
    open: "Open reading",
  },
  te: {
    title: "మీ రీడింగ్ సిద్ధం",
    body: (who) => who ? `${who} రీడింగ్ సిద్ధంగా ఉంది. అధ్యాయం, ఈరోజు సమయాలు చూడండి.` : "మీ జీవిత అధ్యాయం, ఈరోజు కార్డ్, మంచి సమయాలు సిద్ధం. తెరవండి.",
    open: "తెరవండి",
  },
  hi: {
    title: "आपकी रीडिंग तैयार है",
    body: (who) => who ? `${who} की रीडिंग तैयार है। अध्याय और आज का समय देखें।` : "आपका जीवन अध्याय, आज का कार्ड और शुभ समय तैयार है। खोलें।",
    open: "खोलें",
  },
};

/** One-off "your reading is ready" alert after a background generation finishes. */
export async function sendReadingReadyToProfile(
  admin: SupabaseClient,
  profileId: string,
  readingId: string,
  localeRaw: string | null | undefined,
  subjectLabel: string | null,
  url = "/today?src=push_ready",
): Promise<SendResult[]> {
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, profile_id, endpoint, p256dh, auth, locale, timezone, prefs, failure_count")
    .eq("profile_id", profileId)
    .is("disabled_at", null);
  if (error) throw error;
  const subs = (data ?? []) as SubscriptionRow[];
  const results: SendResult[] = [];
  const key = `ready:${readingId}`;
  for (const sub of subs) {
    const { data: done } = await admin.from("push_deliveries").select("notification_key")
      .eq("subscription_id", sub.id).eq("notification_key", key).maybeSingle();
    if (done) continue;
    const l = loc(localeRaw ?? sub.locale);
    const c = READY_COPY[l];
    const payload: NotificationPayload = {
      ...basePayload("reading_ready", l, `muh-ready-${readingId.slice(0, 8)}`),
      renotify: true,
      title: c.title,
      body: c.body(subjectLabel),
      image: "/notifications/daily.png",
      url,
      actions: [{ action: "open", title: c.open, url }],
    };
    const r = await sendToSubscription(sub, payload, { ttl: 6 * 60 * 60, urgency: "high", topic: "muhready" });
    await recordResult(admin, sub, key, "reading_ready", r);
    results.push(r);
  }
  return results;
}

/** One-off alert (e.g. "monthly couple guide ready"); once per subscription + key. */
export async function sendOneOffToProfile(
  admin: SupabaseClient,
  profileId: string,
  key: string,
  kind: PushKind,
  build: (l: PushLocale) => { title: string; body: string; url: string; open: string },
  opts: { pref?: keyof PushPrefs; localeRaw?: string | null } = {},
): Promise<SendResult[]> {
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, profile_id, endpoint, p256dh, auth, locale, timezone, prefs, failure_count")
    .eq("profile_id", profileId)
    .is("disabled_at", null);
  if (error) throw error;
  const results: SendResult[] = [];
  for (const sub of (data ?? []) as SubscriptionRow[]) {
    if (opts.pref && !normalizePrefs(sub.prefs)[opts.pref]) continue;
    const tz = sub.timezone || "Asia/Kolkata";
    if (inQuietHours(Date.now(), tz)) continue;
    const { data: done } = await admin.from("push_deliveries").select("notification_key")
      .eq("subscription_id", sub.id).eq("notification_key", key).maybeSingle();
    if (done) continue;
    const l = loc(opts.localeRaw ?? sub.locale);
    const c = build(l);
    const payload: NotificationPayload = {
      ...basePayload(kind, l, `muh-${kind}-${key.slice(-10)}`),
      renotify: true,
      title: c.title,
      body: c.body,
      image: "/notifications/daily.png",
      url: c.url,
      actions: [{ action: "open", title: c.open, url: c.url }],
    };
    const r = await sendToSubscription(sub, payload, { ttl: 12 * 60 * 60, urgency: "normal", topic: kind.replace(/_/g, "") });
    await recordResult(admin, sub, key, kind, r);
    results.push(r);
  }
  return results;
}

/** Cron entry point: send every alert that became due since the last run, once. */
export async function dispatchDuePush(
  admin: SupabaseClient,
  nowMs = Date.now(),
  chartMoments?: ChartMomentsFn,
  bondMoments?: BondMomentsFn,
) {
  const { data, error } = await admin
    .from("push_subscriptions")
    .select(
      "id, profile_id, endpoint, p256dh, auth, locale, timezone, prefs, failure_count, created_at, profiles!inner(current_timezone, current_lat, current_lng)",
    )
    .is("disabled_at", null)
    .limit(2000);
  if (error) throw error;
  type Row = SubscriptionRow & {
    profiles: { current_timezone: string | null; current_lat: number | null; current_lng: number | null } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  let considered = 0;
  let sent = 0;
  let failed = 0;
  let suppressed = 0;
  const momentsCache = new Map<string, Awaited<ReturnType<ChartMomentsFn>>>();
  const isDue = (at: number) => at <= nowMs && nowMs - at <= DUE_LOOKBACK_MS;

  for (const sub of rows) {
    const p = sub.profiles;
    const tz = p?.current_timezone || sub.timezone || "Asia/Kolkata";
    const lat = p?.current_lat != null ? Number(p.current_lat) : 17.385;
    const lng = p?.current_lng != null ? Number(p.current_lng) : 78.4867;
    const dateStr = DateTime.fromMillis(nowMs, { zone: tz }).toISODate();
    if (!dateStr) continue;
    const prefs = normalizePrefs(sub.prefs);
    const l = loc(sub.locale);
    const all = eventsForDay(dateStr, tz, lat, lng, sub.locale, prefs);
    const brief = all.find((e) => e.payload.kind === "daily_brief");
    let due = all.filter((e) => isDue(e.at));
    // The brief already lists the first good window; don't repeat it within 45 min.
    if (brief) {
      due = due.filter((e) => !(e.payload.kind === "good_window" && e.at - brief.at < BRIEF_OVERLAP_MS));
    }

    if (prefs.weekly) {
      const wk = weeklyEvent(dateStr, tz, lat, lng, l);
      if (wk && isDue(wk.at)) due.push(wk);
    }

    const momentAt = DateTime.fromISO(`${dateStr}T${CHART_MOMENT_LOCAL}`, { zone: tz }).toMillis();
    if (chartMoments && isDue(momentAt) && (prefs.chapter || prefs.child || prefs.friends)) {
      const cacheKey = `${sub.profile_id}:${dateStr}:${l}`;
      let moments = momentsCache.get(cacheKey);
      if (!moments) {
        const goodTxt = firstGoodWindowText(dateStr, tz, lat, lng);
        moments = await chartMoments(admin, sub.profile_id, tz, dateStr, l, prefs, goodTxt).catch((e) => {
          console.warn("[push_dispatch] chart moments failed", e instanceof Error ? e.message : e);
          return [];
        });
        momentsCache.set(cacheKey, moments);
      }
      for (const m of moments) {
        due.push({
          key: m.key,
          at: momentAt,
          urgency: "normal",
          ttl: 8 * 60 * 60,
          payload: {
            ...basePayload(m.kind, l, `muh-${m.kind}-${m.key.split(":")[1] ?? dateStr}`),
            renotify: false,
            title: m.title,
            body: m.body,
            image: m.image,
            url: m.url,
            actions: [{ action: "open", title: COPY[l].openToday, url: m.url }],
          },
        });
      }
    }
    const bondAt = DateTime.fromISO(`${dateStr}T${BOND_LOCAL}`, { zone: tz }).toMillis();
    if (bondMoments && prefs.bond && isDue(bondAt)) {
      const ms = await bondMoments(admin, sub.profile_id, tz, dateStr, l).catch((e) => {
        console.warn("[push_dispatch] bond moments failed", e instanceof Error ? e.message : e);
        return [];
      });
      for (const m of ms) {
        due.push({
          key: m.key,
          at: bondAt,
          urgency: "normal",
          ttl: 3 * 60 * 60,
          payload: {
            ...basePayload("bond_heads_up", l, `muh-bond-${dateStr}`),
            renotify: false,
            title: m.title,
            body: m.body,
            image: "/notifications/daily.png",
            url: m.url,
            actions: [{ action: "open", title: COPY[l].openToday, url: m.url }],
          },
        });
      }
    }
    if (!due.length) continue;

    // New subscribers get a quiet first hour (only the test they asked for).
    const createdMs = sub.created_at ? Date.parse(sub.created_at) : 0;
    if (createdMs && nowMs - createdMs < NEW_SUBSCRIPTION_GRACE_MS) {
      suppressed += due.length;
      continue;
    }
    due = due.filter((e) => {
      if (inQuietHours(e.at, tz)) {
        suppressed++;
        return false;
      }
      return true;
    });
    if (!due.length) continue;

    const { data: done } = await admin
      .from("push_deliveries")
      .select("notification_key")
      .eq("subscription_id", sub.id)
      .in("notification_key", due.map((e) => e.key));
    const doneKeys = new Set(((done ?? []) as { notification_key: string }[]).map((d) => d.notification_key));
    due = due.filter((e) => !doneKeys.has(e.key));
    if (!due.length) continue;

    const dayStartIso = DateTime.fromMillis(nowMs, { zone: tz }).startOf("day").toUTC().toISO();
    const { count: sentToday } = await admin
      .from("push_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("subscription_id", sub.id)
      .eq("ok", true)
      .neq("kind", "test")
      .gte("sent_at", dayStartIso ?? new Date(nowMs - 86400_000).toISOString());
    let budget = Math.max(0, DAILY_CAP - (sentToday ?? 0));
    due.sort((a, b) => KIND_PRIORITY[a.payload.kind] - KIND_PRIORITY[b.payload.kind]);

    for (const ev of due) {
      if (budget <= 0) {
        suppressed++;
        continue;
      }
      considered++;
      const r = await sendToSubscription(sub, ev.payload, {
        ttl: ev.ttl,
        urgency: ev.urgency,
        topic: ev.payload.kind,
      });
      await recordResult(admin, sub, ev.key, ev.payload.kind, r);
      if (r.ok) {
        sent++;
        budget--;
      } else failed++;
      if (r.gone) break;
    }
  }
  return { subscriptions: rows.length, considered, sent, failed, suppressed, at: new Date(nowMs).toISOString() };
}
