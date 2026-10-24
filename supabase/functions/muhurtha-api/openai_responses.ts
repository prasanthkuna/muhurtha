/**
 * Thin LLM client behind one Responses-style interface (strict JSON schema, optional background).
 * Used by the v2 single-call reading pipeline, Ask and Bond.
 *
 * Provider: Gemini is primary when GEMINI_API_KEY is set (READING_PROVIDER=openai forces OpenAI).
 * OpenAI stays the fallback: a failed Gemini sync call is retried once on OpenAI, and background
 * jobs get two Gemini attempts, then move to OpenAI (modelForAttempt).
 *
 * Gemini has no background mode, so "background" Gemini calls run inside the current edge
 * invocation via EdgeRuntime.waitUntil and park their result in public.llm_async_responses.
 * retrieveResponse() reads that row for ids starting with "gem_"; a row that outlives
 * GEMINI_ASYNC_TTL_MS (worker killed) reads as failed so the job runner retries.
 */
import { openAiAllowed } from "./llm_policy.ts";
import { createClient } from "@supabase/supabase-js";

export const READING_MODEL_DEFAULT = "gpt-5.4-mini";
export const GEMINI_MODEL_DEFAULT = "gemini-3.6-flash";
const GEMINI_TIMEOUT_MS = 140_000;
const GEMINI_ASYNC_TTL_MS = 170_000;

/** USD per 1M tokens. Cached input is billed at 10% of input. */
const PRICES: Record<string, { input: number; cached: number; output: number }> = {
  "gemini-3.8-flash": { input: 0.75, cached: 0.075, output: 3.75 },
  "gemini-3.6-flash": { input: 0.75, cached: 0.075, output: 3.75 },
  "gemini-3.5-flash-lite": { input: 0.3, cached: 0.03, output: 2.5 },
  "gpt-5.4-mini": { input: 0.75, cached: 0.075, output: 4.5 },
  "gpt-5.4-nano": { input: 0.2, cached: 0.02, output: 1.25 },
  "gpt-5-mini": { input: 0.25, cached: 0.025, output: 2.0 },
};

export type ResponseUsage = {
  input_tokens: number;
  cached_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  total_tokens: number;
};

export type ResponseStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "incomplete"
  | "cancelled";

export type ResponseObject = {
  id: string;
  status: ResponseStatus;
  model?: string;
  output_text: string | null;
  usage: ResponseUsage | null;
  error: string | null;
  incomplete_reason: string | null;
};

export type LlmProvider = "gemini" | "openai";

export function geminiConfigured(): boolean {
  return Boolean(Deno.env.get("GEMINI_API_KEY")?.trim());
}

export function primaryProvider(): LlmProvider {
  const forced = Deno.env.get("READING_PROVIDER")?.trim().toLowerCase();
  if (forced === "openai" && openAiAllowed()) return "openai";
  return geminiConfigured() ? "gemini" : "openai";
}

export function providerOf(model: string | null | undefined): LlmProvider {
  return String(model ?? "").startsWith("gemini") ? "gemini" : "openai";
}

/** The OpenAI model (fallback, or primary when Gemini is off). */
export function openAiModel(): string {
  const m = Deno.env.get("READING_MODEL")?.trim();
  return m && !m.startsWith("gemini") ? m : READING_MODEL_DEFAULT;
}

export function geminiModel(): string {
  return Deno.env.get("GEMINI_READING_MODEL")?.trim() || GEMINI_MODEL_DEFAULT;
}

/** Primary model for readings, Ask and Bond. */
export function readingModel(): string {
  return primaryProvider() === "gemini" ? geminiModel() : openAiModel();
}

