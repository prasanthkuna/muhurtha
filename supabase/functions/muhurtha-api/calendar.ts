/**
 * Month & Year Tuning Calendar — fully deterministic (no LLM). Scores what each date favours
 * from the same sunrise Panchanga the Today screen uses (tara, chandrabala, tithi, nakshatra
 * class, weekday) and returns codes only; every word comes from the reviewed phrase bank in
 * the PWA (messages-bond.ts) or bond_phrases.ts for pushes.
 */
import { DateTime } from "luxon";
import { quickDayFacts, type QuickDayFacts } from "./panchanga.ts";
import { houseFrom, siderealLon } from "./grahas.ts";
import { NAKSHATRAS } from "./vimshottari.ts";

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
  /** Tara from the natal star (Janma = the birth star or one of its two echoes). */
  tara?: string | null;
  /** Today's Moon star is the natal star. */
  birth_star?: boolean;
  /** One reason code for the tags, rendered by the PWA phrase bank (cal.why.*). */
  why?: CalWhy;
  /** Best is the calmest slot (rest days), not a "go" slot. */
  best_kind?: "go" | "calm";
  /** The natal star, sent only when the reason names it (sister-star / janma days). */
  natal_star?: string | null;
  festival?: string | null;
};

export type CalWhy =
  | "chandrashtama" | "birth_star" | "amavasya" | "purnima" | "ekadashi" | "chaturthi" | "rikta" | "janma"
  | "tara_good" | "tara_bad" | "sthira" | "chara" | "ugra" | "mishra" | "kshipra" | "mridu" | "tikshna";

/** The single strongest reason behind a day's tags, most specific first. */
export function whyCode(q: QuickDayFacts): CalWhy {
  const tnum = (q.tithiIndex % 15) + 1;
  if (q.chandraHouse === 8) return "chandrashtama";
  if (q.tithiIndex === 29) return "amavasya";
  if (q.tithiIndex === 14) return "purnima";
  if (tnum === 11) return "ekadashi";
  if (isSameStar(q)) return "birth_star";
  if (q.tara === "Janma") return "janma";
  if (q.taraSupport === 1 && (q.rank ?? 0) >= 1) return "tara_good";
  if (tnum === 4) return "chaturthi";
  if ([9, 14].includes(tnum)) return "rikta";
  if (q.taraSupport === -1) return "tara_bad";
  return nakClass(q.nakIndex);
}

/**
 * Best slot: never the slot that starts the minute Rahu Kalam ends (the day is still settling),
 * unless it is the only one. Rest days get the calmest (longest) slot, labelled "calm" in the UI.
 */
export function pickBest(q: QuickDayFacts, rest: boolean): { start: string; end: string } | null {
  if (!q.good.length) return null;
  const mins = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
  const notAfterRahu = q.good.filter((w) => !q.rahu || Math.abs(mins(w.start) - mins(q.rahu.end)) > 5);
  const pool = notAfterRahu.length ? notAfterRahu : q.good;
  if (!rest) return pool[0];
  return [...pool].sort((a, b) => (mins(b.end) - mins(b.start)) - (mins(a.end) - mins(a.start)) || mins(a.start) - mins(b.start))[0];
}

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
  // Janma-group days (birth star and its two sister stars) are low-energy days in muhurta:
  // never advertise them as good for new starts, whatever the weekday/class score says.
  const janmaGroup = q.tara === "Janma";
  const eligible = janmaGroup ? ranked.filter((a) => a !== "new_starts") : ranked;
  let favours: AreaId[] = eligible.filter((a) => s[a] >= 1.5).slice(0, 2);
  if (restDay) favours = ["rest", ...favours.slice(0, 1)];
  else if (!favours.length && s.rest >= 1.5) favours = ["rest"];
  else if (!favours.length) favours = eligible.slice(0, 1);
  const low = [...ranked].reverse().find((a) => s[a] <= -1 && !favours.includes(a)) ?? null;
  const why = whyCode(q);
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
    best: pickBest(q, restDay),
    rahu: q.rahu,
    tithi: q.tithi,
    nakshatra: q.nakshatra,
    tara: q.tara,
    birth_star: isSameStar(q),
    why,
    best_kind: restDay ? "calm" : "go",
    ...(why === "janma" && q.natalNakIndex != null && q.natalNakIndex >= 0 ? { natal_star: NAKSHATRAS[q.natalNakIndex] ?? null } : {}),
  };
}

/** Janma tara repeats every 9 stars; the birth star itself is the 0th offset only. */
function isSameStar(q: QuickDayFacts): boolean {
  return q.natalNakIndex != null && q.natalNakIndex >= 0 && q.natalNakIndex === q.nakIndex;
}

