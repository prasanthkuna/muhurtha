/**
 * Thin Luna client over the OpenAI Responses API (strict JSON schema, optional background,
 * optional token streaming). gpt-6-luna is the only model (owner decision 2026-11-12): no
 * Gemini, no OpenRouter, no other model fallback. Callers do one bounded retry and then fall
 * back to deterministic or saved content.
 */
import { LUNA_MODEL, openAiAllowed } from "./llm_policy.ts";

export const READING_MODEL_DEFAULT = LUNA_MODEL;

/** USD per 1M tokens (standard tier). Older rows keep their own model's price. */
const PRICES: Record<string, { input: number; cached: number; output: number }> = {
  "gpt-6-luna": { input: 0.10, cached: 0.01, output: 0.50 },
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
  /** Input tokens billed as cache writes (GPT-5.6+); excluded from cached_tokens. */
  cache_write_tokens?: number;
  cache_write_30m_tokens?: number;
  cache_write_12h_tokens?: number;
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

export type LlmProvider = "openai";
export type ReasoningEffort = "none" | "low" | "medium";

/** Always OpenAI (Luna). Kept as a function so call sites and logs stay unchanged. */
export function primaryProvider(): LlmProvider {
  return "openai";
}

export function providerOf(_model: string | null | undefined): string {
  const m = String(_model ?? "");
  return m.startsWith("gemini") ? "gemini" : "openai";
}

/** The only model. LUNA_MODEL may pin a Luna snapshot (anything else is ignored). */
export function readingModel(): string {
  const pinned = Deno.env.get("LUNA_MODEL")?.trim();
  return pinned && pinned.startsWith(LUNA_MODEL) ? pinned : LUNA_MODEL;
}

export function modelForAttempt(_attempts: number): string {
  return readingModel();
}

export function llmConfigured(): boolean {
  return openAiAllowed();
}

export function openAiConfigured(): boolean {
  return openAiAllowed();
}

export function priceFor(model: string): { input: number; cached: number; output: number } {
  const key = Object.keys(PRICES).sort((a, b) => b.length - a.length).find((k) => model.startsWith(k)) ?? LUNA_MODEL;
  return PRICES[key];
}

/**
 * Billed cost. GPT-5.6+ (incl. Luna) bill input three ways: ordinary, cache reads (0.1x) and cache
 * writes (1.25x for the default 30-minute lifetime, 2.5x for 12 h). `cached_tokens` excludes
 * writes, so ordinary = input - cached - writes.
 */
export function costUsd(model: string, u: ResponseUsage | null): number {
  if (!u) return 0;
  const p = priceFor(model);
  const w30 = u.cache_write_30m_tokens ?? 0;
  const w12 = u.cache_write_12h_tokens ?? 0;
  const writes = Math.max(u.cache_write_tokens ?? 0, w30 + w12);
  // A total without the lifetime split is billed at the default 30-minute rate.
  const w30b = writes - w12;
  const ordinary = Math.max(0, u.input_tokens - u.cached_tokens - writes);
  return (ordinary * p.input + u.cached_tokens * p.cached + w30b * p.input * 1.25 + w12 * p.input * 2.5 + u.output_tokens * p.output) / 1_000_000;
}

function apiKey(): string {
  if (!openAiAllowed()) throw new Error("openai_not_configured");
  return Deno.env.get("OPENAI_API_KEY")!.trim();
}

// deno-lint-ignore no-explicit-any
export function parseUsage(u: any): ResponseUsage | null {
  return u
    ? {
      input_tokens: Number(u.input_tokens ?? 0),
      cached_tokens: Number(u.input_tokens_details?.cached_tokens ?? 0),
      cache_write_tokens: Number(u.input_tokens_details?.cache_write_tokens ?? 0),
      cache_write_30m_tokens: Number(u.input_tokens_details?.cache_write_tokens_details?.ttl_30m_tokens ?? 0),
      cache_write_12h_tokens: Number(u.input_tokens_details?.cache_write_tokens_details?.ttl_12h_tokens ?? 0),
      output_tokens: Number(u.output_tokens ?? 0),
      reasoning_tokens: Number(u.output_tokens_details?.reasoning_tokens ?? 0),
      total_tokens: Number(u.total_tokens ?? 0),
    }
    : null;
}

// deno-lint-ignore no-explicit-any
export function parseResponse(raw: any): ResponseObject {
  let text: string | null = typeof raw?.output_text === "string" ? raw.output_text : null;
  if (!text && Array.isArray(raw?.output)) {
    const parts: string[] = [];
    for (const item of raw.output) {
      if (item?.type !== "message" || !Array.isArray(item.content)) continue;
      for (const c of item.content) {
        if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text);
      }
    }
    text = parts.join("") || null;
  }
  return {
    id: String(raw?.id ?? ""),
    status: (raw?.status ?? "failed") as ResponseStatus,
    model: raw?.model,
    output_text: text,
    usage: parseUsage(raw?.usage),
    error: raw?.error?.message ?? raw?.error?.code ?? null,
    incomplete_reason: raw?.incomplete_details?.reason ?? null,
  };
}