/** Gemini models tried in order when one sheds load (same introductory price tier). */
export function geminiChain(first = geminiModel()): string[] {
  // 3.7/3.8-flash think for 45-140s before the first token on this schema, which cannot fit the
  // 150s edge wall clock, so by default the failover model is the same fast 3.6-flash.
  const extra = (Deno.env.get("GEMINI_FALLBACK_MODELS") ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  return [first, ...extra.filter((m) => m !== first)];
}

/** Gemini primary: attempt 0 on the primary Gemini model, attempt 1 on the next (or same) Gemini model, then OpenAI. */
export function modelForAttempt(attempts: number): string {
  if (primaryProvider() !== "gemini") return readingModel();
  const chain = geminiChain();
  if (attempts <= 0) return chain[0];
  if (attempts === 1) return chain[1] ?? chain[0];
  return openAiConfigured() ? openAiModel() : readingModel();
}

export function llmConfigured(): boolean {
  return openAiConfigured() || geminiConfigured();
}

/** True only when the OpenAI fallback is explicitly enabled (LLM_FALLBACK=openai); see llm_policy.ts. */
export function openAiConfigured(): boolean {
  return openAiAllowed();
}

export function costUsd(model: string, u: ResponseUsage | null): number {
  if (!u) return 0;
  const key = Object.keys(PRICES).find((k) => model.startsWith(k)) ?? READING_MODEL_DEFAULT;
  const p = PRICES[key];
  const uncached = Math.max(0, u.input_tokens - u.cached_tokens);
  return (uncached * p.input + u.cached_tokens * p.cached + u.output_tokens * p.output) / 1_000_000;
}

function apiKey(): string {
  if (!openAiAllowed()) throw new Error("openai_disabled");
  const k = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!k) throw new Error("openai_not_configured");
  return k;
}

// deno-lint-ignore no-explicit-any
function parseResponse(raw: any): ResponseObject {
  let text: string | null = typeof raw?.output_text === "string" ? raw.output_text : null;
  if (!text && Array.isArray(raw?.output)) {
    const parts: string[] = [];
    for (const item of raw.output) {
      if (item?.type !== "message" || !Array.isArray(item.content)) continue;
      for (const c of item.content) {
        if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text);
        if (c?.type === "refusal" && typeof c.refusal === "string") parts.push("");
      }
    }
    text = parts.join("") || null;
  }
  const u = raw?.usage;
  const usage: ResponseUsage | null = u
    ? {
      input_tokens: Number(u.input_tokens ?? 0),
      cached_tokens: Number(u.input_tokens_details?.cached_tokens ?? 0),
      output_tokens: Number(u.output_tokens ?? 0),
      reasoning_tokens: Number(u.output_tokens_details?.reasoning_tokens ?? 0),
      total_tokens: Number(u.total_tokens ?? 0),
    }
    : null;
  return {
    id: String(raw?.id ?? ""),
    status: (raw?.status ?? "failed") as ResponseStatus,
    model: raw?.model,
    output_text: text,
    usage,
    error: raw?.error?.message ?? raw?.error?.code ?? null,
    incomplete_reason: raw?.incomplete_details?.reason ?? null,
  };
}

export type CreateResponseInput = {
  model?: string;
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  background?: boolean;
  maxOutputTokens?: number;
  reasoningEffort?: "minimal" | "low" | "medium" | "high" | "none";
  previousResponseId?: string;
  metadata?: Record<string, string>;
  timeoutMs?: number;
};

export async function createResponse(input: CreateResponseInput): Promise<ResponseObject> {
  const model = input.model ?? readingModel();
  if (providerOf(model) === "gemini") {
    if (input.background) return await geminiBackground(model, input);
    try {
      return await geminiCall(model, input, input.timeoutMs ?? GEMINI_TIMEOUT_MS);
    } catch (e) {
      if (!openAiConfigured()) throw e;
      console.warn("[llm] gemini sync failed, falling back to openai", e instanceof Error ? e.message : e);
      return await openAiCreate({ ...input, model: openAiModel() });
    }
  }
  return await openAiCreate({ ...input, model });
}

