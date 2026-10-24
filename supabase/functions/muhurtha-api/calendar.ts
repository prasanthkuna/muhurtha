/**
 * Month & Year Tuning Calendar — fully deterministic (no LLM). Scores what each date favours
 * from the same sunrise Panchanga the Today screen uses (tara, chandrabala, tithi, nakshatra
 * class, weekday) and returns codes only; every word comes from the reviewed phrase bank in
 * the PWA (messages-bond.ts) or bond_phrases.ts for pushes.
 */
import { DateTime } from "luxon";
import { quickDayFacts, type QuickDayFacts } from "./panchanga.ts";
import { houseFrom, siderealLon } from "./grahas.ts";

export const CAL_VERSION = "cal-v1";
export const AREA_IDS = ["money", "travel", "talks", "love", "health", "rest", "new_starts"] as const;
export type AreaId = (typeof AREA_IDS)[number];
export type DayTone = "supportive" | "mixed" | "rest";

// Muhurta nakshatra classes (0-based nakshatra index).
const STHIRA = new Set([3, 11, 20, 25]);
const CHARA = new Set([6, 14, 21, 22, 23]);
const UGRA = new Set([1, 9, 10, 19, 24]);
const MISHRA = new Set([2, 15]);
const KSHIPRA = new Set([0, 7, 12]);
const MRIDU = new Set([4, 13, 16, 26]);
const TIKSHNA = new Set([5, 8, 17, 18]);
export function nakClass(i: number): "sthira" | "chara" | "ugra" | "mishra" | "kshipra" | "mridu" | "tikshna" {
  if (STHIRA.has(i)) return "sthira";
  if (CHARA.has(i)) return "chara";
  if (UGRA.has(i)) return "ugra";
  if (MISHRA.has(i)) return "mishra";
  if (KSHIPRA.has(i)) return "kshipra";
  if (MRIDU.has(i)) return "mridu";
  return TIKSHNA.has(i) ? "tikshna" : "mishra";
}

export type CalDay = {
  date: string;
  weekday: number;
  tone: DayTone;
  favours: AreaId[];
  avoid: AreaId | null;
  chandrashtama: boolean;
  /** strongest area score, used to pick key dates */
  peak: number;
  scores: Record<AreaId, number>;
  best: { start: string; end: string } | null;
  rahu: { start: string; end: string } | null;
  tithi: string;
  nakshatra: string;
  festival?: string | null;
};

