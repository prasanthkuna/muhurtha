/**
 * Deterministic Panchanga briefing and preliminary purpose-date comparison.
 * This is a traditional calendar interpretation, NOT a probability of success.
 * Calculation conventions: sidereal Lahiri for Moon/Sun, sunrise-based day facts.
 * Purpose-specific ceremony Muhurtas require separate reviewed rules.
 */
import { DateTime } from "luxon";
import { moonSiderealLongitudeDeg, sunTropicalLongitudeDeg, lahiriAyanamsaDeg } from "./ephemeris.ts";
import { NAKSHATRAS } from "./vimshottari.ts";
import { divideDaylight, goodAndCautionWindows, sunriseSunset } from "./solar.ts";

const TITHIS = ["Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima"];
const YOGAS = ["Vishkambha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shula","Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyan","Parigha","Shiva","Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti"];
const KARANAS = ["Bava","Balava","Kaulava","Taitila","Garaja","Vanija","Vishti"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const RASHIS = ["mesha","vrishabha","mithuna","karka","simha","kanya","tula","vrishchika","dhanu","makara","kumbha","meena"];
const TARAS = ["Janma","Sampat","Vipat","Kshema","Pratyak","Sadhana","Naidhana","Mitra","Parama Mitra"];
const norm = (degrees: number) => ((degrees % 360) + 360) % 360;
function sunSidereal(instant: Date): number {
  const jd = instant.getTime() / 86400000 + 2440587.5;
  return norm(sunTropicalLongitudeDeg(instant) - lahiriAyanamsaDeg(jd));
}
function karana(index: number): string {
  if (index === 0) return "Kimstughna";
  if (index >= 57) return ["Shakuni","Chatushpada","Naga"][index - 57] ?? "Naga";
  return KARANAS[(index - 1) % KARANAS.length]!;
}
export type PanchangaFactor = { name: string; value: string; nextChange?: string | null };
export type DayWindow = { start: string; end: string; label: string; reason?: string };
export type DayEvaluation = {
  date: string; locationVerified: true; method: string; timezone: string;
  tithi: PanchangaFactor; nakshatra: PanchangaFactor;
  yoga: PanchangaFactor; karana: PanchangaFactor; vara: PanchangaFactor;
  tarabala?: PanchangaFactor; chandrabala?: PanchangaFactor;
  support: string[]; caution: string[]; limitations: string[];
  status: "matched" | "partly_matched" | "not_matched" | "limited_assessment";
  best_windows: DayWindow[]; caution_windows: DayWindow[];
  rank: number;
};
function indices(at: Date) {
  const moon = moonSiderealLongitudeDeg(at);
  const sun = sunSidereal(at);
  return {
    tithi: Math.floor(norm(moon - sun) / 12),
    nakshatra: Math.floor(moon / (360 / 27)),
    yoga: Math.floor(norm(moon + sun) / (360 / 27)),
    karana: Math.floor(norm(moon - sun) / 6),
    moonRashi: Math.floor(moon / 30),
  };
}
function tithiLabel(index: number): string {
  return index < 15
    ? "Shukla " + TITHIS[index]!
    : "Krishna " + (index === 29 ? "Amavasya" : TITHIS[index - 15]!);
}
/** Find the first change of this field after sunrise (not the last change).
 * Scan then bisect; no inventing clock times in the LLM.
 */
function nextTransition(
  from: Date, key: "tithi" | "nakshatra" | "yoga" | "karana", zone: string,
): string | null {
  const initial = indices(from)[key];
  let left = from.getTime();
  const until = left + 36 * 3600000;
  for (let right = left + 30 * 60000; right <= until; right += 30 * 60000) {
    if (indices(new Date(right))[key] !== initial) {
      let lo = left, hi = right;
      for (let n = 0; n < 22; n++) {
        const mid = Math.floor((lo + hi) / 2);
        if (indices(new Date(mid))[key] === initial) lo = mid;
        else hi = mid;
      }
      return DateTime.fromMillis(hi).setZone(zone).toISO({ suppressMilliseconds: true });
    }
    left = right;
  }
  return null;
}
function nameIndex(input: string | undefined | null, values: readonly string[]): number {
  if (!input) return -1;
  const x = input.trim().toLowerCase().replace(/[^a-z]/g,"");
  return values.findIndex((v) => v.toLowerCase().replace(/[^a-z]/g,"") === x);
}
export function evaluateDay(args: {
  date: string; zone: string; latitude: number; longitude: number;
  purpose: string; natalNakshatra?: string | null; natalRashi?: string | null;
}): DayEvaluation {
  const {date,zone,latitude,longitude,purpose,natalNakshatra,natalRashi} = args;
  const day = DateTime.fromISO(date,{zone});
  if (!day.isValid || day.toISODate() !== date ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
      !DateTime.now().setZone(zone).isValid) {
    throw new Error("Invalid date, location or timezone");
  }
  const noon = day.set({hour:12,minute:0}).toJSDate();
  const sunRange = sunriseSunset(noon,latitude,longitude);
  if (!Number.isFinite(sunRange.sunrise.getTime()) ||
      !Number.isFinite(sunRange.sunset.getTime()) ||
      sunRange.sunset <= sunRange.sunrise) {
    throw new Error("No supported sunrise/sunset for the selected place and date");
  }
  const at = sunRange.sunrise;
  const n = indices(at);
  const f = (name: string, value: string, key: "tithi"|"nakshatra"|"yoga"|"karana"): PanchangaFactor =>
    ({name,value,nextChange:nextTransition(at,key,zone)});
  const tithi = f("Tithi",tithiLabel(n.tithi),"tithi");
  const nakshatra = f("Nakshatra",NAKSHATRAS[n.nakshatra] ?? "Unknown","nakshatra");
  const yoga = f("Yoga",YOGAS[n.yoga] ?? "Unknown","yoga");
  const karanaFactor = f("Karana",karana(n.karana),"karana");
  const weekday = (day.weekday % 7);
  const vara = {name:"Vara",value:WEEKDAYS[weekday]!};
  const slices = divideDaylight(sunRange,weekday);
  const windows = goodAndCautionWindows(slices,zone);
  const caution_windows: DayWindow[] = slices.filter(s=>s.isRahu||s.isYamagandam||s.isGulika).map(s=>({
    start:DateTime.fromJSDate(s.start).setZone(zone).toFormat("HH:mm"),
    end:DateTime.fromJSDate(s.end).setZone(zone).toFormat("HH:mm"),
    label:s.isRahu?"Rahu Kalam":s.isYamagandam?"Yamagandam":"Gulika",
    reason:"Traditional general avoidance interval for new beginnings",
  })).sort((a,b)=>a.start.localeCompare(b.start));
  const best_windows = windows.good.map(w=>({...w,reason:"General daylight interval outside Rahu/Yamagandam/Gulika; not a purpose-specific Muhurta"}));
  const support: string[] = [];
  const caution: string[] = [];
  const limitations = [
    "Preliminary traditional Panchanga factors; not a verified activity-specific Muhurta.",
    "General daylight windows are not individualized favourable outcomes.",
  ];
  let rank = 0;
  let tarabala: PanchangaFactor | undefined;
  let chandrabala: PanchangaFactor | undefined;
  const natalNak = nameIndex(natalNakshatra, NAKSHATRAS);
  if (natalNak >= 0) {
    const taraIndex = ((n.nakshatra - natalNak + 27) % 27) % 9;
    const tara = TARAS[taraIndex]!;
    tarabala = {name:"Tarabala",value:tara};
    if ([1,3,5,7,8].includes(taraIndex)) { support.push("Tarabala: "+tara); rank += 1; }
    else if ([2,4,6].includes(taraIndex)) { caution.push("Tarabala: "+tara); rank -= 1; }
    else caution.push("Tarabala: Janma (mixed)");
  } else limitations.push("Birth Nakshatra is unavailable; Tarabala was not assessed.");
  const birthSign = nameIndex(natalRashi, RASHIS);
  if (birthSign >= 0) {
    const house = ((n.moonRashi - birthSign + 12) % 12) + 1;
    chandrabala = {name:"Chandrabala",value:"Moon in house "+house+" from natal Rashi"};
    if ([1,3,6,7,10,11].includes(house)) { support.push("Chandrabala: traditionally supportive"); rank += 1; }
    else { caution.push("Chandrabala: traditionally mixed"); rank -= 1; }
  } else limitations.push("Natal Rashi is unavailable; Chandrabala was not assessed.");
  if (best_windows.length === 0) caution.push("No assessed general daytime window");
  const onlyGeneral = purpose === "relationship_marriage_talk" || purpose === "spiritual_puja" ||
    purpose === "property_vehicle" || purpose === "legal_dispute";
  if (onlyGeneral) limitations.push("A specialist Muhurta ruleset is required for formal ceremonies and binding decisions.");
  const childSamskara = purpose === "child_naming" || purpose === "child_first_food" ||
    purpose === "child_first_haircut";
  if (childSamskara) limitations.push("For the ceremony itself, confirm the final Muhurta with your family priest.");
  const medical = purpose === "child_doctor_visit";
  if (medical) limitations.push("Never delay a vaccination or medical care for timing; use this only to pick a calmer slot within your doctor's schedule.");
  let status: DayEvaluation["status"] = onlyGeneral || (natalNak < 0 && birthSign < 0)
    ? "limited_assessment"
    : rank > 0 ? "matched" : rank < 0 ? "not_matched" : "partly_matched";
  // Medical visits are never "wait": at worst the day is mixed.
  if (medical && status === "not_matched") status = "partly_matched";
  return {
    date,locationVerified:true,method:"sunrise-panchanga-lahiri-v1",timezone:zone,
    tithi,nakshatra,yoga,karana:karanaFactor,vara,tarabala,chandrabala,
    support,caution,limitations,status,best_windows,caution_windows,rank,
  };
}

export type QuickDayFacts = {
  date: string;
  weekday: number;
  tithi: string;
  paksha: "shukla" | "krishna";
  nakshatra: string;
  yoga: string;
  moonRashi: string;
  tara: string | null;
  taraSupport: -1 | 0 | 1 | null;
  chandraHouse: number | null;
  chandraSupport: -1 | 1 | null;
  rank: number;
  good: { start: string; end: string }[];
  rahu: { start: string; end: string } | null;
  /** 0..29 (14 Purnima, 29 Amavasya) */
  tithiIndex: number;
  /** 0..26 */
  nakIndex: number;
};

/** Cheap sunrise facts for the reading packet (no transition search). */
export function quickDayFacts(args: {
  date: string; zone: string; latitude: number; longitude: number;
  natalNakshatra?: string | null; natalRashi?: string | null;
}): QuickDayFacts | null {
  const day = DateTime.fromISO(args.date, { zone: args.zone });
  if (!day.isValid) return null;
  const sun = sunriseSunset(day.set({ hour: 12, minute: 0 }).toJSDate(), args.latitude, args.longitude);
  if (!Number.isFinite(sun.sunrise.getTime()) || !Number.isFinite(sun.sunset.getTime())) return null;
  const n = indices(sun.sunrise);
  const weekday = day.weekday % 7;
  const windows = goodAndCautionWindows(divideDaylight(sun, weekday), args.zone);
  let rank = 0;
  let tara: string | null = null;
  let taraSupport: QuickDayFacts["taraSupport"] = null;
  const natalNak = nameIndex(args.natalNakshatra, NAKSHATRAS);
  if (natalNak >= 0) {
    const ti = ((n.nakshatra - natalNak + 27) % 27) % 9;
    tara = TARAS[ti]!;
    taraSupport = [1, 3, 5, 7, 8].includes(ti) ? 1 : [2, 4, 6].includes(ti) ? -1 : 0;
    rank += taraSupport;
  }
  let chandraHouse: number | null = null;
  let chandraSupport: QuickDayFacts["chandraSupport"] = null;
  const birthSign = nameIndex(args.natalRashi, RASHIS);
  if (birthSign >= 0) {
    chandraHouse = ((n.moonRashi - birthSign + 12) % 12) + 1;
    chandraSupport = [1, 3, 6, 7, 10, 11].includes(chandraHouse) ? 1 : -1;
    rank += chandraSupport;
  }
  const rahu = windows.caution.find((w) => w.label === "Rahu Kalam");
  return {
    date: args.date,
    weekday,
    tithi: tithiLabel(n.tithi),
    paksha: n.tithi < 15 ? "shukla" : "krishna",
    nakshatra: NAKSHATRAS[n.nakshatra] ?? "Unknown",
    yoga: YOGAS[n.yoga] ?? "Unknown",
    moonRashi: RASHIS[n.moonRashi] ?? "unknown",
    tara,
    taraSupport,
    chandraHouse,
    chandraSupport,
    rank,
    good: windows.good.map((w) => ({ start: w.start, end: w.end })),
    rahu: rahu ? { start: rahu.start, end: rahu.end } : null,
    tithiIndex: n.tithi,
    nakIndex: n.nakshatra,
  };
}