async function openAiCreate(input: CreateResponseInput & { model: string }): Promise<ResponseObject> {
  const model = input.model;
  const body: Record<string, unknown> = {
    model,
    input: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    text: {
      format: { type: "json_schema", name: input.schemaName, strict: true, schema: input.schema },
      verbosity: "low",
    },
    store: true,
    max_output_tokens: input.maxOutputTokens ?? 32000,
  };
  if (input.background) body.background = true;
  if (input.reasoningEffort) body.reasoning = { effort: input.reasoningEffort };
  if (input.previousResponseId) body.previous_response_id = input.previousResponseId;
  if (input.metadata) body.metadata = input.metadata;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), input.timeoutMs ?? (input.background ? 20_000 : 120_000));
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const raw = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = raw?.error?.message ?? `http_${res.status}`;
      throw new Error(`openai_create_failed:${res.status}:${String(msg).slice(0, 300)}`);
    }
    return parseResponse(raw);
  } finally {
    clearTimeout(t);
  }
}

export async function retrieveResponse(id: string): Promise<ResponseObject> {
  if (id.startsWith("gem_")) return await geminiRetrieve(id);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15_000);
  try {
    const res = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
      signal: ctl.signal,
    });
    const raw = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(`openai_retrieve_failed:${res.status}:${String(raw?.error?.message ?? "").slice(0, 200)}`);
    }
    return parseResponse(raw);
  } finally {
    clearTimeout(t);
  }
}

export async function cancelResponse(id: string): Promise<void> {
  if (id.startsWith("gem_") || !openAiAllowed()) return;
  await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
  }).catch(() => undefined);
}

// ---------------------------------------------------------------- Gemini

/** Gemini's responseJsonSchema is a JSON Schema subset: drop string length/pattern keywords. */
export function geminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(geminiSchema);
  if (!schema || typeof schema !== "object") return schema;
  const src = schema as Record<string, unknown>;
  const isStringSchema = src.type === "string" || (Array.isArray(src.type) && src.type.includes("string"));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (isStringSchema && (k === "maxLength" || k === "minLength" || k === "pattern")) continue;
    if (k === "properties" && v && typeof v === "object") {
      out[k] = Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([pk, pv]) => [pk, geminiSchema(pv)]));
      continue;
    }
    out[k] = k === "enum" || k === "required" ? v : geminiSchema(v);
  }
  return out;
}

function thinkingLevel(effort: CreateResponseInput["reasoningEffort"]): string {
  if (effort === "medium") return "medium";
  if (effort === "high") return "high";
  return "low"; // gemini-3.8-flash rejects "minimal"
}

// deno-lint-ignore no-explicit-any
export function parseGemini(raw: any, model: string, id: string): ResponseObject {
  const cand = raw?.candidates?.[0];
  const parts: { text?: string; thought?: boolean }[] = cand?.content?.parts ?? [];
  const text = parts.filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("") || null;
  const u = raw?.usageMetadata;
  const thoughts = Number(u?.thoughtsTokenCount ?? 0);
  const usage: ResponseUsage | null = u
    ? {
      input_tokens: Number(u.promptTokenCount ?? 0),
      cached_tokens: Number(u.cachedContentTokenCount ?? 0),
      output_tokens: Number(u.candidatesTokenCount ?? 0) + thoughts,
      reasoning_tokens: thoughts,
      total_tokens: Number(u.totalTokenCount ?? 0),
    }
    : null;
  const finish = String(cand?.finishReason ?? "");
  const blocked = raw?.promptFeedback?.blockReason;
  let status: ResponseStatus = "completed";
  let incomplete: string | null = null;
  if (finish === "MAX_TOKENS") {
    status = "incomplete";
    incomplete = "max_output_tokens";
  } else if (blocked || (finish && finish !== "STOP")) {
    status = text ? "completed" : "failed";
    incomplete = String(blocked ?? finish);
  } else if (!text) status = "failed";
  return {
    id,
    status,
    model: String(raw?.modelVersion ?? model),
    output_text: text,
    usage,
    error: status === "failed" ? `gemini_${incomplete ?? "empty"}` : null,
    incomplete_reason: incomplete,
  };
}

