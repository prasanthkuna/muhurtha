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

export type DaySlice = {
  index: number;
  start: Date;
  end: Date;
  isRahu: boolean;
};

export function divideDaylight(
  range: SunRange,
  weekday: number,
): DaySlice[] {
  const dur = range.sunset.getTime() - range.sunrise.getTime();
  const step = dur / 8;
  const rahu = rahuKalSegment1Based(weekday);
  const out: DaySlice[] = [];
  for (let i = 0; i < 8; i++) {
    const start = new Date(range.sunrise.getTime() + i * step);
    const end = new Date(range.sunrise.getTime() + (i + 1) * step);
    out.push({
      index: i + 1,
      start,
      end,
      isRahu: i + 1 === rahu,
    });
  }
  return out;
}

export function timeStrInZone(d: Date, zone: string): string {
  return DateTime.fromJSDate(d).setZone(zone).toFormat("HH:mm");
}

/** Merge daylight slices into window lists; times are wall-clock in [zone]. */
export function goodAndCautionWindows(
  slices: DaySlice[],
  zone: string,
): {
  good: { start: string; end: string; label: string }[];
  caution: { start: string; end: string; label: string }[];
} {
  const good: { start: string; end: string; label: string }[] = [];
  const caution: { start: string; end: string; label: string }[] = [];

  for (const s of slices) {
    const win = {
      start: timeStrInZone(s.start, zone),
      end: timeStrInZone(s.end, zone),
      // Non-Rahu eighths of sunrise→sunset; Rahu slice is caution.
      label: s.isRahu ? "Rahu Kalam" : "Daytime slice",
    };
    if (s.isRahu) caution.push(win);
    else good.push(win);
  }

  return { good, caution };
}
