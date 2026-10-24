/**
 * Bond (partner match + monthly couple guide), couple streaks and the Tuning Calendar actions.
 * - Free: the guna total out of 36 + band (zero LLM) and today/tomorrow on the calendar.
 * - Pro (or linked to a Pro partner): full koota breakdown, Kuja check, love styles, monthly
 *   couple guide, couple streak, full month + year calendar.
 * - LLM text: one background call per (viewer, partner, language) for the match and per month
 *   for the guide, cached in pair_readings; the engine owns every fact.
 * Every write goes through the service-role client; reads are re-checked against membership.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import {
  BOND_SCHEMA_VERSION,
  type BondLocale,
  type BondPerson,
  clipBond,
  factsPrompt,
  MATCH_PROMPT_VERSION,
  matchFacts,
  type MatchFacts,
  matchSchema,
  matchSystemPrompt,
  MONTH_PROMPT_VERSION,
  monthFacts,
  type MonthFacts,
  monthSchema,
  monthSystemPrompt,
  placeFor,
  validateBond,
} from "./bond_core.ts";
import { ashtakoota, type MoonStar, starFromLon } from "./koota.ts";
import { natalGrahas } from "./grahas.ts";
import { moonSiderealLongitudeDeg, siderealMetaFromNameOrMoon } from "./ephemeris.ts";
import { type CalPlace, coupleDayType, dayFacts, monthDays, scoreDay, yearMonths } from "./calendar.ts";
import { costUsd, createResponse, readingModel, type ResponseObject, retrieveResponse } from "./openai_responses.ts";
import { sendOneOffToProfile } from "./push.ts";
import { BOND_PUSH, bondLoc } from "./bond_phrases.ts";
import { type MdSegment, NAKSHATRAS, vimshottariLordsAt } from "./vimshottari.ts";

export class BondError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
    this.name = "ActionError";
  }
}

export type BioLite = {
  id: string;
  profile_id: string;
  date_of_birth: string;
  birth_place: string | null;
  birth_input_mode: string;
  exact_birth_time: string | null;
  time_bucket: string | null;
  janma_nakshatra: string | null;
  nakshatra_pada: number | null;
  birth_timezone: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
};
const BIO_COLS =
  "id, profile_id, date_of_birth, birth_place, birth_input_mode, exact_birth_time, time_bucket, janma_nakshatra, nakshatra_pada, birth_timezone, birth_lat, birth_lng";

export type ProfLite = {
  id: string;
  display_name: string | null;
  language_code: string | null;
  current_timezone: string | null;
  current_lat: number | null;
  current_lng: number | null;
};
const PROF_COLS = "id, display_name, language_code, current_timezone, current_lat, current_lng";

export type LinkRow = {
  id: string;
  owner_profile_id: string;
  owner_birth_input_id: string | null;
  partner_birth_input_id: string | null;
  partner_profile_id: string | null;
  partner_name: string;
  relationship_kind: string;
  status: "details_only" | "invited" | "linked" | "unlinked";
  invite_token_hash: string | null;
  invite_expires_at: string | null;
  consent_confirmed_at: string;
  linked_at: string | null;
  created_at: string;
};

export type PairRow = {
  id: string;
  link_id: string;
  pair_key: string;
  kind: "match" | "bond_month";
  period_key: string;
  locale: BondLocale;
  schema_version: number;
  status: "generating" | "ready" | "failed" | "superseded";
  facts: MatchFacts | MonthFacts | null;
  content: Record<string, unknown> | null;
  validation: unknown;
  model: string | null;
  openai_response_id: string | null;
  attempts: number;
  input_tokens: number;
  cached_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cost_usd: number;
  error: string | null;
  started_at: string | null;
  last_polled_at: string | null;
  claimed_until: string | null;
  requested_by: string | null;
  ready_at: string | null;
  notified_at: string | null;
  created_at: string;
};

/** Engine helpers injected by engine.ts (keeps this module free of an import cycle). */
export type BondDeps = {
  isPro: (profileId: string) => Promise<boolean>;
  segmentsFor: (bi: BioLite, tz: string) => MdSegment[];
};

const DEFAULT_ZONE = "Asia/Kolkata";
const DEFAULT_LAT = 17.385;
const DEFAULT_LNG = 78.4867;
const MAX_ATTEMPTS = 2;
const POLL_DEBOUNCE_MS = 2500;
const CLAIM_MS = 120_000;
const JOB_TIMEOUT_MS = 6 * 60_000;
const INVITE_DAYS = 14;

// ------------------------------------------------------------------ small helpers

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const firstName = (s: string | null | undefined, fallback: string) => (String(s ?? "").trim().split(/\s+/)[0] || fallback).slice(0, 24);

function bioHash(bi: BioLite): Promise<string> {
  const n = (v: unknown) => (v == null || v === "" ? "" : Number(v).toFixed(4));
  return sha256Hex([
    bi.date_of_birth, bi.exact_birth_time ?? "", bi.time_bucket ?? "", (bi.janma_nakshatra ?? "").toLowerCase(),
    bi.nakshatra_pada ?? "", n(bi.birth_lat), n(bi.birth_lng), bi.birth_timezone ?? "",
  ].join("|"));
}

function locOf(raw: unknown): BondLocale {
  return raw === "te" || raw === "hi" ? raw : "en";
}

function exactUtc(bi: BioLite, zone: string): Date | null {
  if (!bi.exact_birth_time) return null;
  let t = String(bi.exact_birth_time).trim();
  if (/^\d{1,2}:\d{2}$/.test(t)) t += ":00";
  const dt = DateTime.fromISO(`${String(bi.date_of_birth).slice(0, 10)}T${t}`, { zone });
  return dt.isValid ? dt.toUTC().toJSDate() : null;
}