/** Internal diagnostics: run one Gemini call and report status / error without throwing. */
export async function geminiProbe(model: string, input: CreateResponseInput, variant: { noThinking?: boolean; noItems?: boolean; noDescriptions?: boolean; schemaInPrompt?: boolean; keepItems?: boolean; timeoutMs?: number }): Promise<Record<string, unknown>> {
  const t0 = Date.now();
  let schema = geminiSchema(input.schema);
  const strip = (v: unknown, keys: string[]): unknown => {
    if (Array.isArray(v)) return v.map((x) => strip(x, keys));
    if (!v || typeof v !== "object") return v;
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k]) => !keys.includes(k)).map(([k, x]) => [k, k === "properties" ? Object.fromEntries(Object.entries(x as Record<string, unknown>).map(([pk, pv]) => [pk, strip(pv, keys)])) : strip(x, keys)]));
  };
  if (variant.noItems) schema = strip(schema, ["minItems", "maxItems"]);
  if (variant.noDescriptions) schema = strip(schema, ["description"]);
  try {
    if (input.schemaName === "__models") {
      const key = Deno.env.get("GEMINI_API_KEY")?.trim() ?? "";
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key } });
      const j = await res.json().catch(() => null);
      return { ok: res.ok, models: (j?.models ?? []).map((m: { name: string; outputTokenLimit?: number }) => `${m.name}:${m.outputTokenLimit ?? ""}`) };
    }
    const r = await geminiCall(model, { ...input, schema: schema as Record<string, unknown> }, variant.timeoutMs ?? 140_000, undefined, variant);
    return { ok: true, ms: Date.now() - t0, status: r.status, len: r.output_text?.length ?? 0, usage: r.usage, incomplete: r.incomplete_reason, model: r.model };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: (e instanceof Error ? e.message : String(e)).slice(0, 900) };
  }
}

/** Gemini rejects (400) array-count keywords on this schema; counts are enforced by our validator + repair. */
export function geminiRequestSchema(schema: unknown): unknown {
  const strip = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(strip);
    if (!v || typeof v !== "object") return v;
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (k === "minItems" || k === "maxItems") continue;
      if (k === "properties" && x && typeof x === "object") {
        out[k] = Object.fromEntries(Object.entries(x as Record<string, unknown>).map(([pk, pv]) => [pk, strip(pv)]));
      } else out[k] = k === "enum" || k === "required" ? x : strip(x);
    }
    return out;
  };
  return strip(geminiSchema(schema));
}

/** Count rules the schema can no longer carry, restated for the model. */
function itemCountRules(schema: unknown, path = ""): string[] {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return [];
  const s = schema as Record<string, unknown>;
  const rules: string[] = [];
  if (s.type === "array" && (s.minItems != null || s.maxItems != null)) {
    const lo = s.minItems as number | undefined, hi = s.maxItems as number | undefined;
    rules.push(`${path || "root"}: ${lo === hi ? `exactly ${lo}` : `${lo ?? 0}-${hi ?? "any"}`} items`);
  }
  if (s.properties && typeof s.properties === "object") {
    for (const [k, v] of Object.entries(s.properties as Record<string, unknown>)) rules.push(...itemCountRules(v, path ? `${path}.${k}` : k));
  }
  if (s.items) rules.push(...itemCountRules(s.items, `${path}[]`));
  return rules;
}

type GeminiVariant = { noThinking?: boolean; schemaInPrompt?: boolean; keepItems?: boolean };

