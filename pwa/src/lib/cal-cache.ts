"use client";

import { bondPost, type CalDay, type YearMonth } from "@/lib/bond";

/** Calendar payloads cached per user + plan + month (memory + localStorage), with retries.
 *  The engine's month is deterministic for a chart, so a cached copy is shown instantly and
 *  refreshed in the background; it is only reused while its "today" is still today. */
export type MonthResp = { locked: boolean; month: string; today: string; zone?: string; days: CalDay[]; approximate: boolean };
export type YearResp = { locked: boolean; from: string; months: YearMonth[]; approximate: boolean };

const PREFIX = "muhurta.cal.v1.";
const mem = new Map<string, { at: number; v: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_AGE_MS = 12 * 60 * 60_000;

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function key(uid: string | null | undefined, pro: boolean, what: string) {
  return `${PREFIX}${uid ?? "anon"}.${pro ? "pro" : "free"}.${what}`;
}

function read<T>(k: string): T | null {
  let e = mem.get(k) ?? null;
  if (!e && typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(k);
      if (raw) e = JSON.parse(raw) as { at: number; v: unknown };
    } catch {
      e = null;
    }
  }
  if (!e || Date.now() - e.at > MAX_AGE_MS) return null;
  const v = e.v as { today?: string; from?: string };
  // A month payload is tied to the day it was made (free = today + tomorrow; "today" highlight).
  if (v.today && v.today !== localToday()) return null;
  mem.set(k, e);
  return e.v as T;
}

function write(k: string, v: unknown) {
  const e = { at: Date.now(), v };
  mem.set(k, e);
  try {
    window.localStorage.setItem(k, JSON.stringify(e));
  } catch {
    /* storage full / private mode */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST with a per-try timeout and two quick retries on transient failures (5xx, network, timeout). */
async function postRetry<T>(action: string, extra: Record<string, unknown>): Promise<T> {
  const waits = [700, 1800];
  for (let i = 0; ; i++) {
    try {
      return await Promise.race([
        bondPost<T>(action, extra),
        sleep(15_000).then(() => {
          throw Object.assign(new Error("timeout"), { code: "timeout" });
        }),
      ]);
    } catch (e) {
      const code = String((e as { code?: string }).code ?? "");
      const status = Number((e as { status?: number }).status ?? 0);
      const transient = code === "timeout" || code === "engine_unavailable" || status >= 500 || status === 0 || code.startsWith("http_5");
      if (!transient || i >= waits.length) throw e;
      await sleep(waits[i]);
    }
  }
}

function load<T>(k: string, action: string, extra: Record<string, unknown>): Promise<T> {
  const running = inflight.get(k) as Promise<T> | undefined;
  if (running) return running;
  const p = postRetry<T>(action, extra)
    .then((v) => {
      write(k, v);
      return v;
    })
    .finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}

/** month = null means "the current month" (cached under "current"). */
export function cachedMonth(uid: string | null | undefined, pro: boolean, month: string | null): MonthResp | null {
  return read<MonthResp>(key(uid, pro, `m.${month ?? "current"}`));
}

export function fetchMonth(uid: string | null | undefined, pro: boolean, month: string | null): Promise<MonthResp> {
  const k = key(uid, pro, `m.${month ?? "current"}`);
  return load<MonthResp>(k, "calendar_month_get", month ? { month } : {}).then((r) => {
    // Also file the current month under its real key so month navigation hits the cache.
    if (!month) write(key(uid, pro, `m.${r.month}`), r);
    return r;
  });
}

export function cachedYear(uid: string | null | undefined, pro: boolean): YearResp | null {
  return read<YearResp>(key(uid, pro, "y"));
}

export function fetchYear(uid: string | null | undefined, pro: boolean): Promise<YearResp> {
  return load<YearResp>(key(uid, pro, "y"), "calendar_year_get", {});
}

/** Warm the Calendar while the user reads Decode / Today, so its first open is instant. */
export function prefetchCalendar(uid: string | null | undefined, pro: boolean) {
  if (!uid || cachedMonth(uid, pro, null)) return;
  void fetchMonth(uid, pro, null).catch(() => {});
}