export function personFrom(bi: BioLite, name: string, base: Omit<CalPlace, "natalNakshatra" | "natalRashi">): BondPerson {
  const zone = bi.birth_timezone ?? base.zone ?? DEFAULT_ZONE;
  const exact = exactUtc(bi, zone);
  const noon = DateTime.fromISO(`${String(bi.date_of_birth).slice(0, 10)}T12:00:00`, { zone }).toUTC().toJSDate();
  const meta = siderealMetaFromNameOrMoon(bi.janma_nakshatra, bi.nakshatra_pada, exact ? moonSiderealLongitudeDeg(exact) : null);
  let star: MoonStar;
  let approx = false;
  if (meta) star = { nak: meta.idx, pada: meta.pada };
  else {
    star = starFromLon(moonSiderealLongitudeDeg(noon));
    approx = true;
  }
  const lat = bi.birth_lat != null ? Number(bi.birth_lat) : null;
  const lng = bi.birth_lng != null ? Number(bi.birth_lng) : null;
  const natal = natalGrahas(exact ?? noon, lat, lng, Boolean(exact) && lat != null && lng != null);
  return { name, star, starApprox: approx, natal, place: placeFor(star, base) };
}

function baseOf(p: ProfLite | null) {
  return {
    zone: p?.current_timezone || DEFAULT_ZONE,
    lat: p?.current_lat != null ? Number(p.current_lat) : DEFAULT_LAT,
    lng: p?.current_lng != null ? Number(p.current_lng) : DEFAULT_LNG,
  };
}

async function loadProfile(admin: SupabaseClient, id: string | null): Promise<ProfLite | null> {
  if (!id) return null;
  const { data } = await admin.from("profiles").select(PROF_COLS).eq("id", id).maybeSingle();
  return (data as ProfLite | null) ?? null;
}

async function ownBirth(admin: SupabaseClient, profileId: string): Promise<BioLite | null> {
  const { data, error } = await admin.from("birth_inputs").select(BIO_COLS).eq("profile_id", profileId)
    .or("source.is.null,source.neq.chart_profile").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as BioLite | null) ?? null;
}

async function birthById(admin: SupabaseClient, id: string | null): Promise<BioLite | null> {
  if (!id) return null;
  const { data } = await admin.from("birth_inputs").select(BIO_COLS).eq("id", id).maybeSingle();
  return (data as BioLite | null) ?? null;
}

export async function activeLinkFor(admin: SupabaseClient, profileId: string): Promise<{ link: LinkRow; role: "owner" | "partner" } | null> {
  const { data: own } = await admin.from("partner_links").select("*").eq("owner_profile_id", profileId).neq("status", "unlinked").maybeSingle();
  if (own) return { link: own as LinkRow, role: "owner" };
  const { data: theirs } = await admin.from("partner_links").select("*").eq("partner_profile_id", profileId).eq("status", "linked").maybeSingle();
  if (theirs) return { link: theirs as LinkRow, role: "partner" };
  return null;
}

export async function hasBondAccess(admin: SupabaseClient, deps: BondDeps, profileId: string): Promise<boolean> {
  if (await deps.isPro(profileId)) return true;
  const found = await activeLinkFor(admin, profileId);
  if (!found || found.link.status !== "linked") return false;
  const other = found.role === "owner" ? found.link.partner_profile_id : found.link.owner_profile_id;
  return other ? await deps.isPro(other) : false;
}

type Pair = {
  link: LinkRow;
  role: "owner" | "partner";
  viewer: BondPerson;
  other: BondPerson;
  viewerProfile: ProfLite;
  otherProfile: ProfLite | null;
  viewerBi: BioLite;
  otherBi: BioLite;
  pairKey: string;
};

/** Viewer is always "a" so every text addresses the person reading it. */
async function loadPair(admin: SupabaseClient, viewerProfile: ProfLite, found: { link: LinkRow; role: "owner" | "partner" }): Promise<Pair> {
  const { link, role } = found;
  const viewerBi = await ownBirth(admin, viewerProfile.id);
  if (!viewerBi) throw new BondError("birth_required", "Add your birth details first", 409);
  const otherProfile = role === "owner" ? await loadProfile(admin, link.partner_profile_id) : await loadProfile(admin, link.owner_profile_id);
  let otherBi: BioLite | null = null;
  if (role === "owner") {
    if (link.status === "linked" && link.partner_profile_id) otherBi = await ownBirth(admin, link.partner_profile_id);
    otherBi = otherBi ?? await birthById(admin, link.partner_birth_input_id);
  } else {
    otherBi = await ownBirth(admin, link.owner_profile_id);
  }
  if (!otherBi) throw new BondError("partner_details_missing", "Partner details are missing", 409);
  const vBase = baseOf(viewerProfile);
  const oBase = otherProfile && link.status === "linked" ? baseOf(otherProfile) : vBase;
  const viewerName = firstName(viewerProfile.display_name, "You");
  const otherName = role === "owner" ? firstName(link.partner_name, "Partner") : firstName(otherProfile?.display_name, "Partner");
  const viewer = personFrom(viewerBi, viewerName, vBase);
  const other = personFrom(otherBi, otherName, oBase);
  const pairKey = await sha256Hex(`${await bioHash(viewerBi)}|${await bioHash(otherBi)}|${otherName.toLowerCase()}`);
  return { link, role, viewer, other, viewerProfile, otherProfile, viewerBi, otherBi, pairKey };
}

