/**
 * Reading v2 job runner on gpt-6-luna: sharded background responses (Decode + current chapter
 * first, the rest in parallel) -> merge -> validate -> (one targeted repair) -> ready.
 * Legacy single-response jobs still finish on the old path.
 * Completion is detected by whichever comes first: a client status poll, the pg_cron sweep,
 * or the OpenAI webhook (when configured). All paths call advanceJob(), which is idempotent.
 */
import { isQuotaCap, maxAttempts, quotaParkMs, retryBackoffMs } from "./llm_policy.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildReadingSchema,
  buildSystemPrompt,
  buildUserPrompt,
  mergeRepair,
  READING_PROMPT_VERSION,
  READING_SCHEMA_VERSION,
  repairPrompt,
  repairScope,
  sanitizeContent,
  isV3,
  isV4,
  READING_PROMPT_VERSION_V4,
  READING_PROMPT_VERSION_V5,
  validateContent,
  type V2Content,
  type V2Facts,
  type Validation,
} from "./reading_v2.ts";
import {
  costUsd,
  createResponse,
  modelForAttempt,
  providerOf,
  readingModel,
  retrieveResponse,
  type ResponseObject,
} from "./openai_responses.ts";
import { chapterPlanV4, fillPlansV4, newItemScope } from "./reading_v4.ts";
import { hasAlien, isV5 } from "./reading_v5.ts";
import { mergeShards, offScriptShare, planShards, previewFrom, readingEffort, type ReadingPreview, type ShardKey, shardCall, shardEffort, shardMissing, shardOnly, shardStaggerMs } from "./reading_shards.ts";

/** Job attempts come from maxAttempts() in llm_policy.ts (Luna: first try + one retry). */
export { isQuotaCap } from "./llm_policy.ts";
const QUOTA_PARK_MS = quotaParkMs();

export const MAX_ATTEMPTS = 3;
const POLL_DEBOUNCE_MS = 2500;
const CLAIM_MS = 150_000;
/** A job stuck this long is cancelled and retried / failed. */
const JOB_TIMEOUT_MS = 10 * 60_000;

export type ReadingRow = {
  id: string;
  profile_id: string;
  birth_input_id: string;
  locale: "en" | "te" | "hi";
  schema_version: number;
  birth_hash: string;
  status: "generating" | "ready" | "failed" | "superseded";
  content: V2Content | null;
  facts: V2Facts | null;
  source: "llm" | "migrated";
  provider: string | null;
  model: string | null;
  prompt_version: string | null;
  generated_for_date: string | null;
  created_at: string;
  ready_at: string | null;
  updated_at?: string;
};

export type JobRow = {
  id: string;
  reading_id: string;
  profile_id: string;
  status: "queued" | "running" | "processing" | "succeeded" | "failed" | "cancelled";
  stage: string | null;
  model: string | null;
  openai_response_id: string | null;
  attempts: number;
  repairs: number;
  input_tokens: number;
  cached_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cost_usd: number;
  error: string | null;
  validation?: unknown;
  notify: boolean;
  notified_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  last_polled_at: string | null;
  client_seen_at: string | null;
  claimed_until: string | null;
  created_at: string;
  updated_at: string;
  shards?: ShardState | null;
  first_insight_ms?: number | null;
};

export type ShardEntry = {
  status: "queued" | "running" | "inline" | "done";
  rid: string | null;
  tries: number;
  submitted_at?: string;
  ms?: number;
  error?: string;
  content?: Record<string, unknown>;
};
export type ShardState = { v: 1; parts: Partial<Record<ShardKey, ShardEntry>> };

/** Sharded initial readings are on unless READING_SHARDS=off (instant rollback switch). */
export function shardedEnabled(): boolean {
  return (Deno.env.get("READING_SHARDS") ?? "").trim().toLowerCase() !== "off";
}

export type ReadyHook = (admin: SupabaseClient, reading: ReadingRow, job: JobRow) => Promise<void>;

const READING_COLS =
  "id, profile_id, birth_input_id, locale, schema_version, birth_hash, status, content, facts, source, provider, model, prompt_version, generated_for_date, created_at, ready_at, updated_at";
const READING_META_COLS =
  "id, profile_id, birth_input_id, locale, schema_version, birth_hash, status, source, provider, model, prompt_version, generated_for_date, created_at, ready_at, updated_at";

let lengthsSupported: boolean | null = null;

