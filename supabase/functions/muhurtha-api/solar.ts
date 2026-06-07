import { DateTime } from "luxon";
import SunCalc from "suncalc";

export type SunRange = { sunrise: Date; sunset: Date };

export function sunriseSunset(date: Date, lat: number, lng: number): SunRange {
  const t = SunCalc.getTimes(date, lat, lng);
  return { sunrise: t.sunrise, sunset: t.sunset };
}

/** 1-based segment index (of 8) that is Rahu Kalam for weekday (JS: 0 Sun .. 6 Sat). */
export function rahuKalSegment1Based(weekday: number): number {
  const m: Record<number, number> = {
    0: 8,
    1: 2,
    2: 7,
    3: 5,
    4: 6,
    5: 4,
    6: 3,
  };
  return m[weekday] ?? 2;
}

/** 1-based segment index (of 8) that is Yamagandam for weekday (JS: 0 Sun .. 6 Sat). */
export function yamagandamSegment1Based(weekday: number): number {
  const m: Record<number, number> = {
    0: 5,
    1: 4,
    2: 3,
    3: 2,
    4: 1,
    5: 7,
    6: 6,
  };
  return m[weekday] ?? 4;
}

/** 1-based segment index (of 8) that is Gulika Kalam for weekday (JS: 0 Sun .. 6 Sat). */
export function gulikaSegment1Based(weekday: number): number {
  const m: Record<number, number> = {
    0: 7,
    1: 6,
    2: 5,
    3: 4,
    4: 3,
    5: 2,
    6: 1,
  };
  return m[weekday] ?? 6;
}

export type DaySlice = {
  index: number;
  start: Date;
  end: Date;
  isRahu: boolean;
  isYamagandam: boolean;
  isGulika: boolean;
};

export function divideDaylight(
  range: SunRange,
  weekday: number,
): DaySlice[] {
  const dur = range.sunset.getTime() - range.sunrise.getTime();
  const step = dur / 8;
  const rahu = rahuKalSegment1Based(weekday);
  const yama = yamagandamSegment1Based(weekday);
  const gulika = gulikaSegment1Based(weekday);
  const out: DaySlice[] = [];
  for (let i = 0; i < 8; i++) {
    const start = new Date(range.sunrise.getTime() + i * step);
    const end = new Date(range.sunrise.getTime() + (i + 1) * step);
    out.push({
      index: i + 1,
      start,
      end,
      isRahu: i + 1 === rahu,
      isYamagandam: i + 1 === yama,
      isGulika: i + 1 === gulika,
    });
  }
  return out;
}

export function timeStrInZone(d: Date, zone: string): string {
  return DateTime.fromJSDate(d).setZone(zone).toFormat("HH:mm");
}

function isAvoidSlice(slice: DaySlice): boolean {
  return slice.isRahu || slice.isYamagandam || slice.isGulika;
}

function safeSliceScore(slice: DaySlice, slices: DaySlice[]): number {
  const prev = slices[slice.index - 2];
  const next = slices[slice.index];
  const prevAvoid = prev ? isAvoidSlice(prev) : false;
  const nextAvoid = next ? isAvoidSlice(next) : false;

  let score = 1;
  if (slice.index >= 3 && slice.index <= 6) score += 0.85;
  if (slice.index === 2 || slice.index === 7) score += 0.35;
  if (slice.index === 1 || slice.index === 8) score -= 0.15;
  if (!prevAvoid && !nextAvoid) score += 0.45;
  else if (!prevAvoid || !nextAvoid) score += 0.2;
  return score;
}

/** Surface only the cleanest useful windows instead of every non-Rahu daylight slice. */
export function goodAndCautionWindows(
  slices: DaySlice[],
  zone: string,
): {
  good: { start: string; end: string; label: string }[];
  caution: { start: string; end: string; label: string }[];
} {
  const good: { start: string; end: string; label: string }[] = [];
  const caution: { start: string; end: string; label: string }[] = [];
  const safeRuns: DaySlice[][] = [];
  let activeRun: DaySlice[] = [];

  for (const slice of slices) {
    if (slice.isRahu) {
      caution.push({
        start: timeStrInZone(slice.start, zone),
        end: timeStrInZone(slice.end, zone),
        label: "Rahu Kalam",
      });
    }
    if (isAvoidSlice(slice)) {
      if (activeRun.length) {
        safeRuns.push(activeRun);
        activeRun = [];
      }
      continue;
    }
    activeRun.push(slice);
  }

  if (activeRun.length) safeRuns.push(activeRun);

  const rankedRuns = safeRuns
    .map((run) => {
      const avgScore = run.reduce(
        (sum, slice) => sum + safeSliceScore(slice, slices),
        0,
      ) / Math.max(run.length, 1);
      return {
        run,
        score: avgScore + Math.max(0, run.length - 1) * 0.55,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.run[0]!.start.getTime() - b.run[0]!.start.getTime();
    })
    .slice(0, 2)
    .sort((a, b) => a.run[0]!.start.getTime() - b.run[0]!.start.getTime());

  for (const entry of rankedRuns) {
    good.push({
      start: timeStrInZone(entry.run[0]!.start, zone),
      end: timeStrInZone(entry.run[entry.run.length - 1]!.end, zone),
      label: "Best window",
    });
  }

  return { good, caution };
}