/**
 * Next full moon / new moon dates (sunrise tithi) on or after `from`, within ~31 days.
 * Estimates from today's tithi, then checks a few nearby sunrises (cheap: ~6 day evaluations).
 */
export function moonDates(from: string, p: CalPlace): { purnima: string | null; amavasya: string | null } {
  const start = DateTime.fromISO(from, { zone: p.zone });
  const q0 = dayFacts(from, p);
  if (!q0) return { purnima: null, amavasya: null };
  const find = (target: number): string | null => {
    if (q0.tithiIndex === target) return from;
    const ahead = (target - q0.tithiIndex + 30) % 30;
    const est = Math.round(ahead * 0.984);
    for (const off of [est, est - 1, est + 1, est - 2, est + 2]) {
      if (off < 0 || off > 31) continue;
      const d = start.plus({ days: off }).toISODate()!;
      const q = dayFacts(d, p);
      if (q && q.tithiIndex === target) return d;
    }
    // Kshaya tithi (never at sunrise): fall back to the estimate.
    return est >= 0 && est <= 31 ? start.plus({ days: est }).toISODate()! : null;
  };
  return { purnima: find(14), amavasya: find(29) };
}

export type CalPlace = { zone: string; lat: number; lng: number; natalNakshatra: string | null; natalRashi: string | null };

export function dayFacts(date: string, p: CalPlace): QuickDayFacts | null {
  return quickDayFacts({ date, zone: p.zone, latitude: p.lat, longitude: p.lng, natalNakshatra: p.natalNakshatra, natalRashi: p.natalRashi });
}

/** Per-isolate cache: a month for one place + natal star never changes (deterministic). */
const MONTH_CACHE = new Map<string, CalDay[]>();
const MONTH_CACHE_MAX = 300;

export function monthDays(month: string, p: CalPlace): CalDay[] {
  const key = `${CAL_VERSION}|${month}|${p.zone}|${p.lat.toFixed(3)}|${p.lng.toFixed(3)}|${p.natalNakshatra ?? ""}|${p.natalRashi ?? ""}`;
  const hit = MONTH_CACHE.get(key);
  if (hit) return hit;
  const out = computeMonthDays(month, p);
  if (MONTH_CACHE.size >= MONTH_CACHE_MAX) MONTH_CACHE.delete(MONTH_CACHE.keys().next().value!);
  MONTH_CACHE.set(key, out);
  return out;
}