export function scoreDay(q: QuickDayFacts): CalDay {
  const wd = q.weekday; // 0 Sun .. 6 Sat
  const cls = nakClass(q.nakIndex);
  const tnum = (q.tithiIndex % 15) + 1;
  const rikta = [4, 9, 14].includes(tnum) && q.tithiIndex !== 29;
  const amavasya = q.tithiIndex === 29;
  const purnima = q.tithiIndex === 14;
  const shukla = q.tithiIndex < 15;
  const ch8 = q.chandraHouse === 8;
  const tara = q.taraSupport ?? 0;
  const chandra = q.chandraSupport ?? 0;
  const harsh = cls === "ugra" || cls === "tikshna";
  const s: Record<AreaId, number> = { money: 0, travel: 0, talks: 0, love: 0, health: 0, rest: 0, new_starts: 0 };

  s.money += (cls === "kshipra" ? 1.5 : 0) + (cls === "sthira" || cls === "mridu" ? 0.5 : 0) +
    (wd === 3 || wd === 4 ? 1 : wd === 5 ? 0.5 : 0) + (rikta ? -1 : 0) + (amavasya ? -1 : 0) + tara * 0.75;
  s.travel += (cls === "chara" ? 1.5 : cls === "kshipra" ? 1 : cls === "mridu" ? 0.5 : 0) +
    (cls === "sthira" || harsh ? -1 : 0) + (ch8 ? -2 : 0) + ([1, 3, 4, 5].includes(wd) ? 0.5 : wd === 2 || wd === 6 ? -0.5 : 0) +
    (rikta ? -1 : 0) + tara * 0.5;
  s.talks += (wd === 3 ? 1.5 : wd === 4 || wd === 1 ? 0.5 : wd === 2 ? -1 : 0) + chandra * 0.75 + tara * 0.5 +
    (cls === "mridu" || cls === "kshipra" ? 0.5 : 0) + (ch8 ? -2 : 0);
  s.love += (wd === 5 ? 1.5 : wd === 1 ? 1 : wd === 2 ? -0.5 : 0) + (cls === "mridu" ? 1.5 : cls === "sthira" ? 0.5 : harsh ? -1 : 0) +
    (purnima ? 1 : shukla ? 0.5 : 0) + (ch8 ? -1.5 : 0) + (amavasya ? -1 : 0) + chandra * 0.5;
  s.health += (wd === 0 ? 1 : wd === 4 ? 0.5 : 0) + (cls === "sthira" || cls === "kshipra" ? 0.5 : 0) + (ch8 ? -1 : 0) + tara * 0.5;
  s.rest += (ch8 ? 2 : 0) + (amavasya ? 1.5 : 0) + (wd === 6 ? 1 : 0) + (q.rank <= -1 ? 1 : 0) + (harsh ? 0.5 : 0) + (rikta ? 0.5 : 0);
  s.new_starts += (wd === 4 ? 1.5 : [1, 3, 5].includes(wd) ? 0.5 : 0) +
    (cls === "sthira" ? 1.5 : cls === "kshipra" ? 1 : cls === "mridu" ? 0.5 : harsh ? -1.5 : 0) +
    (shukla ? 0.5 : 0) + (rikta ? -1.5 : 0) + (amavasya ? -2 : 0) + (ch8 ? -2 : 0) + tara * 0.75;
  for (const k of AREA_IDS) s[k] = Math.round(s[k] * 4) / 4;

  const restDay = ch8 || amavasya || q.rank <= -2;
  const ranked = AREA_IDS.filter((a) => a !== "rest").sort((a, b) => s[b] - s[a] || AREA_IDS.indexOf(a) - AREA_IDS.indexOf(b));
  let favours: AreaId[] = ranked.filter((a) => s[a] >= 1.5).slice(0, 2);
  if (restDay) favours = ["rest", ...favours.slice(0, 1)];
  else if (!favours.length && s.rest >= 1.5) favours = ["rest"];
  else if (!favours.length) favours = ranked.slice(0, 1);
  const low = [...ranked].reverse().find((a) => s[a] <= -1 && !favours.includes(a)) ?? null;
  const tone: DayTone = restDay ? "rest" : q.rank >= 1 ? "supportive" : "mixed";
  return {
    date: q.date,
    weekday: wd,
    tone,
    favours,
    avoid: low,
    chandrashtama: ch8,
    peak: Math.max(...ranked.map((a) => s[a])),
    scores: s,
    best: q.good[0] ?? null,
    rahu: q.rahu,
    tithi: q.tithi,
    nakshatra: q.nakshatra,
  };
}

export type CalPlace = { zone: string; lat: number; lng: number; natalNakshatra: string | null; natalRashi: string | null };

export function dayFacts(date: string, p: CalPlace): QuickDayFacts | null {
  return quickDayFacts({ date, zone: p.zone, latitude: p.lat, longitude: p.lng, natalNakshatra: p.natalNakshatra, natalRashi: p.natalRashi });
}

export function monthDays(month: string, p: CalPlace): CalDay[] {
  const start = DateTime.fromISO(`${month}-01`, { zone: p.zone });
  const out: CalDay[] = [];
  for (let d = start; d.month === start.month; d = d.plus({ days: 1 })) {
    const q = dayFacts(d.toISODate()!, p);
    if (q) out.push(scoreDay(q));
  }
  return out;
}

// ------------------------------------------------------------------ couples

