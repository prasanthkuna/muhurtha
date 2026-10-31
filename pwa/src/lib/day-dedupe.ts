import { DateTime } from "luxon";
import type { TimingWindow } from "@/lib/today-types";

/**
 * Today stacks several LLM-written blocks (hero line, body, "good for", window notes, week and
 * month cards, chapter summary). When two of them make the same point the screen reads like a
 * loop, so a later block that mostly restates an earlier one is hidden.
 */

const STOP = new Set(
  (
    "a an and are as at be but by can do for from get go has have in into is it its just keep " +
    "let like make more of on or out over so some than that the their them then there this to " +
    "today up use was what when while with you your yours day time good best"
  ).split(" "),
);

/** Content-word stems (5-char prefix) of a text; works for English, rough for Indic scripts. */
export function stems(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u)) {
    if (raw.length < 3 || STOP.has(raw)) continue;
    out.add(raw.slice(0, 5));
  }
  return out;
}

/** Share of `text`'s content stems already present in `seen`. */
export function coveredShare(text: string, seen: Set<string>): number {
  const s = stems(text);
  if (s.size === 0) return 0;
  let hit = 0;
  for (const w of s) if (seen.has(w)) hit += 1;
  return hit / s.size;
}

export function mergeStems(...texts: (string | null | undefined)[]): Set<string> {
  const out = new Set<string>();
  for (const t of texts) if (t) for (const w of stems(t)) out.add(w);
  return out;
}

/** True when most of `text` restates what the reader has already seen. */
export function restates(text: string | null | undefined, seen: Set<string>, threshold = 0.5): boolean {
  if (!text) return false;
  const s = stems(text);
  // Short chips ("Wrap up tasks") count as repeats once any two content words match.
  if (s.size <= 4) {
    let hit = 0;
    for (const w of s) if (seen.has(w)) hit += 1;
    return hit >= Math.min(2, s.size);
  }
  return coveredShare(text, seen) >= threshold;
}

/** Drop list items that restate `seen` or each other. Keeps order. */
export function dedupeList(items: string[], seen: Set<string>): string[] {
  const acc = new Set(seen);
  const out: string[] = [];
  for (const item of items) {
    if (restates(item, acc)) continue;
    out.push(item);
    for (const w of stems(item)) acc.add(w);
  }
  return out;
}

function windowEndMs(w: TimingWindow, date: string, zone: string): number | null {
  if (/T\d{2}:\d{2}/.test(w.end)) {
    const end = DateTime.fromISO(w.end, { setZone: true });
    return end.isValid ? end.toMillis() : null;
  }
  const m = w.end.match(/(\d{1,2}):(\d{2})/);
  const s = w.start.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  let end = DateTime.fromISO(date, { zone }).set({ hour: Number(m[1]), minute: Number(m[2]) });
  if (s && Number(m[1]) * 60 + Number(m[2]) < Number(s[1]) * 60 + Number(s[2])) end = end.plus({ days: 1 });
  return end.isValid ? end.toMillis() : null;
}

/** Windows that have not ended yet (for today's date in the profile's timezone). */
export function upcomingWindows(
  list: TimingWindow[],
  date: string,
  tz: string,
  nowMs: number = Date.now(),
): TimingWindow[] {
  const zone = tz?.trim() || "Asia/Kolkata";
  return list.filter((w) => {
    const end = windowEndMs(w, date, zone);
    return end == null || end > nowMs;
  });
}

/**
 * Life-area words (EN / TE / HI) so a tag like "Travel" is said once per screen even when the
 * hero line, the Calendar tags and a "be careful" chip each word it differently.
 */
const AREA_WORDS: Record<string, RegExp> = {
  travel: /\b(travel|trips?|journeys?|commut\w*|drives?|driving)\b|ప్రయాణ|ట్రిప్|జర్నీ|यात्रा|सफ़र|सफर/i,
  money: /\b(money|financ\w*|spend\w*|budget\w*|invest\w*|deals?|purchases?|buy(ing)?)\b|డబ్బు|ఫైనాన్స్|ఖర్చు|పెట్టుబడ|पैस|ख़र्च|खर्च|निवेश/i,
  love: /\b(love|partner|romance|romantic|date night)\b|ప్రేమ|పార్ట్‌నర్|लव|प्यार|पार्टनर/i,
  family: /\b(family|families|parents?|siblings?|relatives?|home life)\b|కుటుంబ|ఫ్యామిలీ|ఇంట్లో వాళ్ళ|परिवार|घरवाल/i,
  talks: /\b(talks?|conversations?|calls?|meetings?|negotiat\w*)\b|మాట్లాడ|మీటింగ్|బాతచీత|बातचीत|मीटिंग/i,
  health: /\b(health|workouts?|exercise|doctor)\b|ఆరోగ్య|హెల్త్|వర్కౌట్|सेहत|स्वास्थ्य/i,
  new_starts: /\b(new starts?|launch\w*|start something new|begin\w* new)\b|కొత్తగా మొదలు|కొత్త స్టార్ట్|లాంచ్|नई शुरुआत|लॉन्च/i,
};

/** Areas a line talks about (may be several). */
export function areasIn(text: string | null | undefined): string[] {
  if (!text) return [];
  return Object.entries(AREA_WORDS).filter(([, re]) => re.test(text)).map(([a]) => a);
}

/**
 * Say each area once: keep a chip only if it brings an area not yet said (or no area at all and
 * it is not a restatement). `said` is updated in place.
 */
export function dedupeByArea(items: string[], said: Set<string>): string[] {
  const out: string[] = [];
  for (const item of items) {
    const a = areasIn(item);
    if (a.length && a.every((x) => said.has(x))) continue;
    out.push(item);
    for (const x of a) said.add(x);
  }
  return out;
}

const MOON_RE: Record<"purnima" | "amavasya", RegExp> = {
  purnima: /(full[- ]moon|పౌర్ణమి|పున్నమి|पूर्णिमा)/i,
  amavasya: /(new[- ]moon|అమావాస్య|अमावस्या)/i,
};
// Any day number right next to the mention means the text already dates it ("full moon on 26 Oct").
const HAS_DATE = /(^|[^\d])([1-9]|[12]\d|3[01])([^\d]|$)/;

/**
 * "The full moon brings…" → "The full moon (26 Oct) brings…": the first mention of a full or new
 * moon gets its date when the text names no date itself. `label` formats a yyyy-MM-dd date.
 */
export function dateMoonMentions(
  text: string,
  dates: { purnima: string | null; amavasya: string | null } | null | undefined,
  label: (iso: string) => string,
): string {
  if (!text || !dates) return text;
  let out = text;
  for (const k of ["purnima", "amavasya"] as const) {
    const iso = dates[k];
    if (!iso) continue;
    const m = out.match(MOON_RE[k]);
    if (!m || m.index == null) continue;
    const near = out.slice(Math.max(0, m.index - 16), m.index + m[0].length + 20);
    if (HAS_DATE.test(near)) continue;
    const at = m.index + m[0].length;
    out = `${out.slice(0, at)} (${label(iso)})${out.slice(at)}`;
  }
  return out;
}
