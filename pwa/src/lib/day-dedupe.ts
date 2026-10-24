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
