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
export type PushKind = "test" | "daily_brief" | "good_window" | "rahu_heads_up";
export type PushPrefs = { daily: boolean; good: boolean; rahu: boolean };

export const DEFAULT_PUSH_PREFS: PushPrefs = { daily: true, good: true, rahu: true };
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
    testTitle: "Muhurta notifications are on",
    testBody: "This is how your daily brief and window alerts will look.",
    dailyTitle: "Today's muhurta brief",
    dailyBody: (good: string, rahu: string) =>
      `Best window ${good}. Rahu Kalam ${rahu}; keep new starts out of it.`,
    goodTitle: (t: string) => `Good window opens at ${t}`,
    goodBody: (range: string) => `${range} is today's supportive window. Line up the one thing that matters.`,
    rahuTitle: (t: string) => `Rahu Kalam starts at ${t}`,
    rahuBody: (range: string) => `${range}: go lighter, avoid fresh starts and signatures.`,
    openToday: "Open today",
    openTiming: "Check timing",
  },
  te: {
    testTitle: "ముహూర్త నోటిఫికేషన్లు ఆన్ అయ్యాయి",
    testBody: "రోజువారీ సారాంశం, మంచి సమయ హెచ్చరికలు ఇలా కనిపిస్తాయి.",
    dailyTitle: "ఈ రోజు ముహూర్త సారాంశం",
    dailyBody: (good: string, rahu: string) =>
      `మంచి సమయం ${good}. రాహుకాలం ${rahu}; ఆ సమయంలో కొత్త పనులు మొదలు పెట్టకండి.`,
    goodTitle: (t: string) => `${t}కి మంచి సమయం మొదలవుతుంది`,
    goodBody: (range: string) => `${range} ఈ రోజు అనుకూల సమయం. ముఖ్యమైన పనిని సిద్ధం చేసుకోండి.`,
    rahuTitle: (t: string) => `${t}కి రాహుకాలం మొదలవుతుంది`,
    rahuBody: (range: string) => `${range}: తేలికగా ఉండండి; కొత్త ప్రారంభాలు, సంతకాలు వద్దు.`,
    openToday: "ఈ రోజు చూడండి",
    openTiming: "సమయం చూడండి",
  },
  hi: {
    testTitle: "मुहूर्त सूचनाएँ चालू हैं",
    testBody: "रोज़ का सार और शुभ समय की सूचनाएँ ऐसी दिखेंगी।",
    dailyTitle: "आज का मुहूर्त सार",
    dailyBody: (good: string, rahu: string) =>
      `शुभ समय ${good}. राहुकाल ${rahu}; उसमें नई शुरुआत न करें।`,
    goodTitle: (t: string) => `${t} बजे शुभ समय शुरू`,
    goodBody: (range: string) => `${range} आज का अनुकूल समय है। सबसे ज़रूरी काम तैयार रखें।`,
    rahuTitle: (t: string) => `${t} बजे राहुकाल शुरू`,
    rahuBody: (range: string) => `${range}: हल्का रहें; नई शुरुआत और हस्ताक्षर टालें।`,
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

function fmtRange(a: string, b: string): string {
  return `${a}–${b}`;
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
          title: c.goodTitle(w.start),
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
        title: c.rahuTitle(rahu.start),
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
  return {
    daily: p.daily !== false,
    good: p.good !== false,
    rahu: p.rahu !== false,
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

/** Cron entry point: send every alert that became due since the last run, once. */
export async function dispatchDuePush(admin: SupabaseClient, nowMs = Date.now()) {
  const { data, error } = await admin
    .from("push_subscriptions")
    .select(
      "id, profile_id, endpoint, p256dh, auth, locale, timezone, prefs, failure_count, profiles!inner(current_timezone, current_lat, current_lng)",
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
  for (const sub of rows) {
    const p = sub.profiles;
    const tz = p?.current_timezone || sub.timezone || "Asia/Kolkata";
    const lat = p?.current_lat != null ? Number(p.current_lat) : 17.385;
    const lng = p?.current_lng != null ? Number(p.current_lng) : 78.4867;
    const dateStr = DateTime.fromMillis(nowMs, { zone: tz }).toISODate();
    if (!dateStr) continue;
    const due = eventsForDay(dateStr, tz, lat, lng, sub.locale, normalizePrefs(sub.prefs))
      .filter((e) => e.at <= nowMs && nowMs - e.at <= DUE_LOOKBACK_MS);
    if (!due.length) continue;
    const { data: done } = await admin
      .from("push_deliveries")
      .select("notification_key")
      .eq("subscription_id", sub.id)
      .in("notification_key", due.map((e) => e.key));
    const doneKeys = new Set(((done ?? []) as { notification_key: string }[]).map((d) => d.notification_key));
    for (const ev of due) {
      if (doneKeys.has(ev.key)) continue;
      considered++;
      const r = await sendToSubscription(sub, ev.payload, {
        ttl: ev.ttl,
        urgency: ev.urgency,
        topic: ev.payload.kind,
      });
      await recordResult(admin, sub, ev.key, ev.payload.kind, r);
      if (r.ok) sent++;
      else failed++;
      if (r.gone) break;
    }
  }
  return { subscriptions: rows.length, considered, sent, failed, at: new Date(nowMs).toISOString() };
}