export type CreateResponseInput = {
  model?: string;
  system: string;
  /** Per-user stable block (chart card) sent right after the system prompt, so system + card form a cacheable prefix. */
  prefix?: string;
  user: string;
  /** Plain-text output when omitted together with schema. */
  schemaName?: string;
  schema?: Record<string, unknown>;
  /** JSON mode without a strict schema (legacy pack/content prompts). */
  jsonObject?: boolean;
  background?: boolean;
  maxOutputTokens?: number;
  reasoningEffort?: ReasoningEffort | "minimal" | "high";
  previousResponseId?: string;
  metadata?: Record<string, string>;
  timeoutMs?: number;
  /** Stable per user/chart, so the shared prefix (system + chart card) hits the prompt cache. */
  promptCacheKey?: string;
  /** Kept for call-site compatibility; ignored (single model). */
  chainDepth?: number;
  /**
   * "explicit" with no breakpoints = no prompt caching and no cache-write charge. For one-off
   * prompts (a reading part is never re-sent) writes cost 1.25x and are never read back.
   */
  promptCacheMode?: "explicit" | "implicit";
};

/** Set false after the API rejects prompt_cache_options once (then requests omit it). */
let cacheOptionsOk = true;

function requestBody(input: CreateResponseInput, model: string, stream: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    input: [
      { role: "system", content: input.system },
      ...(input.prefix ? [{ role: "system", content: input.prefix }] : []),
      { role: "user", content: input.user },
    ],
    store: true,
    max_output_tokens: input.maxOutputTokens ?? 32000,
    reasoning: { effort: input.reasoningEffort === "minimal" ? "none" : (input.reasoningEffort ?? "none") },
  };
  body.text = input.schema
    ? { format: { type: "json_schema", name: input.schemaName ?? "out", strict: true, schema: input.schema }, verbosity: "low" }
    : { format: { type: input.jsonObject ? "json_object" : "text" }, verbosity: "low" };
  if (input.background) body.background = true;
  if (stream) body.stream = true;
  if (input.previousResponseId) body.previous_response_id = input.previousResponseId;
  if (input.metadata) body.metadata = input.metadata;
  if (input.promptCacheKey) body.prompt_cache_key = input.promptCacheKey.slice(0, 64);
  if (input.promptCacheMode && cacheOptionsOk) body.prompt_cache_options = { mode: input.promptCacheMode };
  return body;
}

export async function createResponse(input: CreateResponseInput): Promise<ResponseObject> {
  const model = input.model && input.model.startsWith(LUNA_MODEL) ? input.model : readingModel();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), input.timeoutMs ?? (input.background ? 20_000 : 120_000));
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
      body: JSON.stringify(requestBody(input, model, false)),
      signal: ctl.signal,
    });
    const raw = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = raw?.error?.message ?? `http_${res.status}`;
      if (res.status === 400 && input.promptCacheMode && cacheOptionsOk && /prompt_cache_options/i.test(String(msg))) {
        cacheOptionsOk = false;
        return await createResponse(input);
      }
      throw new Error(`openai_create_failed:${res.status}:${String(msg).slice(0, 300)}`);
    }
    return parseResponse(raw);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new Error("openai_timeout");
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export type StreamHandlers = {
  /** Raw output text delta (JSON text when a schema is set). */
  onDelta: (delta: string) => void | Promise<void>;
  /** Fires once, when the first output token arrives. */
  onFirstToken?: (msSinceStart: number) => void;
};

