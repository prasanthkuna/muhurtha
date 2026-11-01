/**
 * Life timeline window (which dasha periods become chapters), the same rule for every user:
 *
 *  - PAST: full antardasha chapters for the previous mahadasha, never for ages under 12.
 *    (If the previous mahadasha ended before 12 we would "go back one more", but anything
 *    older is also before 12, so in practice full chapters start at max(age 12, previous MD start).)
 *    Everything before that start collapses into ONE "early years" summary row.
 *  - NOW + NEXT: every antardasha of the current mahadasha and of the next mahadasha.
 *  - LATER: one summary row per remaining mahadasha, up to age 80 (clipped at 80).
 *  - Children (< 12): no past rule; current + next mahadasha in full (current from birth), summaries after.
 *  - Budget: at most MAX_FULL_CHAPTERS full rows; extra oldest past rows fold into "early years".
 *
 * Pure and deterministic (no I/O), so it is unit-tested in timeline_window_test.ts.
 */
import { antardashasInMahadasha, type AdSegment, type MdSegment } from "./vimshottari.ts";

export const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;
export const DETAIL_MIN_AGE = 12;
export const SUMMARY_MAX_AGE = 80;
export const MAX_FULL_CHAPTERS = 35;
/** Later-life summary rows shorter than this (a mahadasha starting just before 80) are dropped. */
export const LATER_MIN_YEARS = 1;

export type TimelineRow =
  | { kind: "detail"; mdLord: string; adLord: string; start: Date; end: Date; seg: AdSegment }
  | {
    kind: "summary";
    /** Lord used for the row's glyph and themes (the longest mahadasha inside the span). */
    mdLord: string;
    /** Every mahadasha lord inside the span, in order (early years can span several). */
    mdLords: string[];
    start: Date;
    end: Date;
    early: boolean;
  };

function clip(seg: AdSegment, from: number, to = Infinity): AdSegment | null {
  const s = Math.max(seg.start.getTime(), from);
  const e = Math.min(seg.end.getTime(), to);
  if (e - s < 24 * 3600 * 1000) return null; // drop slivers under a day
  return { ...seg, start: new Date(s), end: new Date(e) };
}

function summaryOf(mds: MdSegment[], from: number, to: number, early: boolean): TimelineRow | null {
  if (to - from < 24 * 3600 * 1000) return null;
  const inside = mds
    .map((m) => ({ lord: m.lord, s: Math.max(m.start.getTime(), from), e: Math.min(m.end.getTime(), to) }))
    .filter((x) => x.e > x.s);
  if (!inside.length) return null;
  const longest = inside.reduce((a, b) => (b.e - b.s > a.e - a.s ? b : a));
  return {
    kind: "summary",
    mdLord: longest.lord,
    mdLords: inside.map((x) => x.lord),
    start: new Date(from),
    end: new Date(to),
    early,
  };
}

export function lifeTimelineRows(
  mds: MdSegment[],
  now: Date,
  opts: { maxFull?: number; birth?: Date } = {},
): TimelineRow[] {
  if (!mds.length) return [];
  const maxFull = opts.maxFull ?? MAX_FULL_CHAPTERS;
  const birth = (opts.birth ?? mds[0].start).getTime();
  const t = now.getTime();
  const age = (t - birth) / YEAR_MS;
  const age12 = birth + DETAIL_MIN_AGE * YEAR_MS;
  const age80 = birth + SUMMARY_MAX_AGE * YEAR_MS;

  let curIdx = mds.findIndex((m) => t >= m.start.getTime() && t < m.end.getTime());
  if (curIdx < 0) curIdx = t < mds[0].start.getTime() ? 0 : mds.length - 1;
  const cur = mds[curIdx];
  const next = mds[curIdx + 1] ?? null;
  const prev = curIdx > 0 ? mds[curIdx - 1] : null;

  // Where full chapters begin.
  let detailFrom: number;
  if (age < DETAIL_MIN_AGE) {
    detailFrom = cur.start.getTime();
  } else {
    const prevStart = prev ? prev.start.getTime() : cur.start.getTime();
    // Previous MD ended before 12 -> "go back one more": nothing older is >= 12 either.
    detailFrom = Math.max(age12, prevStart);
  }
  const detailTo = (next ?? cur).end.getTime();

  const detailMds = mds.slice(Math.max(0, curIdx - 1), curIdx + 2);
  let detail: AdSegment[] = [];
  for (const md of detailMds) {
    for (const ad of antardashasInMahadasha(md)) {
      const c = clip(ad, detailFrom, detailTo);
      if (c) detail.push(c);
    }
  }
  detail.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Budget: fold the oldest *past* full rows into the early-years summary.
  while (detail.length > maxFull && detail[0].end.getTime() <= t) {
    detail = detail.slice(1);
  }
  const firstDetail = detail[0]?.start.getTime() ?? detailFrom;

  const rows: TimelineRow[] = [];
  const early = summaryOf(mds, birth, Math.min(firstDetail, t), true);
  if (early) rows.push(early);
  for (const seg of detail) {
    rows.push({ kind: "detail", mdLord: seg.mdLord, adLord: seg.adLord, start: seg.start, end: seg.end, seg });
  }
  // LATER: one row per remaining mahadasha, up to age 80.
  for (const md of mds.slice(curIdx + 2)) {
    const s = Math.max(md.start.getTime(), detailTo);
    if (s >= age80) break;
    const e = Math.min(md.end.getTime(), age80);
    // A sliver of a new mahadasha right before 80 is noise; stop the timeline there.
    if (e - s < LATER_MIN_YEARS * YEAR_MS) break;
    const r = summaryOf([md], s, e, false);
    if (r) rows.push(r);
  }
  return rows;
}

export function rowTense(row: { start: Date; end: Date }, now: Date): "past" | "current" | "future" {
  const t = now.getTime();
  return t >= row.end.getTime() ? "past" : t < row.start.getTime() ? "future" : "current";
}

export function ageAt(birth: Date, at: Date): number {
  return Math.round(((at.getTime() - birth.getTime()) / YEAR_MS) * 10) / 10;
}
