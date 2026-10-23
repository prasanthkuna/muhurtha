import { formatWindowRange } from "@/lib/format-time";
import type { TimingWindow } from "@/lib/today-types";

/**
 * Pack prose (LLM-written once per pack) can quote clock times that were computed for a
 * different place or an older engine run — e.g. a pack generated before the user's city was
 * set uses the Mumbai default and lands ~20 min off. The live window cards are the source of
 * truth, so any prose time that does not match a live window boundary is treated as stale.
 */

const CLOCK_RE = /(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm|AM|PM|a\.m\.|p\.m\.)?/g;
const TOLERANCE_MIN = 3;

function toMinutes(h: number, m: number, suffix?: string): number | null {
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return null;
  let hh = h;
  const s = suffix?.toLowerCase().replace(/\./g, "");
  if (s === "pm" && hh < 12) hh += 12;
  if (s === "am" && hh === 12) hh = 0;
  return hh * 60 + m;
}

function boundaryMinutes(value: string): number | null {
  if (!value) return null;
  const iso = /T\d{2}:\d{2}/.test(value) ? Date.parse(value) : Number.NaN;
  if (!Number.isNaN(iso)) {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  }
  const m = value.match(/(\d{1,2}):(\d{2})/);
  return m ? toMinutes(Number(m[1]), Number(m[2])) : null;
}

function clockTokens(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(CLOCK_RE)) {
    const v = toMinutes(Number(m[1]), Number(m[2]), m[3]);
    if (v != null) out.push(v);
  }
  return out;
}

function near(a: number, b: number) {
  const d = Math.abs(a - b);
  // Prose often drops AM/PM ("12:02", "3:10"), so also accept a 12-hour wrap.
  return d <= TOLERANCE_MIN || Math.abs(d - 720) <= TOLERANCE_MIN;
}

/** True when every clock time in the text is a live window boundary (or there are none). */
export function timesMatchWindows(text: string, windows: TimingWindow[]): boolean {
  const tokens = clockTokens(text);
  if (tokens.length === 0) return true;
  const bounds = windows
    .flatMap((w) => [boundaryMinutes(w.start), boundaryMinutes(w.end)])
    .filter((v): v is number => v != null);
  if (bounds.length === 0) return false;
  return tokens.every((tok) => bounds.some((b) => near(tok, b)));
}

/**
 * Keep prose whose times agree with the live windows; otherwise drop just the sentences
 * that quote stale times. Returns "" when nothing trustworthy is left.
 */
export function scrubStaleTimes(text: string | undefined | null, windows: TimingWindow[]): string {
  const s = (text ?? "").toString().trim();
  if (!s) return "";
  if (timesMatchWindows(s, windows)) return s;
  const sentences = s.split(/(?<=[.!?।])\s+/);
  const kept = sentences.filter((part) => clockTokens(part).length === 0 || timesMatchWindows(part, windows));
  return kept.join(" ").trim();
}

export function scrubList(items: string[], windows: TimingWindow[]): string[] {
  return items.map((line) => scrubStaleTimes(line, windows)).filter(Boolean);
}

/** One-line summary built from the same windows the cards render. */
export function windowsSummary(
  good: TimingWindow[],
  caution: TimingWindow[],
  labels: { good: string; caution: string },
): string {
  const parts: string[] = [];
  if (good[0]) parts.push(`${labels.good}: ${formatWindowRange(good[0].start, good[0].end)}`);
  if (caution[0]) parts.push(`${labels.caution}: ${formatWindowRange(caution[0].start, caution[0].end)}`);
  return parts.join(" · ");
}