/** One quick retry when Gemini sheds load (429/503 come back in seconds), staying inside the edge wall clock. */
async function geminiCall(model: string, input: CreateResponseInput, timeoutMs: number, id?: string, variant?: GeminiVariant): Promise<ResponseObject> {
  const t0 = Date.now();
  try {
    return await geminiCallOnce(model, input, timeoutMs, id, variant);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const elapsed = Date.now() - t0;
    if (!/^gemini_create_failed:(429|500|503):/.test(msg) || elapsed > 15_000) throw e;
    // Free-tier daily cap is per model: hop to a sibling Gemini model (never OpenAI).
    const dayCap = /PerDay|per day/i.test(msg);
    const quotaNext = (Deno.env.get("GEMINI_QUOTA_FALLBACK_MODEL") ?? "gemini-3.5-flash").trim();
    const next = dayCap && quotaNext && quotaNext !== model ? quotaNext : (geminiChain(model)[1] ?? model);
    console.warn(`[gemini] ${model}: ${msg.slice(0, 80)}; retrying once on ${next}`);
    await new Promise((r) => setTimeout(r, 3_000));
    return await geminiCallOnce(next, input, timeoutMs - elapsed - 3_000, id, variant);
  }
}

async function geminiCallOnce(model: string, input: CreateResponseInput, timeoutMs: number, id?: string, variant?: GeminiVariant): Promise<ResponseObject> {
  const key = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!key) throw new Error("gemini_not_configured");
  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
    maxOutputTokens: Math.min(65536, Math.max(4096, (input.maxOutputTokens ?? 32000) + 8000)),
  };
  const reqSchema = variant?.keepItems ? geminiSchema(input.schema) : geminiRequestSchema(input.schema);
  if (!variant?.schemaInPrompt) generationConfig.responseJsonSchema = reqSchema;
  if (!variant?.noThinking) generationConfig.thinkingConfig = { thinkingLevel: thinkingLevel(input.reasoningEffort) };
  const counts = variant?.keepItems ? [] : itemCountRules(input.schema);
  let system = input.system;
  if (counts.length) system += `\n\nArray sizes (must match exactly):\n${counts.join("\n")}`;
  if (variant?.schemaInPrompt) system += `\n\nReturn ONLY one JSON object that validates against this JSON Schema (every required key present):\n${JSON.stringify(reqSchema)}`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: input.user }] }],
    generationConfig,
  };
  const t0 = Date.now();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  let chars = 0;
  // A throttled stream (a few hundred chars a minute) can never finish inside the edge wall clock: fail fast.
  let slow = false;
  const minRate = Number(Deno.env.get("GEMINI_MIN_CHARS_PER_S") ?? "120");
  const big = (input.maxOutputTokens ?? 32000) >= 16000;
  const dog = setInterval(() => {
    const ms = Date.now() - t0;
    if (big && ms > 45_000 && chars < minRate * ms / 1000) { slow = true; ctl.abort(); }
  }, 5_000);
  let firstMs = -1;
  let thoughtChunks = 0;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: ctl.signal,
      },
    );
    if (!res.ok || !res.body) {
      const raw = await res.json().catch(() => null);
      const err = Array.isArray(raw) ? raw[0]?.error : raw?.error;
      const msg = err?.message ?? `http_${res.status}`;
      const details = err?.details ? JSON.stringify(err.details).slice(0, 600) : "";
      throw new Error(`gemini_create_failed:${res.status}:${String(msg).slice(0, 300)}${details ? ` ${details}` : ""}`);
    }
    // Stream so a timeout still tells us how far generation got; merge chunks into one response.
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    const texts: string[] = [];
    // deno-lint-ignore no-explicit-any
    let last: any = null;
    const take = (line: string) => {
      if (!line.startsWith("data:")) return;
      const payload = line.slice(5).trim();
      if (!payload) return;
      // deno-lint-ignore no-explicit-any
      let j: any;
      try { j = JSON.parse(payload); } catch { return; }
      if (j?.error) {
        const m = String(j.error.message ?? "").slice(0, 300);
        // Load-shedding before any text arrives is retryable like an HTTP 503.
        throw new Error(chars === 0 ? `gemini_create_failed:${Number(j.error.code) || 503}:${m}` : `gemini_stream_error:${m}`);
      }
      last = j;
      for (const p of j?.candidates?.[0]?.content?.parts ?? []) {
        if (p.thought) { thoughtChunks++; continue; }
        if (typeof p.text === "string") { if (firstMs < 0) firstMs = Date.now() - t0; texts.push(p.text); chars += p.text.length; }
      }
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        take(buf.slice(0, nl).replace(/\r$/, ""));
        buf = buf.slice(nl + 1);
      }
    }
    if (buf) take(buf);
    const merged = {
      ...(last ?? {}),
      candidates: [{ ...(last?.candidates?.[0] ?? {}), content: { parts: [{ text: texts.join("") }] } }],
    };
    const parsed = parseGemini(merged, model, id ?? `gem_${crypto.randomUUID()}`);
    console.log(`[gemini] ${model} ${Date.now() - t0}ms first_text=${firstMs}ms chars=${chars} status=${parsed.status}`);
    return parsed;
  } catch (e) {
    if (slow) throw new Error(`gemini_slow:chars=${chars}:first_text_ms=${firstMs}:ms=${Date.now() - t0}`);
    if (e instanceof DOMException && e.name === "AbortError") throw new Error(`gemini_timeout:${timeoutMs}:chars=${chars}:first_text_ms=${firstMs}:thought_chunks=${thoughtChunks}:ms=${Date.now() - t0}`);
    throw e;
  } finally {
    clearTimeout(t);
    clearInterval(dog);
  }
}

