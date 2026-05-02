/**
 * Batched LLM Journey antardasha cards. Grounded in engine facts + locale.
 */
import type { AdSegment } from "./vimshottari.ts";
import type { AppLocale } from "./vedic_labels.ts";
import { lordFlavor } from "./copy.ts";
import { geminiGenerateJson } from "./gemini_json.ts";

export type JourneyLlmCard = {
  id: number;
  title: string;
  sentences: string[];
};

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

function journeySystem(loc: AppLocale): string {
  const lang =
    loc === "te"
      ? "Write ONLY in natural Telugu script."
      : loc === "hi"
      ? "Write ONLY in natural Hindi (Devanagari)."
      : "Write ONLY in clear English.";
  return `You write Journey cards for a Vedic timing app.
${lang}
Hard rules:
- The JSON "periods" are the only source of truth for mahadasha, antardasha, start_date, end_date. Never change planets or dates. Never mention houses, degrees, nakshatra names, or software.
- Reflective, non-predictive rhythms. No medical/legal/investment advice. No specific event predictions.
- Title: readable (e.g. "Rahu–Moon" or a short poetic 4–6 words).
Anti-repetition: unique title and first sentence per card; vary openings; if avoid_repeating_snippets is present, avoid those stems.
Exactly 3 short sentences per card — easy to understand, relatable, distinct from each other.

Output ONLY valid JSON: {"cards":[{"id":number,"title":string,"sentences":[string,string,string]}]}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildUserPayload(periods: { seg: AdSegment; id: number }[]) {
  return periods.map(({ seg, id }) => {
    const mdF = lordFlavor(seg.mdLord);
    const adF = lordFlavor(seg.adLord);
    return {
      id,
      mahadasha: seg.mdLord,
      antardasha: seg.adLord,
      start_date: isoDate(seg.start),
      end_date: isoDate(seg.end),
      engine_theme_hints: {
        mahadasha: { areas: mdF.areas, moods: mdF.mood },
        antardasha: { areas: adF.areas, moods: adF.mood },
      },
    };
  });
}

async function geminiJourneyBatch(
  loc: AppLocale,
  bodyObj: Record<string, unknown>,
): Promise<JourneyLlmCard[] | null> {
  const raw = await geminiGenerateJson(journeySystem(loc), JSON.stringify(bodyObj));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { cards?: JourneyLlmCard[] };
    return Array.isArray(parsed.cards) ? parsed.cards : null;
  } catch {
    return null;
  }
}

async function openAiJourneyBatch(
  loc: AppLocale,
  bodyObj: Record<string, unknown>,
): Promise<JourneyLlmCard[] | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!apiKey) return null;
  const model = Deno.env.get("JOURNEY_LLM_MODEL") ?? DEFAULT_OPENAI_MODEL;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.78,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: journeySystem(loc) },
        { role: "user", content: JSON.stringify(bodyObj) },
      ],
    }),
  });
  if (!res.ok) return null;
  const body = await res.json() as { choices?: { message?: { content?: string } }[] };
  const raw = body.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { cards?: JourneyLlmCard[] };
    return Array.isArray(parsed.cards) ? parsed.cards : null;
  } catch {
    return null;
  }
}

function snippetHooks(text: string, maxHooks: number): string[] {
  const t = text.trim();
  if (t.length < 12) return [];
  const hooks: string[] = [t.slice(0, 48).toLowerCase()];
  if (t.length > 56) hooks.push(t.slice(-40).toLowerCase());
  return hooks.slice(0, maxHooks);
}

type Provider = "gemini" | "openai";

function resolveProvider(geminiKey: string, openaiKey: string): Provider | null {
  const explicit = (Deno.env.get("JOURNEY_LLM_PROVIDER") ?? "").toLowerCase();
  if (explicit === "gemini" && geminiKey) return "gemini";
  if (explicit === "openai" && openaiKey) return "openai";
  if (explicit === "gemini" && !geminiKey && openaiKey) return "openai";
  if (explicit === "openai" && !openaiKey && geminiKey) return "gemini";
  if (geminiKey) return "gemini";
  if (openaiKey) return "openai";
  return null;
}

async function callJourneyBatch(
  provider: Provider,
  loc: AppLocale,
  bodyObj: Record<string, unknown>,
): Promise<JourneyLlmCard[] | null> {
  if (provider === "gemini") return geminiJourneyBatch(loc, bodyObj);
  return openAiJourneyBatch(loc, bodyObj);
}

function normalizeCard(c: JourneyLlmCard): JourneyLlmCard | null {
  if (typeof c.id !== "number" || typeof c.title !== "string") return null;
  if (!Array.isArray(c.sentences)) return null;
  const s = c.sentences.map((x) => String(x).trim()).filter(Boolean);
  if (s.length < 2) return null;
  const sentences = s.slice(0, 3);
  while (sentences.length < 3) sentences.push(sentences[sentences.length - 1] ?? "");
  return { id: c.id, title: c.title.trim(), sentences };
}

export async function generateJourneyLlmCards(
  clipped: AdSegment[],
  loc: AppLocale,
): Promise<Map<number, JourneyLlmCard> | null> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  const provider = resolveProvider(geminiKey, openaiKey);
  if (provider == null) return null;

  const indexed = clipped.map((seg, i) => ({ seg, id: i }));
  const chunkSize = 10;
  const merged = new Map<number, JourneyLlmCard>();
  const avoid: string[] = [];

  for (let c = 0; c < indexed.length; c += chunkSize) {
    const slice = indexed.slice(c, c + chunkSize);
    const payload = buildUserPayload(slice);
    const cards = await callJourneyBatch(provider, loc, {
      periods: payload,
      avoid_repeating_snippets: avoid.slice(-36),
    });
    if (!cards) continue;
    for (const card of cards) {
      const norm = normalizeCard(card);
      if (!norm) continue;
      merged.set(norm.id, norm);
      avoid.push(...snippetHooks(norm.title, 1));
      for (const line of norm.sentences) avoid.push(...snippetHooks(line, 1));
    }
  }
  return merged.size > 0 ? merged : null;
}
