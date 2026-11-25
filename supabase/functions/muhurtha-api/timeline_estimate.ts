import { DateTime } from "luxon";
import { moonSiderealLongitudeDeg, nakshatraMetaFromSiderealLon } from "./ephemeris.ts";
import { type MdSegment, vimshottariMahadashas } from "./vimshottari.ts";

/** Local clock windows (minutes from 00:00) for each rough birth-time answer; centres match
 * star_public BUCKET_TIME. Unknown time = the whole day. */
export const BUCKET_RANGES: Record<string, [number, number][]> = {
  early_morning: [[240, 360]],
  morning: [[360, 660]],
  afternoon: [[660, 960]],
  evening: [[960, 1200]],
  night: [[1200, 1380]],
  late_night: [[0, 240], [1380, 1440]],
  unknown: [[0, 1440]],
};
export const SAMPLE_STEP_MIN = 10;

export type TimelineEstimate = {
  approximate: true;
  basis: "time_range" | "unknown_time";
  samples: number;
  /** Majority star (0-26) and pada. */
  nak: number;
  pada: number;
  /** Share of the range on the majority star / on the chosen current mahadasha lord (0-1). */
  star_share: number;
  md_share: number;
  /** min(star_share, md_share): the single confidence number. */
  confidence: number;
  /** Worst shift of a mahadasha boundary across the majority-star samples, in months. */
  uncertainty_months: number;
  /** Runner-up star when the range crosses a star boundary. */
  second_nak: number | null;
  second_share: number;
  /** Roughly 50/50 between two stars: near boundaries read as themes, not dates. */
  split: boolean;
};

type Sample = { at: Date; nak: number; pada: number; frac: number; segs: MdSegment[]; md: string | null };

function mdAt(segs: MdSegment[], t: number): string | null {
  const s = segs.find((x) => x.start.getTime() <= t && t < x.end.getTime());
  return s?.lord ?? null;
}

/** Sample the birth-time range, pick the majority star/pada and date the timeline from its
 * median sample. Returns null when the range is unknown/empty. */
export function estimateTimeline(
  dateIso: string,
  zone: string,
  bucket: string | null,
  now: Date = new Date(),
): { segments: MdSegment[]; nk: number; moonFraction: number; estimate: TimelineEstimate } | null {
  const key = bucket && BUCKET_RANGES[bucket] ? bucket : "unknown";
  const ranges = BUCKET_RANGES[key];
  const day = DateTime.fromISO(`${String(dateIso).slice(0, 10)}T00:00:00`, { zone });
  if (!day.isValid) return null;
  const nowMs = now.getTime();
  const samples: Sample[] = [];
  for (const [a, b] of ranges) {
    for (let m = a + SAMPLE_STEP_MIN / 2; m < b; m += SAMPLE_STEP_MIN) {
      const at = day.plus({ minutes: m }).toUTC().toJSDate();
      const meta = nakshatraMetaFromSiderealLon(moonSiderealLongitudeDeg(at));
      const frac = meta.withinFraction;
      const segs = vimshottariMahadashas(at, meta.idx, meta.pada, frac);
      samples.push({ at, nak: meta.idx, pada: meta.pada, frac, segs, md: mdAt(segs, nowMs) });
    }
  }
  if (!samples.length) return null;
  const count = <T>(xs: T[]) => {
    const m = new Map<T, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m.entries()].sort((p, q) => q[1] - p[1]);
  };
  const stars = count(samples.map((s) => s.nak));
  const nak = stars[0][0];
  const inStar = samples.filter((s) => s.nak === nak);
  const pada = count(inStar.map((s) => s.pada))[0][0];
  const group = inStar.filter((s) => s.pada === pada);
  const rep = group[Math.floor(group.length / 2)];
  const n = samples.length;
  const starShare = stars[0][1] / n;
  const mdShare = samples.filter((s) => s.md === rep.md).length / n;
  // Boundary drift: compare each majority-star sample's mahadasha starts with the chosen one's.
  let worstMs = 0;
  for (const s of inStar) {
    const len = Math.min(s.segs.length, rep.segs.length);
    for (let i = 1; i < len; i++) {
      if (s.segs[i].lord !== rep.segs[i].lord) continue;
      worstMs = Math.max(worstMs, Math.abs(s.segs[i].start.getTime() - rep.segs[i].start.getTime()));
    }
  }
  const second = stars[1] ?? null;
  const secondShare = second ? second[1] / n : 0;
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    segments: rep.segs,
    nk: nak,
    moonFraction: rep.frac,
    estimate: {
      approximate: true,
      basis: key === "unknown" ? "unknown_time" : "time_range",
      samples: n,
      nak,
      pada,
      star_share: r2(starShare),
      md_share: r2(mdShare),
      confidence: r2(Math.min(starShare, mdShare)),
      uncertainty_months: Math.ceil(worstMs / (30.44 * 86_400_000)),
      second_nak: second ? second[0] : null,
      second_share: r2(secondShare),
      split: Boolean(second) && starShare < 0.6 && secondShare >= 0.4,
    },
  };
}
