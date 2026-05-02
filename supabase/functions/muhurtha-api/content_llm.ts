import { geminiGenerateJson } from "./gemini_json.ts";
import type { AppLocale } from "./vedic_labels.ts";

function localeLine(loc: AppLocale): string {
  if (loc === "te") {
    return 'Write ONLY in natural Telugu script. No English except proper nouns if unavoidable.';
  }
  if (loc === "hi") {
    return 'Write ONLY in natural Hindi (Devanagari). No English except proper nouns if unavoidable.';
  }
  return 'Write ONLY in clear English.';
}

export type TodayLlmCopy = {
  better_for: string[];
  be_careful: string[];
  rhythm_title?: string;
  rhythm_body?: string;
};

export async function generateTodayCopy(
  loc: AppLocale,
  facts: Record<string, unknown>,
): Promise<TodayLlmCopy | null> {
  const system = `You write calming copy for a Vedic timing app Today screen.

${localeLine(loc)}
Output valid JSON only:
{"better_for":[string,string],"be_careful":[string,string],"rhythm_title":string,"rhythm_body":string}

Rules:
- Use only facts in the user JSON (moon sign, nakshatra, mahadasha hints, windows count). Do not invent times or planets not given.
- better_for: exactly 2 short bullets (what kinds of actions fit today).
- be_careful: exactly 2 short cautions (no fear-mongering).
- rhythm_title + rhythm_body: one line title + one sentence about current mahadasha tone if lords given; else omit both fields (empty string ok).
- Reflective, non-predictive. No medical/legal/investment advice.`;

  const raw = await geminiGenerateJson(system, JSON.stringify({ locale: loc, facts }));
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as TodayLlmCopy;
    if (!Array.isArray(o.better_for) || !Array.isArray(o.be_careful)) return null;
    return o;
  } catch {
    return null;
  }
}

export type PurposeLlmCopy = {
  summary: string;
  action_line: string;
  better_options?: { label: string; detail: string }[];
};

export async function generatePurposeCopy(
  loc: AppLocale,
  facts: Record<string, unknown>,
): Promise<PurposeLlmCopy | null> {
  const system = `You write Purpose check results for a Vedic timing app.

${localeLine(loc)}
Output valid JSON only:
{"summary":string,"action_line":string,"better_options":[{"label":string,"detail":string}]}

Rules:
- summary: 2–3 sentences max, plain language.
- action_line: one crisp sentence.
- better_options: 0–2 items only if facts.suggest_alternatives is true; else return empty array [].`;

  const raw = await geminiGenerateJson(system, JSON.stringify({ locale: loc, facts }));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PurposeLlmCopy;
  } catch {
    return null;
  }
}

export type RemedyLlmItem = { id: string; title: string; simple_line: string };

export async function generateRemedyCopy(
  loc: AppLocale,
  facts: { active_lord?: string; items: { id: string; title: string; simple_line: string }[] },
): Promise<RemedyLlmItem[] | null> {
  const system = `You localize remedy cards for a Vedic timing app.

${localeLine(loc)}
Output valid JSON only:
{"items":[{"id":string,"title":string,"simple_line":string}]}

Rules:
- Same ids as input, same count and order.
- Keep meaning; translate/adapt title and simple_line to locale.
- No medical cure claims; tone gentle and practical.`;

  const raw = await geminiGenerateJson(system, JSON.stringify({ locale: loc, facts }));
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { items?: RemedyLlmItem[] };
    if (!Array.isArray(o.items)) return null;
    return o.items  as unknown as RemedyLlmItem[];
  } catch {
    return null;
  }
}