/**
 * Streamed Responses call. Resolves with the final response (usage included) once the
 * stream completes; throws on HTTP errors, a failed response, or a stall.
 */
export async function streamResponse(input: CreateResponseInput, h: StreamHandlers): Promise<ResponseObject> {
  const model = input.model && input.model.startsWith(LUNA_MODEL) ? input.model : readingModel();
  const t0 = Date.now();
  const ctl = new AbortController();
  const total = setTimeout(() => ctl.abort(), input.timeoutMs ?? 45_000);
  let first = false;
  let text = "";
  let final: ResponseObject | null = null;
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}`, Accept: "text/event-stream" },
      body: JSON.stringify(requestBody(input, model, true)),
      signal: ctl.signal,
    });
    if (!res.ok || !res.body) {
      const raw = await res.json().catch(() => null);
      if (res.status === 400 && input.promptCacheMode && cacheOptionsOk && /prompt_cache_options/i.test(String(raw?.error?.message ?? ""))) {
        cacheOptionsOk = false;
        clearTimeout(total);
        return await streamResponse(input, h);
      }
      throw new Error(`openai_create_failed:${res.status}:${String(raw?.error?.message ?? "").slice(0, 300)}`);
    }
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
        if (!data || data === "[DONE]") continue;
        // deno-lint-ignore no-explicit-any
        let ev: any;
        try {
          ev = JSON.parse(data);
        } catch {
          continue;
        }
        if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") {
          if (!first) {
            first = true;
            h.onFirstToken?.(Date.now() - t0);
          }
          text += ev.delta;
          await h.onDelta(ev.delta);
        } else if (ev.type === "response.completed" || ev.type === "response.incomplete") {
          final = parseResponse(ev.response);
        } else if (ev.type === "response.failed") {
          final = parseResponse(ev.response);
          throw new Error(`openai_stream_error:${final.error ?? "failed"}`);
        } else if (ev.type === "error") {
          throw new Error(`openai_stream_error:${ev.code ?? ""}:${String(ev.message ?? "").slice(0, 200)}`);
        }
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new Error("openai_stream_timeout");
    throw e;
  } finally {
    clearTimeout(total);
  }
  if (!final) final = { id: "", status: text ? "completed" : "failed", model, output_text: text || null, usage: null, error: text ? null : "stream_ended", incomplete_reason: null };
  if (!final.output_text) final.output_text = text || null;
  return final;
}

export async function retrieveResponse(id: string): Promise<ResponseObject> {
  if (id.startsWith("gem_")) {
    // Legacy Gemini async rows can't be resumed any more: report failed so the job retries on Luna.
    return { id, status: "failed", output_text: null, usage: null, error: "legacy_gemini_response", incomplete_reason: null };
  }
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

/** Internal probe: key present, one tiny call, latency. Never returns secrets. */
export async function lunaProbe(effort: ReasoningEffort = "none"): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { model: readingModel(), key_present: openAiAllowed() };
  if (!openAiAllowed()) return out;
  const t0 = Date.now();
  try {
    let firstMs: number | null = null;
    const r = await streamResponse({
      system: "Reply with one short friendly sentence.",
      user: "Say hello to a Muhurta user in English.",
      reasoningEffort: effort,
      maxOutputTokens: 60,
      timeoutMs: 20_000,
    }, { onDelta: () => {}, onFirstToken: (ms) => (firstMs = ms) });
    out.ok = r.status === "completed";
    out.first_token_ms = firstMs;
    out.total_ms = Date.now() - t0;
    out.usage = r.usage;
    out.sample = (r.output_text ?? "").slice(0, 120);
  } catch (e) {
    out.ok = false;
    out.error = (e instanceof Error ? e.message : String(e)).slice(0, 300);
  }
  return out;
}