function computeMonthDays(month: string, p: CalPlace): CalDay[] {
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

/** Month theme from the Sun's house counted from the natal Moon (moves one sign a month). */
export const SUN_HOUSE_THEME = ["", "spotlight", "money", "courage", "home", "create", "health", "partner", "inward", "luck", "career", "gains", "rest"] as const;
export type MonthTheme = typeof SUN_HOUSE_THEME[number] | "eclipse" | "review" | "pace";
export type MonthNote = "eclipse_solar" | "eclipse_lunar" | "merc_rx" | "jup_shift" | "sat_shift" | "rahu_moon";

export type YearMonth = {
  month: string;
  /** Transit-driven theme code (cal.mtheme.*). */
  theme: MonthTheme;
  /** The Sun-house theme when an override (eclipse / review / pace) took the headline. */
  sun_theme: MonthTheme;
  /** Dasha backdrop (cal.theme.*): the antardasha lord's flavour, constant for months at a time. */
  backdrop: string;
  ad_lord: string | null;
  ad_change: boolean;
  supportive_days: number;
  rest_days: number;
  chandrashtama_days: number;
  mercury_rx_days: number;
  notes: MonthNote[];
  best_dates: { date: string; area: AreaId }[];
  slow: "sade_sati" | "ashtama_shani" | null;
  jupiter_lift: boolean;
};

const YEAR_CACHE = new Map<string, YearMonth[]>();
const angDiff = (a: number, b: number) => ((b - a + 540) % 360) - 180;

export function yearMonths(
  fromMonth: string,
  p: CalPlace,
  lordsAt: (d: Date) => { ad: string | null },
  count = 12,
): YearMonth[] {
  const f0 = DateTime.fromISO(`${fromMonth}-01`, { zone: p.zone });
  const lordKey = Array.from({ length: count }, (_, i) => {
    const mm = f0.plus({ months: i });
    return `${lordsAt(mm.set({ day: 1, hour: 12 }).toJSDate()).ad}.${lordsAt(mm.set({ day: 15, hour: 12 }).toJSDate()).ad}.${lordsAt(mm.endOf("month").set({ hour: 12 }).toJSDate()).ad}`;
  }).join(",");
  const ck = `${fromMonth}|${count}|${p.zone}|${p.lat}|${p.lng}|${p.natalRashi}|${p.natalNakshatra ?? ""}|${lordKey}`;
  const hit = YEAR_CACHE.get(ck);
  if (hit) return hit;
  const moonSign = p.natalRashi ? RASHIS.indexOf(p.natalRashi.toLowerCase()) : -1;
  const ref = moonSign >= 0 ? moonSign : 0;
  const out: YearMonth[] = [];
  const first = DateTime.fromISO(`${fromMonth}-01`, { zone: p.zone });
  for (let i = 0; i < count; i++) {
    const m = first.plus({ months: i });
    const key = m.toFormat("yyyy-MM");
    const days = monthDays(key, p);
    const at = (day: number) => m.set({ day: Math.min(day, m.daysInMonth ?? 28), hour: 12 }).toJSDate();
    const mid = at(15);
    const start = at(1);
    const end = m.endOf("month").set({ hour: 12 }).toJSDate();
    const adMid = lordsAt(mid).ad;
    const adChange = lordsAt(start).ad !== lordsAt(end).ad;
    const sign = (g: Parameters<typeof siderealLon>[0], d: Date) => Math.floor(siderealLon(g, d) / 30);
    let slow: YearMonth["slow"] = null;
    let lift = false;
    const notes: MonthNote[] = [];
    if (moonSign >= 0) {
      const hs = houseFrom(moonSign, sign("Saturn", mid));
      if (hs === 12 || hs === 1 || hs === 2) slow = "sade_sati";
      else if (hs === 8) slow = "ashtama_shani";
      lift = [2, 5, 7, 9, 11].includes(houseFrom(moonSign, sign("Jupiter", mid)));
      if (houseFrom(moonSign, sign("Rahu", mid)) === 1) notes.push("rahu_moon");
    }
    if (sign("Jupiter", start) !== sign("Jupiter", end)) notes.push("jup_shift");
    if (sign("Saturn", start) !== sign("Saturn", end)) notes.push("sat_shift");
    // Mercury retrograde days (longitude going backwards day to day).
    let rx = 0;
    let prev = siderealLon("Mercury", at(1));
    const n = m.daysInMonth ?? 30;
    for (let d = 2; d <= n + 1; d++) {
      const dt = d <= n ? at(d) : m.plus({ months: 1 }).set({ day: 1, hour: 12 }).toJSDate();
      const cur = siderealLon("Mercury", dt);
      if (angDiff(prev, cur) < 0) rx++;
      prev = cur;
    }
    if (rx >= 5) notes.push("merc_rx");
    // Eclipses: a new / full moon with the Sun close to the nodes.
    for (const d of days) {
      if (d.why !== "amavasya" && d.why !== "purnima") continue;
      const dt = DateTime.fromISO(d.date, { zone: p.zone }).set({ hour: 12 }).toJSDate();
      const off = Math.abs(angDiff(siderealLon("Sun", dt), siderealLon("Rahu", dt)));
      if (Math.min(off, 180 - off) <= 12) {
        const code: MonthNote = d.why === "amavasya" ? "eclipse_solar" : "eclipse_lunar";
        if (!notes.includes(code)) notes.unshift(code);
      }
    }
    const supportive = days.filter((d) => d.tone === "supportive").length;
    const rest = days.filter((d) => d.tone === "rest").length;
    const ch8 = days.filter((d) => d.chandrashtama).length;
    const sunTheme = SUN_HOUSE_THEME[houseFrom(ref, sign("Sun", at(20)))] as MonthTheme;
    let theme: MonthTheme = sunTheme;
    const before = out[out.length - 1]?.theme;
    const pick = (t: MonthTheme) => { if (t !== before) theme = t; };
    if (notes.some((x) => x.startsWith("eclipse"))) pick("eclipse");
    else if (rx >= 10) pick("review");
    else if (rest >= 10 && rest > supportive) pick("pace");
    const best = days
      .filter((d) => d.tone === "supportive")
      .flatMap((d) => d.favours.filter((f) => f !== "rest").slice(0, 1).map((f) => ({ date: d.date, area: f, s: d.scores[f] })))
      .sort((a, b) => b.s - a.s || a.date.localeCompare(b.date))
      .slice(0, 3)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(({ date, area }) => ({ date, area }));
    out.push({
      month: key,
      theme,
      sun_theme: sunTheme,
      backdrop: adMid ? (THEME_BY_LORD[adMid] ?? "build") : "build",
      ad_lord: adMid,
      ad_change: adChange,
      supportive_days: supportive,
      rest_days: rest,
      chandrashtama_days: ch8,
      mercury_rx_days: rx,
      notes,
      best_dates: best,
      slow,
      jupiter_lift: lift,
    });
  }
  if (YEAR_CACHE.size > 200) YEAR_CACHE.clear();
  YEAR_CACHE.set(ck, out);
  return out;
}