function asyncStore() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) throw new Error("async_store_not_configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

type Waiter = { waitUntil?: (p: Promise<unknown>) => void };

async function geminiBackground(model: string, input: CreateResponseInput): Promise<ResponseObject> {
  const id = `gem_${crypto.randomUUID()}`;
  const db = asyncStore();
  const { error } = await db.from("llm_async_responses").insert({
    id, provider: "gemini", model, status: "in_progress", meta: input.metadata ?? null,
  });
  if (error) throw new Error(`gemini_async_insert:${error.message}`);
  const work = (async () => {
    const t0 = Date.now();
    try {
      const r = await geminiCall(model, input, GEMINI_TIMEOUT_MS, id);
      await db.from("llm_async_responses").update({
        status: r.status, output_text: r.output_text, usage: r.usage, model: r.model ?? model,
        error: r.error, incomplete_reason: r.incomplete_reason, latency_ms: Date.now() - t0,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
    } catch (e) {
      await db.from("llm_async_responses").update({
        status: "failed", error: (e instanceof Error ? e.message : String(e)).slice(0, 500),
        latency_ms: Date.now() - t0, updated_at: new Date().toISOString(),
      }).eq("id", id);
    }
  })();
  const rt = (globalThis as unknown as { EdgeRuntime?: Waiter }).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(work);
  else work.catch(() => undefined);
  return { id, status: "queued", model, output_text: null, usage: null, error: null, incomplete_reason: null };
}

async function geminiRetrieve(id: string): Promise<ResponseObject> {
  const db = asyncStore();
  const { data, error } = await db.from("llm_async_responses").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`gemini_async_read:${error.message}`);
  if (!data) return { id, status: "failed", output_text: null, usage: null, error: "gemini_async_missing", incomplete_reason: null };
  const row = data as {
    status: ResponseStatus; model: string; output_text: string | null; usage: ResponseUsage | null;
    error: string | null; incomplete_reason: string | null; created_at: string;
  };
  if (row.status === "in_progress" && Date.now() - Date.parse(row.created_at) > GEMINI_ASYNC_TTL_MS) {
    await db.from("llm_async_responses").update({ status: "failed", error: "gemini_async_lost", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "in_progress");
    return { id, status: "failed", model: row.model, output_text: null, usage: null, error: "gemini_async_lost", incomplete_reason: null };
  }
  return { id, status: row.status, model: row.model, output_text: row.output_text, usage: row.usage, error: row.error, incomplete_reason: row.incomplete_reason };
}