export async function findReading(
  admin: SupabaseClient,
  birthInputId: string,
  locale: string,
  birthHash: string,
  opts?: { withContent?: boolean },
): Promise<ReadingRow | null> {
  const { data, error } = await admin
    .from("readings")
    .select(opts?.withContent === false ? READING_META_COLS : READING_COLS)
    .eq("birth_input_id", birthInputId)
    .eq("locale", locale)
    .eq("schema_version", READING_SCHEMA_VERSION)
    .eq("birth_hash", birthHash)
    .in("status", ["generating", "ready"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ReadingRow | null) ?? null;
}

export async function latestJob(admin: SupabaseClient, readingId: string): Promise<JobRow | null> {
  const { data, error } = await admin
    .from("generation_jobs")
    .select("*")
    .eq("reading_id", readingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as JobRow | null) ?? null;
}

async function updateJob(admin: SupabaseClient, id: string, patch: Partial<JobRow>): Promise<JobRow> {
  const { data, error } = await admin
    .from("generation_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as JobRow;
}

async function logCall(
  admin: SupabaseClient,
  row: {
    job_id: string | null;
    profile_id: string | null;
    purpose: "reading" | "repair" | "ask" | "reading_shard" | "explain" | "daily_context" | "push_brief" | "eval";
    model: string;
    response_id?: string | null;
    locale?: string | null;
    status: string;
    usage?: ResponseObject["usage"];
    latency_ms?: number | null;
    error?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<number> {
  const cost = costUsd(row.model, row.usage ?? null);
  await admin.from("llm_calls").insert({
    job_id: row.job_id,
    profile_id: row.profile_id,
    purpose: row.purpose,
    provider: providerOf(row.model),
    model: row.model,
    response_id: row.response_id ?? null,
    locale: row.locale ?? null,
    status: row.status,
    input_tokens: row.usage?.input_tokens ?? 0,
    cached_tokens: row.usage?.cached_tokens ?? 0,
    output_tokens: row.usage?.output_tokens ?? 0,
    reasoning_tokens: row.usage?.reasoning_tokens ?? 0,
    cost_usd: cost,
    latency_ms: row.latency_ms ?? null,
    error: row.error ?? null,
    meta: row.usage?.cache_write_tokens ? { ...(row.meta ?? {}), cache_write: row.usage.cache_write_tokens } : row.meta ?? null,
  });
  return cost;
}

export { logCall as logLlmCall };

export async function createWithSchema(
  facts: V2Facts,
  args: { system: string; user: string; scope?: Parameters<typeof buildReadingSchema>[1]["scope"]; background: boolean; metadata?: Record<string, string>; model?: string; chainDepth?: number },
): Promise<ResponseObject> {
  const attempt = (withLengths: boolean) =>
    createResponse({
      model: args.model ?? readingModel(),
      system: args.system,
      user: args.user,
      schemaName: args.scope ? "muhurta_reading_repair" : "muhurta_reading",
      schema: buildReadingSchema(facts, { withLengths, scope: args.scope }),
      background: args.background,
      reasoningEffort: readingEffort(),
      maxOutputTokens: args.scope ? 12000 : 40000,
      metadata: args.metadata,
      chainDepth: args.chainDepth,
      // Repairs are one-off prompts (they carry the draft): never pay for a cache write.
      ...(args.scope ? { promptCacheMode: "explicit" as const } : {}),
    });
  if (lengthsSupported !== false) {
    try {
      const r = await attempt(true);
      lengthsSupported = true;
      return r;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/maxLength|max_length|not permitted|unsupported/i.test(msg) || !/:400:/.test(msg)) throw e;
      lengthsSupported = false;
    }
  }
  return attempt(false);
}

/**
 * Legacy knob (ignored by the Luna client): kept so older call sites type-check.
 */
export function readingChainDepth(attempts: number): number | undefined {
  return attempts < 2 ? 2 : undefined;
}

/** Submit (or re-submit) the background response for a job. */
export async function submitJob(admin: SupabaseClient, job: JobRow, reading: ReadingRow): Promise<JobRow> {
  const facts = reading.facts!;
  const model = modelForAttempt(job.attempts);
  try {
    const r = await createWithSchema(facts, {
      model,
      system: buildSystemPrompt(facts),
      user: buildUserPrompt(facts),
      background: true,
      chainDepth: readingChainDepth(job.attempts),
      metadata: { job_id: job.id, reading_id: reading.id, locale: reading.locale },
    });
    return await updateJob(admin, job.id, {
      status: "running",
      stage: "writing",
      model,
      openai_response_id: r.id,
      attempts: job.attempts + 1,
      started_at: new Date().toISOString(), // per attempt, so JOB_TIMEOUT_MS never trips on a later retry
      error: null,
      last_polled_at: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const attempts = job.attempts + 1;
    await logCall(admin, {
      job_id: job.id, profile_id: job.profile_id, purpose: "reading", model, locale: reading.locale,
      status: "create_failed", error: msg.slice(0, 500),
    });
    const dayCap = isQuotaCap(msg);
    if (attempts >= maxAttempts() && !dayCap) return await failJob(admin, job, reading, msg, attempts);
    return await updateJob(admin, job.id, {
      status: "queued", stage: "retrying", attempts: dayCap ? Math.max(1, job.attempts) : attempts, error: msg.slice(0, 500),
      last_polled_at: new Date(Date.now() + (dayCap ? QUOTA_PARK_MS : 0)).toISOString(),
    });
  }
}

async function failJob(
  admin: SupabaseClient,
  job: JobRow,
  reading: ReadingRow,
  error: string,
  attempts = job.attempts,
): Promise<JobRow> {
  await admin.from("readings").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", reading.id);
  return await updateJob(admin, job.id, {
    status: "failed",
    stage: "failed",
    attempts,
    error: error.slice(0, 500),
    finished_at: new Date().toISOString(),
    claimed_until: null,
  });
}

export type StartArgs = {
  profileId: string;
  birthInputId: string;
  locale: "en" | "te" | "hi";
  birthHash: string;
  facts: V2Facts;
  notify?: boolean;
};

/** Find or create the reading for these birth details + language and make sure a job is moving. */
export async function startReading(
  admin: SupabaseClient,
  args: StartArgs,
): Promise<{ reading: ReadingRow; job: JobRow | null; created: boolean }> {
  const existing = await findReading(admin, args.birthInputId, args.locale, args.birthHash);
  if (existing?.status === "ready") return { reading: existing, job: null, created: false };
  if (existing?.status === "generating") {
    const job = await latestJob(admin, existing.id);
    if (job && (job.status === "failed" || job.status === "cancelled")) {
      // A failed chain leaves the reading failed; this branch only covers races.
      return { reading: existing, job, created: false };
    }
    if (job) return { reading: existing, job, created: false };
  }
  let reading = existing;
  if (!reading) {
    const { data, error } = await admin.from("readings").insert({
      profile_id: args.profileId,
      birth_input_id: args.birthInputId,
      locale: args.locale,
      schema_version: READING_SCHEMA_VERSION,
      birth_hash: args.birthHash,
      status: "generating",
      facts: args.facts,
      source: "llm",
      provider: providerOf(readingModel()),
      model: readingModel(),
      prompt_version: isV5(args.facts) ? READING_PROMPT_VERSION_V5 : isV4(args.facts) ? READING_PROMPT_VERSION_V4 : READING_PROMPT_VERSION,
      generated_for_date: args.facts.generation_date,
    }).select(READING_COLS).single();
    if (error) {
      // Unique live key: someone else just created it.
      const again = await findReading(admin, args.birthInputId, args.locale, args.birthHash);
      if (!again) throw error;
      const job = again.status === "generating" ? await latestJob(admin, again.id) : null;
      return { reading: again, job, created: false };
    }
    reading = data as ReadingRow;
  }
  const { data: jobRow, error: jobErr } = await admin.from("generation_jobs").insert({
    reading_id: reading.id,
    profile_id: args.profileId,
    kind: "reading",
    status: "queued",
    stage: "queued",
    model: readingModel(),
    notify: args.notify !== false,
  }).select("*").single();
  if (jobErr) throw jobErr;
  const job = shardedEnabled()
    ? await submitShards(admin, jobRow as JobRow, reading)
    : await submitJob(admin, jobRow as JobRow, reading);
  return { reading, job, created: true };
}

/** Restart a failed reading (user tapped "try again"). */
export async function restartReading(admin: SupabaseClient, readingId: string): Promise<void> {
  await admin.from("readings").update({ status: "superseded", updated_at: new Date().toISOString() })
    .eq("id", readingId).in("status", ["failed", "generating"]);
}

function parseContent(text: string | null): V2Content | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as V2Content;
  } catch {
    return null;
  }
}

async function loadReading(admin: SupabaseClient, id: string): Promise<ReadingRow | null> {
  const { data } = await admin.from("readings").select(READING_COLS).eq("id", id).maybeSingle();
  return (data as ReadingRow | null) ?? null;
}

/**
 * Move a job forward. Cheap when nothing changed (debounced retrieve); does the validation
 * + optional repair + save inline once the background response completes.
 */
export async function advanceJob(
  admin: SupabaseClient,
  jobIn: JobRow,
  opts: { force?: boolean; fromClient?: boolean; onReady?: ReadyHook } = {},
): Promise<JobRow> {
  let job = jobIn;
  const now = Date.now();
  if (opts.fromClient) {
    job = await updateJob(admin, job.id, { client_seen_at: new Date().toISOString() });
  }
  if (job.status === "succeeded" || job.status === "failed" || job.status === "cancelled") return job;
  const reading = await loadReading(admin, job.reading_id);
  if (!reading) return job;
  if (reading.status === "superseded") {
    return await updateJob(admin, job.id, { status: "cancelled", stage: "superseded", finished_at: new Date().toISOString() });
  }
  // Sharded jobs (and legacy jobs that are waiting for a resubmit) take the sharded path.
  if (job.shards || (job.status === "queued" && shardedEnabled())) {
    return await advanceSharded(admin, job, reading, opts);
  }

  if (job.status === "queued") {
    if (job.attempts >= maxAttempts()) return await failJob(admin, job, reading, job.error ?? "max_attempts");
    // Back off between retries; the 20s sweep picks the job up again.
    const lastTouch = Date.parse(job.last_polled_at ?? job.created_at);
    if (job.attempts > 0 && now - lastTouch < retryBackoffMs(job.attempts)) return job;
    return await submitJob(admin, job, reading);
  }

  if (job.status === "processing") {
    const claimed = job.claimed_until ? Date.parse(job.claimed_until) : 0;
    if (claimed > now) return job;
    // Previous processor died: fall through and redo processing.
  }

  const started = job.started_at ? Date.parse(job.started_at) : Date.parse(job.created_at);
  if (job.status === "running") {
    const last = job.last_polled_at ? Date.parse(job.last_polled_at) : 0;
    if (!opts.force && now - last < POLL_DEBOUNCE_MS) return job;
  }
  if (!job.openai_response_id) return await updateJob(admin, job.id, { status: "queued" });

  let resp: ResponseObject;
  try {
    resp = await retrieveResponse(job.openai_response_id);
  } catch (e) {
    return await updateJob(admin, job.id, {
      last_polled_at: new Date().toISOString(),
      error: (e instanceof Error ? e.message : String(e)).slice(0, 300),
    });
  }

  if (resp.status === "queued" || resp.status === "in_progress") {
    if (now - started > JOB_TIMEOUT_MS) {
      const attempts = job.attempts;
      await logCall(admin, { job_id: job.id, profile_id: job.profile_id, purpose: "reading", model: job.model ?? readingModel(), response_id: resp.id, locale: reading.locale, status: "timeout", latency_ms: now - started });
      if (attempts >= maxAttempts()) return await failJob(admin, job, reading, "timeout");
      return await updateJob(admin, job.id, { status: "queued", stage: "retrying", error: "timeout", started_at: new Date().toISOString(), last_polled_at: new Date().toISOString() });
    }
    return await updateJob(admin, job.id, { last_polled_at: new Date().toISOString(), stage: "writing" });
  }

  // Terminal on OpenAI's side: claim processing so only one worker validates and saves.
  const { data: claimedRows } = await admin.from("generation_jobs").update({
    status: "processing",
    stage: "checking",
    claimed_until: new Date(now + CLAIM_MS).toISOString(),
    last_polled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", job.id).in("status", ["running", "processing"]).or(`claimed_until.is.null,claimed_until.lt.${new Date(now).toISOString()}`).select("*");
  const claimed = (claimedRows ?? [])[0] as JobRow | undefined;
  if (!claimed) return job;
  job = claimed;

  const latency = now - started;
  const model = resp.model ?? job.model ?? readingModel();
  const usageCost = await logCall(admin, {
    job_id: job.id, profile_id: job.profile_id, purpose: "reading", model, response_id: resp.id,
    locale: reading.locale, status: resp.status, usage: resp.usage, latency_ms: latency,
    error: resp.error ?? resp.incomplete_reason, meta: { attempt: job.attempts },
  });
  const totals = {
    input_tokens: job.input_tokens + (resp.usage?.input_tokens ?? 0),
    cached_tokens: job.cached_tokens + (resp.usage?.cached_tokens ?? 0),
    output_tokens: job.output_tokens + (resp.usage?.output_tokens ?? 0),
    reasoning_tokens: job.reasoning_tokens + (resp.usage?.reasoning_tokens ?? 0),
    cost_usd: Number(job.cost_usd ?? 0) + usageCost,
  };

  const facts = reading.facts!;
  const content = resp.status === "completed" ? parseContent(resp.output_text) : null;
  const validation: Validation | null = content ? validateContent(sanitizeContent(content, facts), facts) : null;
  if (!content || !validation || !validation.ok) {
    const why = !content
      ? `no_content:${resp.status}:${resp.error ?? resp.incomplete_reason ?? ""}`
      : `invalid:${validation?.fatal.join(";")}`;
    // A free-tier daily cap is not a bad attempt: park the job (no attempt burned) and retry later.
    const dayCap = isQuotaCap(why);
    if (job.attempts >= maxAttempts() && !dayCap) {
      await updateJob(admin, job.id, { ...totals, validation: validation as never });
      return await failJob(admin, { ...job, ...totals }, reading, why);
    }
    const queued = await updateJob(admin, job.id, {
      ...totals, status: "queued", stage: "retrying", error: why.slice(0, 500), validation: validation as never,
      openai_response_id: null, claimed_until: null,
      ...(dayCap ? { attempts: Math.max(1, job.attempts - 1) } : {}),
      last_polled_at: new Date(Date.now() + (dayCap ? QUOTA_PARK_MS : 0)).toISOString(),
    });
    return queued; // resubmitted by the sweep after retryBackoffMs()
  }

  return await polishAndSave(admin, job, reading, sanitizeContent(content, facts), validation, totals, model, opts);
}

type Totals = { input_tokens: number; cached_tokens: number; output_tokens: number; reasoning_tokens: number; cost_usd: number };

/** Shared tail: one targeted repair (if flagged), save ready, supersede older, notify. */
async function polishAndSave(
  admin: SupabaseClient,
  jobIn: JobRow,
  reading: ReadingRow,
  contentIn: V2Content,
  validationIn: Validation,
  totals: Totals,
  model: string,
  opts: { onReady?: ReadyHook },
): Promise<JobRow> {
  let job = jobIn;
  let content = contentIn;
  let validation = validationIn;
  const facts = reading.facts!;
  let repairs = job.repairs;
  const scope = repairScope(validation);
  if (scope && repairs < 1) {
    await updateJob(admin, job.id, { stage: "polishing" });
    const t0 = Date.now();
    try {
      const r = await createWithSchema(facts, {
        model: job.model ?? model,
        system: buildSystemPrompt(facts),
        user: repairPrompt(facts, content, validation, scope),
        scope,
        background: false,
        metadata: { job_id: job.id, purpose: "repair" },
        // The repair polishes a full-quality draft: keep it on the strong models (a lite model
        // timed out on the Telugu repair on 1 Nov). If they're busy, ship unrepaired.
        chainDepth: 2,
      });
      const cost = await logCall(admin, {
        job_id: job.id, profile_id: job.profile_id, purpose: "repair", model, response_id: r.id,
        locale: reading.locale, status: r.status, usage: r.usage, latency_ms: Date.now() - t0,
        meta: { flagged: validation.flags.length },
      });
      totals.input_tokens += r.usage?.input_tokens ?? 0;
      totals.cached_tokens += r.usage?.cached_tokens ?? 0;
      totals.output_tokens += r.usage?.output_tokens ?? 0;
      totals.reasoning_tokens += r.usage?.reasoning_tokens ?? 0;
      totals.cost_usd += cost;
      const patch = parseContent(r.output_text);
      if (patch) {
        content = sanitizeContent(mergeRepair(content, patch), facts);
        const after = validateContent(content, facts);
        validation = { ...after, stats: { ...after.stats, flagged_before_repair: validation.flags.length } };
      }
    } catch (e) {
      await logCall(admin, {
        job_id: job.id, profile_id: job.profile_id, purpose: "repair", model, locale: reading.locale,
        status: "error", error: (e instanceof Error ? e.message : String(e)).slice(0, 300), latency_ms: Date.now() - t0,
      });
    }
    repairs += 1;
  }

  const readyAt = new Date().toISOString();
  const { data: saved, error: saveErr } = await admin.from("readings").update({
    status: "ready",
    content,
    validation,
    model,
    provider: providerOf(model),
    ready_at: readyAt,
    updated_at: readyAt,
  }).eq("id", reading.id).eq("status", "generating").select(READING_COLS).maybeSingle();
  if (saveErr) throw saveErr;
  // Older readings for the same chart + language are replaced.
  await admin.from("readings").update({ status: "superseded", updated_at: readyAt })
    .eq("birth_input_id", reading.birth_input_id).eq("locale", reading.locale)
    .neq("id", reading.id).in("status", ["ready"]);
  job = await updateJob(admin, job.id, {
    ...totals,
    repairs,
    status: "succeeded",
    stage: "ready",
    validation: validation as never,
    finished_at: readyAt,
    claimed_until: null,
    error: null,
  });
  if (saved && opts.onReady) {
    try {
      await opts.onReady(admin, saved as ReadingRow, job);
    } catch (e) {
      console.warn("[reading] onReady hook failed", e instanceof Error ? e.message : e);
    }
  }
  // v4: the reading is usable now (7 written days + engine cards); write the remaining days in
  // the background so Calendar/Today keep their full written copy (Pro value).
  if (saved && isV4(facts)) background(fillDaysV4(admin, reading.id).then(() => {}));
  return job;
}

/** Keep a task alive past the response (edge waitUntil) or just let it run. */
export { repairNew as repairNewItems };

export function background(task: Promise<unknown>): void {
  const guarded = task.catch((e) => console.warn("[reading] background task failed", e instanceof Error ? e.message : e));
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(guarded);
}

export type JobProgress = {
  state: "queued" | "generating" | "ready" | "failed";
  stage: string;
  pct: number;
  elapsed_ms: number;
  expected_ms: number;
  attempt: number;
  slow: boolean;
  job_id: string | null;
  reading_id: string;
  /** Sharded jobs: parts done / total and the Decode preview from part A. */
  shards?: { done: number; total: number };
  preview?: ReadingPreview | null;
  first_insight_ms?: number | null;
};

export function expectedMs(locale: string): number {
  if (shardedEnabled()) return locale === "en" ? 40_000 : 55_000;
  return locale === "en" ? 75_000 : 105_000;
}

export function jobProgress(reading: ReadingRow, job: JobRow | null): JobProgress {
  const expected = expectedMs(reading.locale);
  if (reading.status === "ready") {
    return { state: "ready", stage: "ready", pct: 100, elapsed_ms: 0, expected_ms: expected, attempt: job?.attempts ?? 1, slow: false, job_id: job?.id ?? null, reading_id: reading.id };
  }
  const started = Date.parse(job?.started_at ?? job?.created_at ?? reading.created_at);
  const elapsed = Math.max(0, Date.now() - started);
  const failed = reading.status === "failed" || job?.status === "failed";
  const stage = failed ? "failed" : job?.stage ?? "queued";
  let pct = 4;
  if (stage === "writing" || stage === "retrying") pct = Math.min(88, 6 + 82 * (1 - Math.exp(-elapsed / (expected * 0.55))));
  const sp = shardProgress(reading, job);
  if (sp && (stage === "writing" || stage === "retrying")) pct = Math.max(pct, Math.min(88, 8 + Math.round((80 * sp.done) / sp.total)));
  if (stage === "checking") pct = 92;
  if (stage === "polishing") pct = 95;
  return {
    ...(sp ? { shards: { done: sp.done, total: sp.total }, preview: sp.preview, first_insight_ms: sp.first_insight_ms } : {}),
    state: failed ? "failed" : stage === "queued" ? "queued" : "generating",
    stage,
    pct: Math.round(pct),
    elapsed_ms: elapsed,
    expected_ms: expected,
    attempt: job?.attempts ?? 0,
    slow: elapsed > expected * 1.6,
    job_id: job?.id ?? null,
    reading_id: reading.id,
  };
}

/** pg_cron / webhook entry: drive jobs nobody is polling. */
export async function sweepReadingJobs(
  admin: SupabaseClient,
  onReady: ReadyHook,
  opts?: { limit?: number; responseId?: string },
): Promise<Record<string, unknown>> {
  let q = admin.from("generation_jobs").select("*").in("status", ["queued", "running", "processing"]);
  if (opts?.responseId) q = q.eq("openai_response_id", opts.responseId);
  else q = q.lt("last_polled_at", new Date(Date.now() - 8_000).toISOString());
  const { data, error } = await q.order("updated_at", { ascending: true }).limit(opts?.limit ?? 4);
  if (error) throw error;
  const rows = (data ?? []) as JobRow[];
  // Jobs that never got a poll stamp (create failed before the first update).
  if (!opts?.responseId) {
    const { data: fresh } = await admin.from("generation_jobs").select("*")
      .in("status", ["queued"]).is("last_polled_at", null).limit(2);
    for (const r of (fresh ?? []) as JobRow[]) if (!rows.find((x) => x.id === r.id)) rows.push(r);
  }
  const results: Record<string, unknown>[] = [];
  for (const job of rows) {
    try {
      const after = await advanceJob(admin, job, { force: true, onReady });
      results.push({ id: job.id, status: after.status, stage: after.stage });
    } catch (e) {
      results.push({ id: job.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { considered: rows.length, results };
}

// ---------------------------------------------------------------- sharded generation

const SHARD_TRIES = 2;
const SHARD_TIMEOUT_MS = 6 * 60_000;
const SHARD_CLAIM_MS = 40_000;

/** Submit every shard that is not done yet (in parallel). Done shards are kept: resumable. */
export async function submitShards(admin: SupabaseClient, job: JobRow, reading: ReadingRow): Promise<JobRow> {
  const facts = reading.facts!;
  const plans = planShards(facts);
  const prev = job.shards?.parts ?? {};
  const parts: ShardState["parts"] = {};
  const pending = plans.filter((p) => prev[p.key]?.status !== "done");
  for (const p of plans) if (prev[p.key]?.status === "done") parts[p.key] = prev[p.key];
  // v4: part A (Decode) runs inline as a streamed foreground call, so the first insight does
  // not wait on background polling; everything else is background with no stagger.
  const inlineA = isV4(facts) && inlineAEnabled() && pending.some((p) => p.key === "A");
  if (inlineA) {
    const a = pending.find((p) => p.key === "A")!;
    pending.splice(pending.indexOf(a), 1);
    parts.A = { status: "inline", rid: null, tries: (prev.A?.tries ?? 0) + 1, submitted_at: new Date().toISOString() };
  }
  const submit = (p: (typeof plans)[number]) =>
    shardCall(facts, p, {
      background: true,
      metadata: { job_id: job.id, reading_id: reading.id, locale: reading.locale, shard: p.key },
      cacheKey: `rd:${reading.id}`,
    });
  // Part A first; the rest a few seconds later so they read the shared prefix from the prompt cache.
  const first = pending.find((p) => p.key === "A");
  const rest = pending.filter((p) => p !== first);
  const results: PromiseSettledResult<Awaited<ReturnType<typeof submit>>>[] = new Array(pending.length);
  if (first && rest.length && isV3(facts)) {
    const [a] = await Promise.allSettled([submit(first)]);
    results[pending.indexOf(first)] = a;
    await new Promise((r) => setTimeout(r, shardStaggerMs()));
    const rs = await Promise.allSettled(rest.map(submit));
    rest.forEach((p, i) => (results[pending.indexOf(p)] = rs[i]));
  } else {
    const rs = await Promise.allSettled(pending.map(submit));
    rs.forEach((r, i) => (results[i] = r));
  }
  let firstErr = "";
  pending.forEach((p, i) => {
    const r = results[i];
    const tries = (prev[p.key]?.status === "done" ? 0 : prev[p.key]?.tries ?? 0) + 1;
    if (r.status === "fulfilled") {
      parts[p.key] = { status: "running", rid: r.value.id, tries, submitted_at: new Date().toISOString() };
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      firstErr ||= msg;
      parts[p.key] = { status: "queued", rid: null, tries, error: msg.slice(0, 200) };
    }
  });
  if (firstErr) {
    await logCall(admin, {
      job_id: job.id, profile_id: job.profile_id, purpose: "reading_shard", model: readingModel(), locale: reading.locale,
      status: "create_failed", error: firstErr.slice(0, 500),
    });
  }
  const anyRunning = Object.values(parts).some((x) => x?.status === "running" || x?.status === "inline");
  const dayCap = firstErr ? isQuotaCap(firstErr) : false;
  if (inlineA) background(runInlineA(admin, job.id, reading));
  return await updateJob(admin, job.id, {
    status: anyRunning ? "running" : "queued",
    stage: anyRunning ? "writing" : "retrying",
    model: readingModel(),
    shards: { v: 1, parts },
    openai_response_id: parts.A?.status === "running" ? parts.A.rid : job.openai_response_id,
    attempts: Math.max(job.attempts, 1),
    started_at: job.started_at ?? new Date().toISOString(),
    error: firstErr ? firstErr.slice(0, 500) : null,
    claimed_until: null,
    last_polled_at: new Date(Date.now() + (dayCap ? QUOTA_PARK_MS : 0)).toISOString(),
  });
}

async function advanceSharded(
  admin: SupabaseClient,
  jobIn: JobRow,
  reading: ReadingRow,
  opts: { force?: boolean; onReady?: ReadyHook },
): Promise<JobRow> {
  let job = jobIn;
  const now = Date.now();
  const last = job.last_polled_at ? Date.parse(job.last_polled_at) : 0;
  if (!opts.force && now - last < POLL_DEBOUNCE_MS) return job;
  // One worker at a time per job (client polls + 20s sweep + webhook relay).
  const { data: claimedRows } = await admin.from("generation_jobs").update({
    claimed_until: new Date(now + SHARD_CLAIM_MS).toISOString(),
    last_polled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", job.id).in("status", ["queued", "running", "processing"])
    .or(`claimed_until.is.null,claimed_until.lt.${new Date(now).toISOString()}`).select("*");
  const claimed = (claimedRows ?? [])[0] as JobRow | undefined;
  if (!claimed) return job;
  job = claimed;
  const facts = reading.facts!;
  const plans = planShards(facts);
  const parts: ShardState["parts"] = { ...(job.shards?.parts ?? {}) };

  if (job.status === "queued") {
    if (!job.shards && job.attempts >= maxAttempts()) return await failJob(admin, job, reading, job.error ?? "max_attempts");
    if (job.attempts > 0 && job.shards && now - last < retryBackoffMs(job.attempts)) {
      return await updateJob(admin, job.id, { claimed_until: null, last_polled_at: job.last_polled_at });
    }
    return await submitShards(admin, job, reading);
  }

  const totals: Totals = {
    input_tokens: job.input_tokens, cached_tokens: job.cached_tokens, output_tokens: job.output_tokens,
    reasoning_tokens: job.reasoning_tokens, cost_usd: Number(job.cost_usd ?? 0),
  };
  let firstInsight = job.first_insight_ms ?? null;
  let exhausted = "";
  for (const p of plans) {
    const e = parts[p.key];
    // An inline part whose worker died (timeout, instance recycled): hand it to the background path.
    if (e?.status === "inline" && now - Date.parse(e.submitted_at ?? job.created_at) > INLINE_STALE_MS) {
      parts[p.key] = { status: "queued", rid: null, tries: e.tries, error: "inline_timeout" };
    }
  }
  const running = plans.filter((p) => parts[p.key]?.status === "running" && parts[p.key]?.rid);
  const fetched = await Promise.allSettled(running.map((p) => retrieveResponse(parts[p.key]!.rid!)));
  const retry: typeof plans = [];
  for (let i = 0; i < running.length; i++) {
    const p = running[i];
    const e = parts[p.key]!;
    const r = fetched[i];
    if (r.status === "rejected") continue; // transient retrieve error: try next poll
    const resp = r.value;
    const sub = e.submitted_at ? Date.parse(e.submitted_at) : Date.parse(job.started_at ?? job.created_at);
    if (resp.status === "queued" || resp.status === "in_progress") {
      if (now - sub > SHARD_TIMEOUT_MS) {
        e.error = "timeout";
        retry.push(p);
      }
      continue;
    }
    const cost = await logCall(admin, {
      job_id: job.id, profile_id: job.profile_id, purpose: "reading_shard", model: resp.model ?? readingModel(), response_id: resp.id,
      locale: reading.locale, status: resp.status, usage: resp.usage, latency_ms: now - sub,
      error: resp.error ?? resp.incomplete_reason, meta: { shard: p.key, effort: shardEffort(p.key), tries: e.tries, cached: resp.usage?.cached_tokens ?? 0 },
    });
    totals.input_tokens += resp.usage?.input_tokens ?? 0;
    totals.cached_tokens += resp.usage?.cached_tokens ?? 0;
    totals.output_tokens += resp.usage?.output_tokens ?? 0;
    totals.reasoning_tokens += resp.usage?.reasoning_tokens ?? 0;
    totals.cost_usd += cost;
    const parsed = resp.status === "completed" ? parseContent(resp.output_text) : null;
    const missing = parsed && isV3(facts) ? shardMissing(p, parsed as Partial<V2Content>) : [];
    // v4: a part written in the wrong script (seen: Telugu drifting to Tamil) is retried once.
    if (parsed && isV4(facts) && e.tries < SHARD_TRIES && offScriptShare(facts, parsed as Partial<V2Content>) > 0.3) missing.push("off_script");
    // Union-schema parts may skip ids: retry once, then accept what came back (validation decides).
    const content = parsed && (missing.length === 0 || e.tries >= SHARD_TRIES)
      ? (isV3(facts) ? shardOnly(p, parsed as Partial<V2Content>) : parsed)
      : null;
    if (content) {
      parts[p.key] = { ...e, status: "done", ms: now - sub, content: content as unknown as Record<string, unknown>, error: missing.length ? `partial:${missing.slice(0, 5).join(",")}` : undefined };
      if (p.key === "A" && firstInsight == null) firstInsight = now - Date.parse(job.created_at);
    } else {
      e.error = parsed
        ? `missing:${missing.slice(0, 6).join(",")}`.slice(0, 200)
        : `no_content:${resp.status}:${resp.error ?? resp.incomplete_reason ?? ""}`.slice(0, 200);
      retry.push(p);
    }
  }
  for (const p of plans) {
    const e = parts[p.key];
    if (!e) parts[p.key] = { status: "queued", rid: null, tries: 0 };
    else if (e.status === "queued" && !retry.includes(p)) retry.push(p);
    // inline parts are being written by their own worker: leave them alone.
  }
  // One bounded retry per shard; then the job parks (done shards kept) or fails.
  const again = retry.filter((p) => (parts[p.key]?.tries ?? 0) < SHARD_TRIES);
  const out = retry.filter((p) => (parts[p.key]?.tries ?? 0) >= SHARD_TRIES);
  if (again.length) {
    const res = await Promise.allSettled(again.map((p) =>
      shardCall(facts, p, { background: true, metadata: { job_id: job.id, reading_id: reading.id, shard: p.key }, cacheKey: `rd:${reading.id}` })
    ));
    again.forEach((p, i) => {
      const r = res[i];
      const prev = parts[p.key]!;
      parts[p.key] = r.status === "fulfilled"
        ? { status: "running", rid: r.value.id, tries: prev.tries + 1, submitted_at: new Date().toISOString() }
        : { status: "queued", rid: null, tries: prev.tries + 1, error: String(r.reason instanceof Error ? r.reason.message : r.reason).slice(0, 200) };
    });
  }
  if (out.length) exhausted = out.map((p) => `${p.key}:${parts[p.key]?.error ?? "failed"}`).join("; ");

  const allDone = plans.every((p) => parts[p.key]?.status === "done");
  if (allDone) {
    const merged = mergeShards(plans.map((p) => parts[p.key]!.content as Partial<V2Content>));
    const content = sanitizeContent(merged, facts);
    const validation = validateContent(content, facts);
    job = await updateJob(admin, job.id, {
      ...totals, status: "processing", stage: "checking", shards: { v: 1, parts }, first_insight_ms: firstInsight,
      claimed_until: new Date(Date.now() + CLAIM_MS).toISOString(),
    });
    if (!validation.ok) {
      if (job.attempts >= maxAttempts()) return await failJob(admin, job, reading, `invalid:${validation.fatal.join(";")}`);
      return await updateJob(admin, job.id, {
        status: "queued", stage: "retrying", attempts: job.attempts + 1, error: `invalid:${validation.fatal.join(";")}`.slice(0, 500),
        validation: validation as never, shards: { v: 1, parts: {} }, claimed_until: null, last_polled_at: new Date().toISOString(),
      });
    }
    return await polishAndSave(admin, job, reading, content, validation, totals, readingModel(), opts);
  }
  if (exhausted) {
    const dayCap = isQuotaCap(exhausted);
    if (job.attempts >= maxAttempts() && !dayCap) {
      await updateJob(admin, job.id, { ...totals, shards: { v: 1, parts }, first_insight_ms: firstInsight });
      return await failJob(admin, job, reading, exhausted);
    }
    for (const p of out) parts[p.key] = { status: "queued", rid: null, tries: 0, error: parts[p.key]?.error };
    const stillRunning = plans.some((p) => parts[p.key]?.status === "running");
    return await updateJob(admin, job.id, {
      ...totals, shards: { v: 1, parts }, first_insight_ms: firstInsight, error: exhausted.slice(0, 500),
      attempts: dayCap ? job.attempts : job.attempts + 1,
      ...(stillRunning ? {} : { status: "queued", stage: "retrying" }),
      claimed_until: null, last_polled_at: new Date(Date.now() + (dayCap ? QUOTA_PARK_MS : 0)).toISOString(),
    });
  }
  return await updateJob(admin, job.id, {
    ...totals, status: "running", stage: "writing", shards: { v: 1, parts }, first_insight_ms: firstInsight,
    claimed_until: null, last_polled_at: new Date().toISOString(),
  });
}

/** Shard progress + the Decode preview (profile, current chapter, today) once part A is in. */
export function shardProgress(reading: ReadingRow, job: JobRow | null): { done: number; total: number; preview: ReadingPreview | null; first_insight_ms: number | null } | null {
  if (!job?.shards || !reading.facts) return null;
  const plans = planShards(reading.facts);
  const parts = job.shards.parts ?? {};
  const done = plans.filter((p) => parts[p.key]?.status === "done").length;
  const a = parts.A?.status === "done" ? parts.A.content as Partial<V2Content> : null;
  // v4: the preview uses every finished part (A = profile, B = chapters, C = days).
  const merged = a && isV4(reading.facts)
    ? mergeShards(plans.filter((p) => parts[p.key]?.status === "done").map((p) => parts[p.key]!.content as Partial<V2Content>))
    : a;
  return { done, total: plans.length, preview: merged ? previewFrom(reading.facts, merged) : null, first_insight_ms: job.first_insight_ms ?? null };
}

// ---------------------------------------------------------------- v4 progressive generation

const INLINE_STALE_MS = 120_000;
const INLINE_TIMEOUT_MS = 90_000;
const FILL_TIMEOUT_MS = 150_000;
const FILL_TRIES = 3;
const FILL_STALE_MS = 5 * 60_000;

export function inlineAEnabled(): boolean {
  return (Deno.env.get("READING_INLINE_A") ?? "1") !== "0";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Claim the job row (same lock as advanceSharded), apply a patch to fresh shard state, release. */
async function withJobClaim(admin: SupabaseClient, jobId: string, fn: (job: JobRow) => Partial<JobRow> | null): Promise<boolean> {
  for (let i = 0; i < 80; i++) {
    const now = Date.now();
    const { data } = await admin.from("generation_jobs").update({
      claimed_until: new Date(now + 15_000).toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", jobId).in("status", ["queued", "running", "processing"])
      .or(`claimed_until.is.null,claimed_until.lt.${new Date(now).toISOString()}`).select("*");
    const job = (data ?? [])[0] as JobRow | undefined;
    if (job) {
      const patch = fn(job);
      // last_polled_at in the past so the next poll/sweep advances the job right away.
      await updateJob(admin, jobId, { ...(patch ?? {}), claimed_until: null, last_polled_at: new Date(Date.now() - 10_000).toISOString() });
      return true;
    }
    const { data: still } = await admin.from("generation_jobs").select("status").eq("id", jobId).maybeSingle();
    if (!still || !["queued", "running", "processing"].includes(String((still as { status: string }).status))) return false;
    await sleep(750);
  }
  return false;
}

/** Inline part A: a streamed foreground call; the result lands in the job's shard state. */
export async function runInlineA(admin: SupabaseClient, jobId: string, reading: ReadingRow): Promise<void> {
  const facts = reading.facts!;
  const plan = planShards(facts).find((p) => p.key === "A")!;
  const t0 = Date.now();
  let firstToken: number | null = null;
  let resp: ResponseObject | null = null;
  let err = "";
  try {
    resp = await shardCall(facts, plan, {
      background: false, timeoutMs: INLINE_TIMEOUT_MS,
      metadata: { job_id: jobId, reading_id: reading.id, locale: reading.locale, shard: "A" },
      stream: { onFirstToken: (ms) => (firstToken = ms) },
    });
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }
  const ms = Date.now() - t0;
  const parsed = resp?.status === "completed" ? parseContent(resp.output_text) : null;
  const { data: jrow } = await admin.from("generation_jobs").select("profile_id, created_at").eq("id", jobId).maybeSingle();
  const cost = await logCall(admin, {
    job_id: jobId, profile_id: (jrow as { profile_id?: string } | null)?.profile_id ?? reading.profile_id, purpose: "reading_shard",
    model: resp?.model ?? readingModel(), response_id: resp?.id ?? null, locale: reading.locale,
    status: resp?.status ?? "error", usage: resp?.usage, latency_ms: ms, error: err ? err.slice(0, 300) : resp?.error ?? resp?.incomplete_reason,
    meta: { shard: "A", inline: true, first_token_ms: firstToken },
  });
  await withJobClaim(admin, jobId, (job) => {
    const parts = { ...(job.shards?.parts ?? {}) };
    const e = parts.A;
    if (e?.status !== "inline") return null; // superseded (timed out and resubmitted): drop it
    const patch: Partial<JobRow> = {
      input_tokens: job.input_tokens + (resp?.usage?.input_tokens ?? 0),
      cached_tokens: job.cached_tokens + (resp?.usage?.cached_tokens ?? 0),
      output_tokens: job.output_tokens + (resp?.usage?.output_tokens ?? 0),
      reasoning_tokens: job.reasoning_tokens + (resp?.usage?.reasoning_tokens ?? 0),
      cost_usd: Number(job.cost_usd ?? 0) + cost,
    };
    if (parsed) {
      parts.A = { ...e, status: "done", ms, content: parsed as unknown as Record<string, unknown> };
      if (job.first_insight_ms == null) patch.first_insight_ms = Date.now() - Date.parse(job.created_at);
    } else {
      parts.A = { status: "queued", rid: null, tries: e.tries, error: (err || `no_content:${resp?.status ?? ""}`).slice(0, 200) };
    }
    patch.shards = { v: 1, parts };
    return patch;
  });
}

type FillState = { status: "running" | "done" | "failed"; tries: number; at: string; days?: number; chapters?: number; cost_usd?: number; ms?: number; error?: string; flagged?: number };

async function addJobCost(admin: SupabaseClient, readingId: string, add: Totals): Promise<void> {
  const job = await latestJob(admin, readingId);
  if (!job) return;
  await admin.from("generation_jobs").update({
    input_tokens: job.input_tokens + add.input_tokens, cached_tokens: job.cached_tokens + add.cached_tokens,
    output_tokens: job.output_tokens + add.output_tokens, reasoning_tokens: job.reasoning_tokens + add.reasoning_tokens,
    cost_usd: Number(job.cost_usd ?? 0) + add.cost_usd, updated_at: new Date().toISOString(),
  }).eq("id", job.id);
}

/** Run part plans in parallel (foreground), log each, return parsed parts + totals. */
async function runParts(
  admin: SupabaseClient,
  reading: ReadingRow,
  content: V2Content,
  plans: ReturnType<typeof fillPlansV4>,
  jobId: string | null,
): Promise<{ parts: Partial<V2Content>[]; totals: Totals; errors: string[] }> {
  const facts = reading.facts!;
  const totals: Totals = { input_tokens: 0, cached_tokens: 0, output_tokens: 0, reasoning_tokens: 0, cost_usd: 0 };
  const t0 = Date.now();
  const call = async (p: (typeof plans)[number]) => {
    const go = () => shardCall(facts, p, { background: false, timeoutMs: FILL_TIMEOUT_MS, content, metadata: { reading_id: reading.id, shard: p.key } });
    const r = await go();
    const parsed = r.status === "completed" ? parseContent(r.output_text) : null;
    if (!parsed || offScriptShare(facts, parsed) <= 0.3) return r;
    // Wrong script (model drift): log the first try and write the part again once.
    totals.cost_usd += await logCall(admin, {
      job_id: jobId, profile_id: reading.profile_id, purpose: "reading_shard", model: r.model ?? readingModel(), response_id: r.id,
      locale: reading.locale, status: "off_script", usage: r.usage, latency_ms: Date.now() - t0, meta: { shard: p.key, retry: true },
    });
    totals.input_tokens += r.usage?.input_tokens ?? 0;
    totals.output_tokens += r.usage?.output_tokens ?? 0;
    return await go();
  };
  const res = await Promise.allSettled(plans.map(call));
  const parts: Partial<V2Content>[] = [];
  const errors: string[] = [];
  for (let i = 0; i < plans.length; i++) {
    const r = res[i];
    const resp = r.status === "fulfilled" ? r.value : null;
    const err = r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : "";
    totals.cost_usd += await logCall(admin, {
      job_id: jobId, profile_id: reading.profile_id, purpose: "reading_shard", model: resp?.model ?? readingModel(),
      response_id: resp?.id ?? null, locale: reading.locale, status: resp?.status ?? "error", usage: resp?.usage,
      latency_ms: Date.now() - t0, error: err ? err.slice(0, 300) : resp?.error ?? resp?.incomplete_reason, meta: { shard: plans[i].key },
    });
    totals.input_tokens += resp?.usage?.input_tokens ?? 0;
    totals.cached_tokens += resp?.usage?.cached_tokens ?? 0;
    totals.output_tokens += resp?.usage?.output_tokens ?? 0;
    totals.reasoning_tokens += resp?.usage?.reasoning_tokens ?? 0;
    const parsed = resp?.status === "completed" ? parseContent(resp.output_text) : null;
    if (parsed) parts.push(parsed);
    else errors.push(`${plans[i].key}:${err || resp?.status || "no_content"}`.slice(0, 160));
  }
  return { parts, totals, errors };
}

/** Validate the new items in context and run one repair on the flagged ones (if any). */
async function repairNew(
  admin: SupabaseClient,
  reading: ReadingRow,
  base: V2Content,
  add: Partial<V2Content>,
  jobId: string | null,
): Promise<{ add: Partial<V2Content>; totals: Totals; flagged: number }> {
  const facts = reading.facts!;
  const totals: Totals = { input_tokens: 0, cached_tokens: 0, output_tokens: 0, reasoning_tokens: 0, cost_usd: 0 };
  const days = new Map((base.days ?? []).map((d) => [d.date, d]));
  for (const d of add.days ?? []) days.set(d.date, d);
  const chs = new Map((base.chapters ?? []).map((c) => [Number(c.chapter_id), c]));
  for (const c of add.chapters ?? []) chs.set(Number(c.chapter_id), c);
  const tmp = sanitizeContent({ ...base, days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)), chapters: [...chs.values()].sort((a, b) => Number(a.chapter_id) - Number(b.chapter_id)) }, facts);
  const v = validateContent(tmp, facts);
  const scope = newItemScope(v, (add.days ?? []).map((d) => d.date), (add.chapters ?? []).map((c) => Number(c.chapter_id)));
  if (!scope) return { add, totals, flagged: 0 };
  const t0 = Date.now();
  try {
    const r = await createWithSchema(facts, {
      system: buildSystemPrompt(facts), user: repairPrompt(facts, tmp, v, scope), scope, background: false, chainDepth: 2,
      metadata: { reading_id: reading.id, purpose: "repair" },
    });
    totals.cost_usd += await logCall(admin, {
      job_id: jobId, profile_id: reading.profile_id, purpose: "repair", model: r.model ?? readingModel(), response_id: r.id,
      locale: reading.locale, status: r.status, usage: r.usage, latency_ms: Date.now() - t0, meta: { flagged: v.flags.length, scope: "new_items" },
    });
    totals.input_tokens += r.usage?.input_tokens ?? 0;
    totals.cached_tokens += r.usage?.cached_tokens ?? 0;
    totals.output_tokens += r.usage?.output_tokens ?? 0;
    totals.reasoning_tokens += r.usage?.reasoning_tokens ?? 0;
    const patch = parseContent(r.output_text);
    if (!patch) return { add, totals, flagged: v.flags.length };
    const fixed = sanitizeContent(mergeRepair(tmp, patch), facts);
    const pickD = new Set((add.days ?? []).map((d) => d.date)), pickC = new Set((add.chapters ?? []).map((c) => Number(c.chapter_id)));
    return {
      add: {
        ...(add.days ? { days: fixed.days.filter((d) => pickD.has(d.date)) } : {}),
        ...(add.chapters ? { chapters: fixed.chapters.filter((c) => pickC.has(Number(c.chapter_id))) } : {}),
      },
      totals, flagged: v.flags.length,
    };
  } catch (e) {
    await logCall(admin, {
      job_id: jobId, profile_id: reading.profile_id, purpose: "repair", model: readingModel(), locale: reading.locale,
      status: "error", error: (e instanceof Error ? e.message : String(e)).slice(0, 300), latency_ms: Date.now() - t0,
    });
    return { add, totals, flagged: v.flags.length };
  }
}

const sumT = (a: Totals, b: Totals): Totals => ({
  input_tokens: a.input_tokens + b.input_tokens, cached_tokens: a.cached_tokens + b.cached_tokens, output_tokens: a.output_tokens + b.output_tokens,
  reasoning_tokens: a.reasoning_tokens + b.reasoning_tokens, cost_usd: a.cost_usd + b.cost_usd,
});

/** Merge new days/chapters into the saved reading (optimistic on updated_at), re-validate, save. */
async function mergeIntoReading(
  admin: SupabaseClient,
  readingId: string,
  add: Partial<V2Content>,
  extra: (validation: Validation & { fill?: FillState }) => Record<string, unknown>,
): Promise<{ ok: boolean; validation?: Validation }> {
  for (let i = 0; i < 4; i++) {
    const { data } = await admin.from("readings").select(`${READING_COLS}, validation`).eq("id", readingId).maybeSingle();
    const r = data as (ReadingRow & { validation: Validation & { fill?: FillState } | null }) | null;
    if (!r || r.status !== "ready" || !r.content || !r.facts) return { ok: false };
    const cur = r.content;
    const days = new Map((cur.days ?? []).map((d) => [d.date, d]));
    for (const d of add.days ?? []) if (!days.has(d.date)) days.set(d.date, d);
    const chapters = new Map((cur.chapters ?? []).map((c) => [Number(c.chapter_id), c]));
    for (const c of add.chapters ?? []) if (!chapters.has(Number(c.chapter_id))) chapters.set(Number(c.chapter_id), c);
    const merged = sanitizeContent({
      ...cur,
      days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
      chapters: [...chapters.values()].sort((a, b) => Number(a.chapter_id) - Number(b.chapter_id)),
    }, r.facts);
    const v = validateContent(merged, r.facts);
    if (!v.ok) return { ok: false, validation: v }; // never replace a good reading with a broken one
    const prevV = (r.validation ?? {}) as Validation & { fill?: FillState };
    const validation = { ...v, ...extra(prevV) } as Validation;
    const { data: upd } = await admin.from("readings").update({ content: merged, validation, updated_at: new Date().toISOString() })
      .eq("id", readingId).eq("updated_at", r.updated_at).select("id");
    if ((upd ?? []).length) return { ok: true, validation };
    await sleep(300 + Math.random() * 500);
  }
  return { ok: false };
}

/** v4 background day fill (after ready, and from the sweep for anything left pending). */
export async function fillDaysV4(admin: SupabaseClient, readingId: string): Promise<Record<string, unknown>> {
  const { data } = await admin.from("readings").select(`${READING_COLS}, validation`).eq("id", readingId).maybeSingle();
  const r = data as (ReadingRow & { validation: (Validation & { fill?: FillState }) | null }) | null;
  if (!r || r.status !== "ready" || !r.content || !r.facts || !isV4(r.facts)) return { skipped: "not_v4_ready" };
  const fill = r.validation?.fill;
  if (fill?.status === "done") return { skipped: "done" };
  if (fill?.status === "running" && Date.now() - Date.parse(fill.at) < FILL_STALE_MS) return { skipped: "running" };
  if ((fill?.tries ?? 0) >= FILL_TRIES) return { skipped: "exhausted" };
  const plans = fillPlansV4(r.facts, r.content);
  const tries = (fill?.tries ?? 0) + 1;
  // Claim (optimistic on updated_at): one filler per reading.
  const claim: FillState = { status: plans.length ? "running" : "done", tries, at: new Date().toISOString() };
  const { data: claimed } = await admin.from("readings").update({
    validation: { ...(r.validation ?? {}), fill: claim }, updated_at: new Date().toISOString(),
  }).eq("id", readingId).eq("updated_at", r.updated_at).select("id");
  if (!(claimed ?? []).length) return { skipped: "raced" };
  if (!plans.length) return { done: true, days: 0 };
  const t0 = Date.now();
  const job = await latestJob(admin, readingId);
  const out = await runParts(admin, r, r.content, plans, job?.id ?? null);
  const days = out.parts.flatMap((p) => p.days ?? []);
  const wanted = new Set(plans.flatMap((p) => p.scope.days ?? []));
  const got = days.filter((d) => wanted.has(d.date));
  // v5: the remaining chapters are written in the same background fill (all chapters up front).
  const wantCh = new Set(plans.flatMap((p) => p.scope.chapters ?? []));
  const gotCh = out.parts.flatMap((p) => p.chapters ?? []).filter((c) => wantCh.has(Number(c.chapter_id)));
  const missing = [
    ...[...wanted].filter((d) => !got.find((x) => x.date === d)),
    ...[...wantCh].filter((id) => !gotCh.find((x) => Number(x.chapter_id) === id)).map(String),
  ];
  const rep = got.length || gotCh.length
    ? await repairNew(admin, r, r.content, { ...(got.length ? { days: got } : {}), ...(gotCh.length ? { chapters: gotCh } : {}) }, job?.id ?? null)
    : null;
  const fixedDays = rep?.add.days?.length ? rep.add.days : got;
  let fixedCh = rep?.add.chapters?.length ? rep.add.chapters : gotCh;
  out.totals = rep ? sumT(out.totals, rep.totals) : out.totals;
  // te/hi script drift (stray Tamil/Kannada words) that the repair did not fix: rewrite those
  // chapters once; any still drifted stay unwritten and are written on demand when opened.
  const drift = (cs: typeof fixedCh) => cs.filter((c) => hasAlien(JSON.stringify(c), r.locale as "en" | "te" | "hi")).map((c) => Number(c.chapter_id));
  const drifted = drift(fixedCh);
  if (drifted.length) {
    const keep = fixedCh.filter((c) => !drifted.includes(Number(c.chapter_id)));
    const base = { ...r.content, chapters: [...(r.content.chapters ?? []), ...keep] };
    const re = await runParts(admin, r, base, [{ key: "L", scope: { chapters: drifted }, maxTokens: 6000, note: "these life chapters" }], job?.id ?? null);
    out.totals = sumT(out.totals, re.totals);
    const again = re.parts.flatMap((p) => p.chapters ?? []).filter((c) => drifted.includes(Number(c.chapter_id)));
    fixedCh = [...keep, ...again.filter((c) => !drift([c]).length)];
  }
  const state: FillState = {
    status: missing.length ? "failed" : "done", tries, at: new Date().toISOString(), days: got.length, chapters: gotCh.length,
    cost_usd: Number(((fill?.cost_usd ?? 0) + out.totals.cost_usd).toFixed(6)), ms: Date.now() - t0,
    ...(out.errors.length || missing.length ? { error: [...out.errors, missing.length ? `missing:${missing.length}` : ""].filter(Boolean).join("; ").slice(0, 300) } : {}),
  };
  const saved = await mergeIntoReading(admin, readingId, { days: fixedDays, ...(fixedCh.length ? { chapters: fixedCh } : {}) }, () => ({ fill: { ...state, flagged: rep?.flagged ?? 0 } }));
  if (!saved.ok) {
    await admin.from("readings").update({ validation: { ...(r.validation ?? {}), fill: { ...state, status: "failed", error: "merge_rejected" } } })
      .eq("id", readingId);
  }
  await addJobCost(admin, readingId, out.totals);
  return { done: saved.ok && !missing.length, days: got.length, missing: missing.length, cost_usd: out.totals.cost_usd, ms: state.ms };
}

/** v4 on demand: write the opened chapter (and its neighbours) and save them into the reading. */
export async function writeChaptersV4(
  admin: SupabaseClient,
  readingId: string,
  chapterId: number,
): Promise<{ written: number[]; already?: boolean; error?: string; cost_usd?: number }> {
  const { data } = await admin.from("readings").select(READING_COLS).eq("id", readingId).maybeSingle();
  const r = data as ReadingRow | null;
  if (!r || r.status !== "ready" || !r.content || !r.facts || !isV4(r.facts)) return { written: [], error: "not_v4_ready" };
  const plan = chapterPlanV4(r.facts, r.content, chapterId);
  if (!plan) return { written: [], already: true };
  const out = await runParts(admin, r, r.content, [plan], (await latestJob(admin, readingId))?.id ?? null);
  const want = new Set(plan.scope.chapters ?? []);
  const raw = out.parts.flatMap((p) => p.chapters ?? []).filter((c) => want.has(Number(c.chapter_id)));
  const rep = raw.length ? await repairNew(admin, r, r.content, { chapters: raw }, null) : null;
  // Never save a chapter in a drifted script; it stays pending and the next open retries.
  const chapters = (rep?.add.chapters?.length ? rep.add.chapters : raw).filter((c) => !hasAlien(JSON.stringify(c), r.locale as "en" | "te" | "hi"));
  if (rep) out.totals = sumT(out.totals, rep.totals);
  await addJobCost(admin, readingId, out.totals);
  if (!chapters.length) return { written: [], error: out.errors.join("; ") || "no_content", cost_usd: out.totals.cost_usd };
  const saved = await mergeIntoReading(admin, readingId, { chapters }, (v) => v.fill ? { fill: v.fill } : {});
  return saved.ok
    ? { written: chapters.map((c) => Number(c.chapter_id)), cost_usd: out.totals.cost_usd }
    : { written: [], error: "merge_rejected", cost_usd: out.totals.cost_usd };
}

/** Sweep: v4 readings whose day fill is pending or failed (bounded tries). */
export async function sweepFillsV4(admin: SupabaseClient, limit = 1): Promise<Record<string, unknown>[]> {
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data } = await admin.from("readings").select("id, validation, ready_at")
    .eq("status", "ready").in("prompt_version", [READING_PROMPT_VERSION_V4, READING_PROMPT_VERSION_V5]).gt("ready_at", since)
    .lt("ready_at", new Date(Date.now() - 90_000).toISOString())
    .order("ready_at", { ascending: false }).limit(25);
  const todo = ((data ?? []) as { id: string; validation: { fill?: FillState } | null }[]).filter((x) => {
    const f = x.validation?.fill;
    if (!f) return true;
    if (f.status === "done" || f.tries >= FILL_TRIES) return false;
    return Date.now() - Date.parse(f.at) > (f.status === "running" ? FILL_STALE_MS : 60_000);
  }).slice(0, limit);
  const out: Record<string, unknown>[] = [];
  for (const x of todo) out.push({ id: x.id, ...(await fillDaysV4(admin, x.id)) });
  return out;
}