export type CoupleDayType = "warm" | "soft" | "support_a" | "support_b" | "talk" | "ordinary";
export function coupleDayType(a: QuickDayFacts, b: QuickDayFacts): CoupleDayType {
  const ch8a = a.chandraHouse === 8, ch8b = b.chandraHouse === 8;
  if (ch8a || ch8b) {
    if (ch8a && !ch8b && b.rank >= 0) return "support_a";
    if (ch8b && !ch8a && a.rank >= 0) return "support_b";
    return "soft";
  }
  if (a.rank <= -1 && b.rank <= -1) return "soft";
  if (a.rank <= -2 && b.rank >= 0) return "support_a";
  if (b.rank <= -2 && a.rank >= 0) return "support_b";
  if (Math.min(a.rank, b.rank) >= 0 && a.rank + b.rank >= 2) return "warm";
  if (a.weekday === 3 || (a.taraSupport === 1 && b.taraSupport === 1)) return "talk";
  return "ordinary";
}

// ------------------------------------------------------------------ year

export const THEME_BY_LORD: Record<string, string> = {
  Sun: "lead", Moon: "home", Mars: "act", Mercury: "learn", Jupiter: "grow",
  Venus: "connect", Saturn: "build", Rahu: "explore", Ketu: "reflect",
};
const RASHIS = ["mesha", "vrishabha", "mithuna", "karka", "simha", "kanya", "tula", "vrishchika", "dhanu", "makara", "kumbha", "meena"];

export type YearMonth = {
  month: string;
  theme: string;
  ad_lord: string | null;
  ad_change: boolean;
  supportive_days: number;
  rest_days: number;
  best_dates: { date: string; area: AreaId }[];
  slow: "sade_sati" | "ashtama_shani" | null;
  jupiter_lift: boolean;
};

export function yearMonths(
  fromMonth: string,
  p: CalPlace,
  lordsAt: (d: Date) => { ad: string | null },
  count = 12,
): YearMonth[] {
  const moonSign = p.natalRashi ? RASHIS.indexOf(p.natalRashi.toLowerCase()) : -1;
  const out: YearMonth[] = [];
  const first = DateTime.fromISO(`${fromMonth}-01`, { zone: p.zone });
  for (let i = 0; i < count; i++) {
    const m = first.plus({ months: i });
    const key = m.toFormat("yyyy-MM");
    const days = monthDays(key, p);
    const mid = m.set({ day: 15, hour: 12 }).toJSDate();
    const start = m.set({ day: 1, hour: 12 }).toJSDate();
    const end = m.endOf("month").set({ hour: 12 }).toJSDate();
    const adMid = lordsAt(mid).ad;
    const adChange = lordsAt(start).ad !== lordsAt(end).ad;
    let slow: YearMonth["slow"] = null;
    let lift = false;
    if (moonSign >= 0) {
      const sat = Math.floor(siderealLon("Saturn", mid) / 30);
      const jup = Math.floor(siderealLon("Jupiter", mid) / 30);
      const hs = houseFrom(moonSign, sat);
      if (hs === 12 || hs === 1 || hs === 2) slow = "sade_sati";
      else if (hs === 8) slow = "ashtama_shani";
      lift = [2, 5, 7, 9, 11].includes(houseFrom(moonSign, jup));
    }
    const best = days
      .filter((d) => d.tone === "supportive")
      .flatMap((d) => d.favours.filter((f) => f !== "rest").slice(0, 1).map((f) => ({ date: d.date, area: f, s: d.scores[f] })))
      .sort((a, b) => b.s - a.s || a.date.localeCompare(b.date))
      .slice(0, 3)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(({ date, area }) => ({ date, area }));
    out.push({
      month: key,
      theme: adMid ? (THEME_BY_LORD[adMid] ?? "build") : "build",
      ad_lord: adMid,
      ad_change: adChange,
      supportive_days: days.filter((d) => d.tone === "supportive").length,
      rest_days: days.filter((d) => d.tone === "rest").length,
      best_dates: best,
      slow,
      jupiter_lift: lift,
    });
  }
  return out;
}
