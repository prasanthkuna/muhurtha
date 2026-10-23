/**
 * Thin client for the OpenAI Responses API (background mode + strict JSON schema).
 * Used by the v2 single-call reading pipeline and the real AI Ask.
 */

export const READING_MODEL_DEFAULT = "gpt-5.4-mini";

/** USD per 1M tokens. Cached input is billed at 10% of input. */
const PRICES: Record<string, { input: number; cached: number; output: number }> = {
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

export function readingModel(): string {
  return Deno.env.get("READING_MODEL")?.trim() || READING_MODEL_DEFAULT;
}

export function openAiConfigured(): boolean {
  return Boolean(Deno.env.get("OPENAI_API_KEY")?.trim());
}

export function costUsd(model: string, u: ResponseUsage | null): number {
  if (!u) return 0;
  const key = Object.keys(PRICES).find((k) => model.startsWith(k)) ?? READING_MODEL_DEFAULT;
  const p = PRICES[key];
  const uncached = Math.max(0, u.input_tokens - u.cached_tokens);
  return (uncached * p.input + u.cached_tokens * p.cached + u.output_tokens * p.output) / 1_000_000;
}

function apiKey(): string {
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
  await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
  }).catch(() => undefined);
}