// ------------------------------------------------------------------ pair reading jobs

async function logCall(admin: SupabaseClient, row: {
  profile_id: string | null; purpose: "match" | "bond_month" | "bond_repair"; model: string; response_id?: string | null;
  locale: string; status: string; usage?: ResponseObject["usage"]; latency_ms?: number | null; error?: string | null; meta?: Record<string, unknown>;
}): Promise<number> {
  const cost = costUsd(row.model, row.usage ?? null);
  await admin.from("llm_calls").insert({
    job_id: null, profile_id: row.profile_id, purpose: row.purpose, provider: "openai", model: row.model,
    response_id: row.response_id ?? null, locale: row.locale, status: row.status,
    input_tokens: row.usage?.input_tokens ?? 0, cached_tokens: row.usage?.cached_tokens ?? 0,
    output_tokens: row.usage?.output_tokens ?? 0, reasoning_tokens: row.usage?.reasoning_tokens ?? 0,
    cost_usd: cost, latency_ms: row.latency_ms ?? null, error: row.error ?? null, meta: row.meta ?? null,
  });
  return cost;
}

async function updatePair(admin: SupabaseClient, id: string, patch: Partial<PairRow>): Promise<PairRow> {
  const { data, error } = await admin.from("pair_readings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) throw error;
  return data as PairRow;
}

function promptsFor(row: PairRow): { system: string; user: string; schema: Record<string, unknown>; name: string } {
  if (row.kind === "match") {
    const f = row.facts as MatchFacts;
    return { system: matchSystemPrompt(f), user: factsPrompt(f), schema: matchSchema(), name: "muhurta_match" };
  }
  const f = row.facts as MonthFacts;
  const slim = { ...f, days: undefined };
  return { system: monthSystemPrompt(f), user: factsPrompt(slim), schema: monthSchema(f), name: "muhurta_bond_month" };
}

async function submitPair(admin: SupabaseClient, row: PairRow): Promise<PairRow> {
  const p = promptsFor(row);
  const model = readingModel();
  try {
    const r = await createResponse({
      model, system: p.system, user: p.user, schemaName: p.name, schema: p.schema, background: true,
      reasoningEffort: "low", maxOutputTokens: 9000, metadata: { pair_reading_id: row.id, kind: row.kind, locale: row.locale },
    });
    return await updatePair(admin, row.id, {
      openai_response_id: r.id, model, attempts: row.attempts + 1, started_at: row.started_at ?? new Date().toISOString(),
      last_polled_at: new Date().toISOString(), error: null,
    });
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 400);
    await logCall(admin, { profile_id: row.requested_by, purpose: row.kind, model, locale: row.locale, status: "create_failed", error: msg });
    const attempts = row.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) return await updatePair(admin, row.id, { status: "failed", attempts, error: msg });
    return await updatePair(admin, row.id, { attempts, error: msg, openai_response_id: null, last_polled_at: new Date().toISOString() });
  }
}

export type PairReadyHook = (admin: SupabaseClient, row: PairRow) => Promise<void>;

