/**
 * Reading v2 job runner: background OpenAI response -> validate -> (one targeted repair) -> ready.
 * Completion is detected by whichever comes first: a client status poll, the pg_cron sweep,
 * or the OpenAI webhook (when configured). All paths call advanceJob(), which is idempotent.
 */
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
  validateContent,
  type V2Content,
  type V2Facts,
  type Validation,
} from "./reading_v2.ts";
import {
  costUsd,
  createResponse,
  readingModel,
  retrieveResponse,
  type ResponseObject,
} from "./openai_responses.ts";

export const MAX_ATTEMPTS = 2;
const POLL_DEBOUNCE_MS = 2500;
const CLAIM_MS = 150_000;
/** A job stuck this long is cancelled and retried / failed. */
const JOB_TIMEOUT_MS = 8 * 60_000;

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
};

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
    purpose: "reading" | "repair" | "ask";
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
    provider: "openai",
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
    meta: row.meta ?? null,
  });
  return cost;
}

export { logCall as logLlmCall };

async function createWithSchema(
  facts: V2Facts,
  args: { system: string; user: string; scope?: Parameters<typeof buildReadingSchema>[1]["scope"]; background: boolean; metadata?: Record<string, string> },
): Promise<ResponseObject> {
  const attempt = (withLengths: boolean) =>
    createResponse({
      model: readingModel(),
      system: args.system,
      user: args.user,
      schemaName: args.scope ? "muhurta_reading_repair" : "muhurta_reading",
      schema: buildReadingSchema(facts, { withLengths, scope: args.scope }),
      background: args.background,
      reasoningEffort: "low",
      maxOutputTokens: args.scope ? 12000 : 40000,
      metadata: args.metadata,
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

/** Submit (or re-submit) the background response for a job. */
export async function submitJob(admin: SupabaseClient, job: JobRow, reading: ReadingRow): Promise<JobRow> {
  const facts = reading.facts!;
  const model = readingModel();
  try {
    const r = await createWithSchema(facts, {
      system: buildSystemPrompt(facts),
      user: buildUserPrompt(facts),
      background: true,
      metadata: { job_id: job.id, reading_id: reading.id, locale: reading.locale },
    });
    return await updateJob(admin, job.id, {
      status: "running",
      stage: "writing",
      model,
      openai_response_id: r.id,
      attempts: job.attempts + 1,
      started_at: job.started_at ?? new Date().toISOString(),
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
    if (attempts >= MAX_ATTEMPTS) return await failJob(admin, job, reading, msg, attempts);
    return await updateJob(admin, job.id, { status: "queued", stage: "retrying", attempts, error: msg.slice(0, 500) });
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
      provider: "openai",
      model: readingModel(),
      prompt_version: READING_PROMPT_VERSION,
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
  const job = await submitJob(admin, jobRow as JobRow, reading);
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

  if (job.status === "queued") {
    if (job.attempts >= MAX_ATTEMPTS) return await failJob(admin, job, reading, job.error ?? "max_attempts");
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
      if (attempts >= MAX_ATTEMPTS) return await failJob(admin, job, reading, "timeout");
      return await updateJob(admin, job.id, { status: "queued", stage: "retrying", error: "timeout", started_at: new Date().toISOString() });
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
  let content = resp.status === "completed" ? parseContent(resp.output_text) : null;
  let validation: Validation | null = content ? validateContent(sanitizeContent(content, facts), facts) : null;
  if (!content || !validation || !validation.ok) {
    const why = !content
      ? `no_content:${resp.status}:${resp.error ?? resp.incomplete_reason ?? ""}`
      : `invalid:${validation?.fatal.join(";")}`;
    if (job.attempts >= MAX_ATTEMPTS) {
      await updateJob(admin, job.id, { ...totals, validation: validation as never });
      return await failJob(admin, { ...job, ...totals }, reading, why);
    }
    const queued = await updateJob(admin, job.id, {
      ...totals, status: "queued", stage: "retrying", error: why.slice(0, 500), validation: validation as never,
      openai_response_id: null, claimed_until: null,
    });
    return await submitJob(admin, queued, reading);
  }

  content = sanitizeContent(content, facts);
  let repairs = job.repairs;
  const scope = repairScope(validation);
  if (scope && repairs < 1) {
    await updateJob(admin, job.id, { stage: "polishing" });
    const t0 = Date.now();
    try {
      const r = await createWithSchema(facts, {
        system: buildSystemPrompt(facts),
        user: repairPrompt(facts, content, validation, scope),
        scope,
        background: false,
        metadata: { job_id: job.id, purpose: "repair" },
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
  return job;
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
};

export function expectedMs(locale: string): number {
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
  if (stage === "checking") pct = 92;
  if (stage === "polishing") pct = 95;
  return {
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