export async function advancePair(admin: SupabaseClient, rowIn: PairRow, opts: { force?: boolean; onReady?: PairReadyHook } = {}): Promise<PairRow> {
  let row = rowIn;
  if (row.status !== "generating") return row;
  const now = Date.now();
  if (!row.openai_response_id) {
    if (row.attempts >= MAX_ATTEMPTS) return await updatePair(admin, row.id, { status: "failed" });
    return await submitPair(admin, row);
  }
  const claimed = row.claimed_until ? Date.parse(row.claimed_until) : 0;
  if (claimed > now) return row;
  const last = row.last_polled_at ? Date.parse(row.last_polled_at) : 0;
  if (!opts.force && now - last < POLL_DEBOUNCE_MS) return row;
  let resp: ResponseObject;
  try {
    resp = await retrieveResponse(row.openai_response_id);
  } catch (e) {
    return await updatePair(admin, row.id, { last_polled_at: new Date().toISOString(), error: (e instanceof Error ? e.message : String(e)).slice(0, 300) });
  }
  const started = Date.parse(row.started_at ?? row.created_at);
  if (resp.status === "queued" || resp.status === "in_progress") {
    if (now - started > JOB_TIMEOUT_MS) {
      await logCall(admin, { profile_id: row.requested_by, purpose: row.kind, model: row.model ?? readingModel(), response_id: resp.id, locale: row.locale, status: "timeout", latency_ms: now - started });
      if (row.attempts >= MAX_ATTEMPTS) return await updatePair(admin, row.id, { status: "failed", error: "timeout" });
      return await updatePair(admin, row.id, { openai_response_id: null, error: "timeout", started_at: new Date().toISOString() });
    }
    return await updatePair(admin, row.id, { last_polled_at: new Date().toISOString() });
  }
  // Claim so a single worker validates and saves.
  const { data: got } = await admin.from("pair_readings").update({
    claimed_until: new Date(now + CLAIM_MS).toISOString(), last_polled_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", row.id).eq("status", "generating").or(`claimed_until.is.null,claimed_until.lt.${new Date(now).toISOString()}`).select("*");
  const mine = (got ?? [])[0] as PairRow | undefined;
  if (!mine) return row;
  row = mine;
  const model = resp.model ?? row.model ?? readingModel();
  const cost = await logCall(admin, {
    profile_id: row.requested_by, purpose: row.kind, model, response_id: resp.id, locale: row.locale, status: resp.status,
    usage: resp.usage, latency_ms: now - started, error: resp.error ?? resp.incomplete_reason, meta: { pair_reading_id: row.id, attempt: row.attempts },
  });
  const totals = {
    input_tokens: row.input_tokens + (resp.usage?.input_tokens ?? 0),
    cached_tokens: row.cached_tokens + (resp.usage?.cached_tokens ?? 0),
    output_tokens: row.output_tokens + (resp.usage?.output_tokens ?? 0),
    reasoning_tokens: row.reasoning_tokens + (resp.usage?.reasoning_tokens ?? 0),
    cost_usd: Number(row.cost_usd ?? 0) + cost,
  };
  let content: Record<string, unknown> | null = null;
  try {
    content = resp.status === "completed" && resp.output_text ? JSON.parse(resp.output_text) : null;
  } catch {
    content = null;
  }
  if (content) content = clipBond(content);
  const v = validateBond(content, row.locale, row.kind, row.kind === "bond_month" ? row.facts as MonthFacts : undefined);
  if (!content || !v.ok) {
    const why = !content ? `no_content:${resp.status}` : `invalid:${v.fatal.join(";")}`;
    if (row.attempts >= MAX_ATTEMPTS) {
      return await updatePair(admin, row.id, { ...totals, status: "failed", error: why.slice(0, 400), validation: v as never, claimed_until: null });
    }
    const again = await updatePair(admin, row.id, { ...totals, error: why.slice(0, 400), validation: v as never, openai_response_id: null, claimed_until: null });
    return await submitPair(admin, again);
  }
  if (row.kind === "bond_month") {
    const allowed = new Set((row.facts as MonthFacts).key_days.map((d) => d.date));
    content.key_days = ((content.key_days as { date: string }[]) ?? []).filter((d) => allowed.has(d.date));
  }
  const readyAt = new Date().toISOString();
  const { data: saved } = await admin.from("pair_readings").update({
    ...totals, status: "ready", content, validation: v, model, ready_at: readyAt, updated_at: readyAt, claimed_until: null, error: null,
  }).eq("id", row.id).eq("status", "generating").select("*").maybeSingle();
  if (saved) {
    await admin.from("pair_readings").update({ status: "superseded", updated_at: readyAt })
      .eq("link_id", row.link_id).eq("kind", row.kind).eq("period_key", row.period_key).eq("locale", row.locale)
      .neq("id", row.id).eq("status", "ready");
    if (opts.onReady) await opts.onReady(admin, saved as PairRow).catch((e) => console.warn("[bond] onReady", e instanceof Error ? e.message : e));
  }
  return (saved as PairRow | null) ?? row;
}

async function findLive(admin: SupabaseClient, pairKey: string, kind: string, period: string, locale: string): Promise<PairRow | null> {
  const { data } = await admin.from("pair_readings").select("*").eq("pair_key", pairKey).eq("kind", kind).eq("period_key", period)
    .eq("locale", locale).eq("schema_version", BOND_SCHEMA_VERSION).in("status", ["generating", "ready"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as PairRow | null) ?? null;
}

async function ensurePair(
  admin: SupabaseClient,
  args: { link: LinkRow; pairKey: string; kind: "match" | "bond_month"; period: string; locale: BondLocale; facts: MatchFacts | MonthFacts; requestedBy: string | null; start: boolean },
): Promise<PairRow | null> {
  const live = await findLive(admin, args.pairKey, args.kind, args.period, args.locale);
  if (live) return live;
  if (!args.start) return null;
  const { data, error } = await admin.from("pair_readings").insert({
    link_id: args.link.id, pair_key: args.pairKey, kind: args.kind, period_key: args.period, locale: args.locale,
    schema_version: BOND_SCHEMA_VERSION, status: "generating", facts: args.facts, model: readingModel(),
    prompt_version: args.kind === "match" ? MATCH_PROMPT_VERSION : MONTH_PROMPT_VERSION, requested_by: args.requestedBy,
  }).select("*").single();
  if (error) {
    const again = await findLive(admin, args.pairKey, args.kind, args.period, args.locale);
    if (again) return again;
    throw error;
  }
  return await submitPair(admin, data as PairRow);
}

function expectedMs(kind: string, locale: string) {
  return (kind === "match" ? 40_000 : 35_000) * (locale === "en" ? 1 : 1.5);
}

function progressOf(row: PairRow | null) {
  if (!row) return { state: "none" as const, pct: 0, elapsed_ms: 0, expected_ms: 0 };
  const expected = expectedMs(row.kind, row.locale);
  if (row.status === "ready") return { state: "ready" as const, pct: 100, elapsed_ms: 0, expected_ms: expected };
  if (row.status === "failed") return { state: "failed" as const, pct: 0, elapsed_ms: 0, expected_ms: expected };
  const elapsed = Math.max(0, Date.now() - Date.parse(row.started_at ?? row.created_at));
  return { state: "generating" as const, pct: Math.round(Math.min(92, 6 + 86 * (1 - Math.exp(-elapsed / (expected * 0.55))))), elapsed_ms: elapsed, expected_ms: expected };
}

/** Month guide ready → tell both partners (prepared guides only; a waiting user sees it live). */
export const onPairReady: PairReadyHook = async (admin, row) => {
  if (row.kind !== "bond_month" || row.requested_by) return;
  const { data: link } = await admin.from("partner_links").select("*").eq("id", row.link_id).maybeSingle();
  if (!link) return;
  const l = link as LinkRow;
  const viewerId = (row.facts as MonthFacts & { viewer_profile_id?: string })?.viewer_profile_id ?? l.owner_profile_id;
  const otherName = (row.facts as MonthFacts).b_name;
  await sendOneOffToProfile(admin, viewerId, `bond_month:${row.period_key}:${row.locale}`, "bond_month_ready", (lc) => {
    const c = BOND_PUSH[bondLoc(lc)];
    return { title: c.monthReadyTitle, body: c.monthReadyBody(otherName), url: "/bond?tab=month&src=push_bond_month", open: c.open };
  }, { pref: "bond", localeRaw: row.locale });
  await admin.from("pair_readings").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
};

export async function sweepPairReadings(admin: SupabaseClient, opts?: { responseId?: string; limit?: number }) {
  let q = admin.from("pair_readings").select("*").eq("status", "generating");
  if (opts?.responseId) q = q.eq("openai_response_id", opts.responseId);
  else q = q.or(`last_polled_at.is.null,last_polled_at.lt.${new Date(Date.now() - 8000).toISOString()}`);
  const { data, error } = await q.order("updated_at", { ascending: true }).limit(opts?.limit ?? 6);
  if (error) throw error;
  const results: Record<string, unknown>[] = [];
  for (const row of (data ?? []) as PairRow[]) {
    try {
      const after = await advancePair(admin, row, { force: true, onReady: onPairReady });
      results.push({ id: row.id, status: after.status });
    } catch (e) {
      results.push({ id: row.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { considered: (data ?? []).length, results };
}

// ------------------------------------------------------------------ streak + today

const ACTION_FOR: Record<string, string> = {
  warm: "plan_time", soft: "go_gentle", support_a: "ask_for_space", support_b: "check_in", talk: "have_the_talk", ordinary: "small_thanks",
};

async function streakFor(admin: SupabaseClient, link: LinkRow, viewerId: string, today: string) {
  const since = DateTime.fromISO(today).minus({ days: 90 }).toISODate()!;
  const { data } = await admin.from("bond_actions").select("profile_id, local_date, action_key").eq("link_id", link.id).gte("local_date", since);
  const rows = (data ?? []) as { profile_id: string; local_date: string; action_key: string }[];
  const otherId = link.owner_profile_id === viewerId ? link.partner_profile_id : link.owner_profile_id;
  const mine = new Set(rows.filter((r) => r.profile_id === viewerId).map((r) => r.local_date));
  const theirs = new Set(rows.filter((r) => r.profile_id === otherId).map((r) => r.local_date));
  const run = (has: (d: string) => boolean) => {
    let d = DateTime.fromISO(today);
    if (!has(today)) d = d.minus({ days: 1 });
    let n = 0;
    while (has(d.toISODate()!)) {
      n++;
      d = d.minus({ days: 1 });
    }
    return n;
  };
  const best = (() => {
    let bestRun = 0, cur = 0;
    for (let d = DateTime.fromISO(since); d.toISODate()! <= today; d = d.plus({ days: 1 })) {
      cur = mine.has(d.toISODate()!) ? cur + 1 : 0;
      bestRun = Math.max(bestRun, cur);
    }
    return bestRun;
  })();
  return {
    mine: run((d) => mine.has(d)),
    together: link.status === "linked" ? run((d) => mine.has(d) && theirs.has(d)) : 0,
    best,
    done_today: rows.filter((r) => r.profile_id === viewerId && r.local_date === today).map((r) => r.action_key),
    partner_done_today: link.status === "linked" && theirs.has(today),
    last7: Array.from({ length: 7 }, (_, i) => {
      const d = DateTime.fromISO(today).minus({ days: 6 - i }).toISODate()!;
      return { date: d, me: mine.has(d), them: theirs.has(d) };
    }),
  };
}

function coupleToday(pair: Pair, date: string) {
  const qa = dayFacts(date, pair.viewer.place), qb = dayFacts(date, pair.other.place);
  if (!qa || !qb) return null;
  const type = coupleDayType(qa, qb);
  return { date, type, action_key: ACTION_FOR[type], best: qa.good[0] ?? null };
}

// ------------------------------------------------------------------ public shapes

function linkView(link: LinkRow, role: "owner" | "partner", otherProfile: ProfLite | null) {
  return {
    id: link.id,
    role,
    status: link.status,
    partner_name: role === "owner" ? link.partner_name : firstName(otherProfile?.display_name, "Partner"),
    relationship_kind: link.relationship_kind,
    invite_expires_at: link.status === "invited" ? link.invite_expires_at : null,
    linked_at: link.linked_at,
  };
}

function matchPublic(f: MatchFacts, full: boolean) {
  if (!full) return { total: f.total, max: 36, band: f.band, approximate: f.approximate, a_name: f.a.name, b_name: f.b.name };
  return { ...f, max: 36, a_name: f.a.name, b_name: f.b.name };
}

function quickStar(input: Record<string, unknown> | null | undefined): { star: MoonStar; approx: boolean } | null {
  if (!input || typeof input !== "object") return null;
  const nakName = typeof input.nakshatra === "string" ? input.nakshatra : null;
  if (nakName) {
    const idx = NAKSHATRAS.findIndex((n) => n.toLowerCase() === nakName.trim().toLowerCase());
    if (idx < 0) return null;
    const pada = Math.min(4, Math.max(1, Number(input.pada) || 2));
    return { star: { nak: idx, pada }, approx: !input.pada };
  }
  const date = String(input.date_of_birth ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const zone = typeof input.timezone === "string" && input.timezone ? input.timezone : DEFAULT_ZONE;
  const time = typeof input.time === "string" && /^\d{1,2}:\d{2}/.test(input.time) ? input.time : null;
  const dt = DateTime.fromISO(`${date}T${time ? (time.length === 5 ? time + ":00" : time) : "12:00:00"}`, { zone });
  if (!dt.isValid) return null;
  return { star: starFromLon(moonSiderealLongitudeDeg(dt.toUTC().toJSDate())), approx: !time };
}

/** Free + public quick check: total out of 36 and band only. Zero LLM. */
export function quickMatch(a: Record<string, unknown>, b: Record<string, unknown>) {
  const sa = quickStar(a), sb = quickStar(b);
  if (!sa || !sb) throw new BondError("invalid_input", "Need a birth date or a star for both people", 400);
  const m = ashtakoota(sa.star, sb.star);
  return { total: m.total, max: 36, band: m.band, approximate: sa.approx || sb.approx, a_star: m.a.nak, b_star: m.b.nak };
}

export async function invitePreview(admin: SupabaseClient, token: string) {
  if (!token || token.length < 16) throw new BondError("invite_invalid", "Invite not found", 404);
  const { data } = await admin.from("partner_links").select("id, owner_profile_id, partner_name, status, invite_expires_at")
    .eq("invite_token_hash", await sha256Hex(token)).maybeSingle();
  if (!data) throw new BondError("invite_invalid", "Invite not found", 404);
  const row = data as Pick<LinkRow, "id" | "owner_profile_id" | "partner_name" | "status" | "invite_expires_at">;
  const expired = row.status !== "invited" || (row.invite_expires_at != null && Date.parse(row.invite_expires_at) < Date.now());
  const owner = await loadProfile(admin, row.owner_profile_id);
  return { inviter: firstName(owner?.display_name, "Your partner"), partner_name: firstName(row.partner_name, ""), expired, language: owner?.language_code ?? "en" };
}

// ------------------------------------------------------------------ actions

export const BOND_ACTIONS = new Set([
  "bond_status", "match_quick", "partner_add", "partner_invite_create", "partner_invite_accept", "partner_unlink",
  "match_get", "bond_month_get", "bond_action_done", "calendar_month_get", "calendar_year_get",
]);

const proRequired = (code = "pro_required_bond") => new BondError(code, "This is part of Pro.", 403);

export async function handleBondAction(
  action: string,
  body: Record<string, unknown>,
  profileId: string,
  admin: SupabaseClient,
  deps: BondDeps,
): Promise<unknown> {
  const prof = await loadProfile(admin, profileId);
  if (!prof) throw new BondError("profile_required", "Profile required", 409);
  const base = baseOf(prof);
  const today = DateTime.now().setZone(base.zone).toISODate()!;
  const locale = locOf(prof.language_code);

  if (action === "calendar_month_get" || action === "calendar_year_get") {
    const bi = await ownBirth(admin, profileId);
    if (!bi) throw new BondError("birth_required", "Add your birth details first", 409);
    const me = personFrom(bi, firstName(prof.display_name, "You"), base);
    const pro = await deps.isPro(profileId);
    if (action === "calendar_year_get") {
      const from = DateTime.now().setZone(base.zone).toFormat("yyyy-MM");
      if (!pro) return { locked: true, from, months: [], approximate: me.starApprox };
      const segs = deps.segmentsFor(bi, base.zone);
      const lordsAt = (d: Date) => ({ ad: segs.length ? vimshottariLordsAt(segs, d)?.adLord ?? null : null });
      return { locked: false, from, months: yearMonths(from, me.place, lordsAt, 12), approximate: me.starApprox, version: "cal-v1" };
    }
    const month = typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month) ? body.month : today.slice(0, 7);
    const tomorrow = DateTime.fromISO(today).plus({ days: 1 }).toISODate()!;
    let days = monthDays(month, me.place);
    // Free: today and tomorrow only, enforced here (the client never receives other dates).
    if (!pro) days = days.filter((d) => d.date === today || d.date === tomorrow);
    if (!pro && !days.length) {
      days = [today, tomorrow].map((d) => dayFacts(d, me.place)).filter((q) => q != null).map((q) => scoreDay(q!));
    }
    return { locked: !pro, month, today, days, approximate: me.starApprox, version: "cal-v1" };
  }

  if (action === "match_quick") {
    const bi = await ownBirth(admin, profileId);
    const aIn = (body.a as Record<string, unknown>) ?? (bi
      ? (() => {
        const p = personFrom(bi, "", base);
        return { nakshatra: NAKSHATRAS[p.star.nak], pada: p.star.pada };
      })()
      : null);
    if (!aIn) throw new BondError("birth_required", "Add your birth details first", 409);
    return quickMatch(aIn, (body.b as Record<string, unknown>) ?? {});
  }

  if (action === "partner_invite_accept") {
    const token = String(body.token ?? "");
    const hash = await sha256Hex(token);
    const { data } = await admin.from("partner_links").select("*").eq("invite_token_hash", hash).maybeSingle();
    if (!data) throw new BondError("invite_invalid", "Invite not found", 404);
    const link = data as LinkRow;
    if (link.owner_profile_id === profileId) throw new BondError("invite_own", "This is your own invite", 409);
    if (link.status !== "invited" || (link.invite_expires_at && Date.parse(link.invite_expires_at) < Date.now())) {
      throw new BondError("invite_expired", "This invite has expired", 410);
    }
    const existing = await activeLinkFor(admin, profileId);
    if (existing) throw new BondError("already_linked", "You are already linked with a partner", 409);
    const now = new Date().toISOString();
    const { error } = await admin.from("partner_links").update({
      partner_profile_id: profileId, status: "linked", linked_at: now, invite_token_hash: null, invite_expires_at: null, updated_at: now,
    }).eq("id", link.id).eq("status", "invited");
    if (error) throw error;
    const owner = await loadProfile(admin, link.owner_profile_id);
    return { linked: true, partner_name: firstName(owner?.display_name, "Partner") };
  }

  const found = await activeLinkFor(admin, profileId);

  if (action === "partner_add") {
    if (!(await deps.isPro(profileId))) throw proRequired();
    if (body.consent !== true) throw new BondError("consent_required", "Please confirm you have your partner's OK", 400);
    const name = String(body.name ?? "").trim().slice(0, 60);
    const dob = String(body.date_of_birth ?? "").slice(0, 10);
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw new BondError("invalid_input", "Name and birth date are required", 400);
    const own = await ownBirth(admin, profileId);
    if (!own) throw new BondError("birth_required", "Add your birth details first", 409);
    if (found && found.role === "partner") throw new BondError("already_linked", "You are already linked with a partner", 409);
    if (found && body.replace !== true) throw new BondError("partner_exists", "You already have a partner saved", 409);
    const time = typeof body.exact_birth_time === "string" && /^\d{1,2}:\d{2}/.test(body.exact_birth_time) ? body.exact_birth_time : null;
    const nak = typeof body.janma_nakshatra === "string" && NAKSHATRAS.some((n) => n === body.janma_nakshatra) ? body.janma_nakshatra : null;
    const { data: bi, error: biErr } = await admin.from("birth_inputs").insert({
      profile_id: profileId,
      date_of_birth: dob,
      birth_place: typeof body.birth_place === "string" ? body.birth_place.slice(0, 120) : null,
      birth_input_mode: typeof body.birth_input_mode === "string" && body.birth_input_mode
        ? body.birth_input_mode.slice(0, 40)
        : time ? "exact_time" : nak ? "nakshatra_only" : "time_bucket",
      exact_birth_time: time,
      time_bucket: !time && typeof body.time_bucket === "string" && body.time_bucket !== "unknown" ? body.time_bucket.slice(0, 20) : null,
      janma_nakshatra: nak,
      nakshatra_pada: nak && body.nakshatra_pada != null ? Math.min(4, Math.max(1, Number(body.nakshatra_pada))) : null,
      birth_lat: body.birth_lat != null ? Number(body.birth_lat) : null,
      birth_lng: body.birth_lng != null ? Number(body.birth_lng) : null,
      birth_timezone: typeof body.birth_timezone === "string" ? body.birth_timezone : null,
      source: "chart_profile",
      confidence_label: "partner",
    }).select("id").single();
    if (biErr || !bi) throw biErr ?? new Error("partner_birth_insert_failed");
    const now = new Date().toISOString();
    if (found) {
      await admin.from("partner_links").update({ status: "unlinked", unlinked_at: now, invite_token_hash: null, updated_at: now }).eq("id", found.link.id);
    }
    const kind = ["married", "engaged", "relationship", "prefer_not"].includes(String(body.relationship_kind)) ? String(body.relationship_kind) : "prefer_not";
    const { error: lErr } = await admin.from("partner_links").insert({
      owner_profile_id: profileId, owner_birth_input_id: own.id, partner_birth_input_id: (bi as { id: string }).id,
      partner_name: name, relationship_kind: kind, status: "details_only", consent_confirmed_at: now,
    });
    if (lErr) throw lErr;
    return await handleBondAction("bond_status", {}, profileId, admin, deps);
  }

  if (action === "bond_status") {
    const access = await hasBondAccess(admin, deps, profileId);
    const isPro = await deps.isPro(profileId);
    if (!found) return { link: null, access, isPro, today };
    const pair = await loadPair(admin, prof, found);
    const f = matchFacts(pair.viewer, pair.other, locale, found.link.relationship_kind);
    const match = await findLive(admin, pair.pairKey, "match", "", locale);
    return {
      link: linkView(found.link, found.role, pair.otherProfile),
      access,
      isPro,
      today,
      match: matchPublic(f, access),
      match_text: access && match?.status === "ready" ? match.content : null,
      match_progress: access ? progressOf(match) : null,
      couple_today: access ? coupleToday(pair, today) : null,
      streak: access ? await streakFor(admin, found.link, profileId, today) : null,
    };
  }

  if (!found) throw new BondError("partner_required", "Add your partner first", 409);

  if (action === "partner_invite_create") {
    if (found.role !== "owner") throw new BondError("not_owner", "Only the person who added the partner can invite", 403);
    if (found.link.status === "linked") throw new BondError("already_linked", "Your partner already joined", 409);
    const token = randomToken();
    const expires = new Date(Date.now() + INVITE_DAYS * 86400_000).toISOString();
    await admin.from("partner_links").update({
      invite_token_hash: await sha256Hex(token), invite_expires_at: expires, status: "invited", updated_at: new Date().toISOString(),
    }).eq("id", found.link.id);
    return { token, expires_at: expires, path: `/join/${token}` };
  }

  if (action === "partner_unlink") {
    const now = new Date().toISOString();
    await admin.from("partner_links").update({ status: "unlinked", unlinked_at: now, invite_token_hash: null, updated_at: now }).eq("id", found.link.id);
    return { unlinked: true };
  }

  if (!(await hasBondAccess(admin, deps, profileId))) throw proRequired();
  const pair = await loadPair(admin, prof, found);

  if (action === "match_get") {
    const f = matchFacts(pair.viewer, pair.other, locale, found.link.relationship_kind);
    let row = await ensurePair(admin, { link: found.link, pairKey: pair.pairKey, kind: "match", period: "", locale, facts: f, requestedBy: profileId, start: body.start !== false });
    if (row?.status === "generating") row = await advancePair(admin, row);
    if (row?.status === "failed" && body.retry === true) {
      await admin.from("pair_readings").update({ status: "superseded" }).eq("id", row.id);
      row = await ensurePair(admin, { link: found.link, pairKey: pair.pairKey, kind: "match", period: "", locale, facts: f, requestedBy: profileId, start: true });
    }
    return { match: matchPublic(f, true), text: row?.status === "ready" ? row.content : null, progress: progressOf(row) };
  }

  if (action === "bond_month_get") {
    const thisMonth = today.slice(0, 7);
    const nextMonth = DateTime.fromISO(today).plus({ months: 1 }).toFormat("yyyy-MM");
    const month = typeof body.month === "string" && [thisMonth, nextMonth].includes(body.month) ? body.month : thisMonth;
    const band = ashtakoota(pair.viewer.star, pair.other.star).band;
    const f = { ...monthFacts(pair.viewer, pair.other, month, locale, band), viewer_profile_id: profileId };
    let row = await ensurePair(admin, { link: found.link, pairKey: pair.pairKey, kind: "bond_month", period: month, locale, facts: f, requestedBy: profileId, start: body.start !== false });
    if (row?.status === "generating") row = await advancePair(admin, row);
    if (row?.status === "failed" && body.retry === true) {
      await admin.from("pair_readings").update({ status: "superseded" }).eq("id", row.id);
      row = await ensurePair(admin, { link: found.link, pairKey: pair.pairKey, kind: "bond_month", period: month, locale, facts: f, requestedBy: profileId, start: true });
    }
    const { viewer_profile_id: _v, ...pub } = f;
    return { month, facts: pub, text: row?.status === "ready" ? row.content : null, progress: progressOf(row), today };
  }

  if (action === "bond_action_done") {
    const key = String(body.action_key ?? "").slice(0, 40);
    if (!key) throw new BondError("invalid_input", "action_key required", 400);
    await admin.from("bond_actions").upsert({ link_id: found.link.id, profile_id: profileId, local_date: today, action_key: key }, {
      onConflict: "link_id,profile_id,local_date,action_key", ignoreDuplicates: true,
    });
    return { streak: await streakFor(admin, found.link, profileId, today) };
  }

  throw new BondError("unknown_action", `Unknown action ${action}`, 400);
}

// ------------------------------------------------------------------ cron + push

/** 27th of the month: prepare next month's couple guide for every active pair with access. */
export async function prepareBondMonths(admin: SupabaseClient, deps: BondDeps, opts: { limit?: number } = {}) {
  const { data } = await admin.from("partner_links").select("*").neq("status", "unlinked").limit(opts.limit ?? 200);
  const out: Record<string, unknown>[] = [];
  for (const link of (data ?? []) as LinkRow[]) {
    const viewers = [link.owner_profile_id, ...(link.status === "linked" && link.partner_profile_id ? [link.partner_profile_id] : [])];
    for (const vid of viewers) {
      try {
        if (!(await hasBondAccess(admin, deps, vid))) continue;
        const prof = await loadProfile(admin, vid);
        if (!prof) continue;
        const pair = await loadPair(admin, prof, { link, role: vid === link.owner_profile_id ? "owner" : "partner" });
        const zone = baseOf(prof).zone;
        const month = DateTime.now().setZone(zone).plus({ months: 1 }).toFormat("yyyy-MM");
        const locale = locOf(prof.language_code);
        const band = ashtakoota(pair.viewer.star, pair.other.star).band;
        const f = { ...monthFacts(pair.viewer, pair.other, month, locale, band), viewer_profile_id: vid };
        const row = await ensurePair(admin, { link, pairKey: pair.pairKey, kind: "bond_month", period: month, locale, facts: f, requestedBy: null, start: true });
        out.push({ link: link.id.slice(0, 8), viewer: vid.slice(0, 8), month, status: row?.status });
      } catch (e) {
        out.push({ link: link.id.slice(0, 8), error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  return { considered: out.length, results: out };
}

/** 19:30 heads-up about tomorrow's couple day (warm top days, soft and support days). */
export async function bondMomentsFor(admin: SupabaseClient, deps: BondDeps, profileId: string, tz: string, dateStr: string, localeRaw: string | null) {
  const found = await activeLinkFor(admin, profileId);
  if (!found) return [];
  if (!(await hasBondAccess(admin, deps, profileId))) return [];
  const prof = await loadProfile(admin, profileId);
  if (!prof) return [];
  const pair = await loadPair(admin, prof, found);
  const tomorrow = DateTime.fromISO(dateStr, { zone: tz }).plus({ days: 1 });
  const t = coupleToday(pair, tomorrow.toISODate()!);
  if (!t || t.type === "ordinary") return [];
  if (t.type === "warm" || t.type === "talk") {
    // Only the month's strongest warm/talk days get a heads-up (no daily nagging).
    const band = ashtakoota(pair.viewer.star, pair.other.star).band;
    const f = monthFacts(pair.viewer, pair.other, tomorrow.toFormat("yyyy-MM"), "en", band);
    if (!f.key_days.some((k) => k.date === t.date)) return [];
  }
  const c = BOND_PUSH[bondLoc(localeRaw)].headsUp[t.type as keyof typeof BOND_PUSH["en"]["headsUp"]];
  if (!c) return [];
  return [{ key: `bond:${t.date}`, title: c.title, body: c.body(pair.other.name), url: "/bond?src=push_bond_heads_up" }];
}
