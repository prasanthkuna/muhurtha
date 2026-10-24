/**
 * Ashtakoota (Guna Milan, 36 points) + Kuja (Mangal) dosha with its classical cancellations.
 * Pure, deterministic engine output for the Bond feature. Gender-neutral: kootas that the
 * tradition scores in a bride/groom order (Varna, Vashya, Gana) are scored both ways and
 * averaged, so swapping partners never changes the result.
 */
import { NAKSHATRAS } from "./vimshottari.ts";
import { type GrahaPos, houseFrom, type NatalGrahas } from "./grahas.ts";

export const KOOTA_IDS = ["varna", "vashya", "tara", "yoni", "graha_maitri", "gana", "bhakoot", "nadi"] as const;
export type KootaId = (typeof KOOTA_IDS)[number];
export const KOOTA_MAX: Record<KootaId, number> = {
  varna: 1, vashya: 2, tara: 3, yoni: 4, graha_maitri: 5, gana: 6, bhakoot: 7, nadi: 8,
};

/** Moon placement used by the kootas: nakshatra index 0..26 + pada 1..4 (rashi follows). */
export type MoonStar = { nak: number; pada: number };
export function rashiOfStar(s: MoonStar): number {
  return Math.floor((s.nak * 4 + (s.pada - 1)) / 9);
}
export function starFromLon(lon: number): MoonStar {
  const span = 360 / 27;
  const nak = Math.min(26, Math.floor(lon / span));
  const pada = Math.min(4, Math.floor((lon - nak * span) / (span / 4)) + 1);
  return { nak, pada };
}

// Gana: 0 Deva, 1 Manushya, 2 Rakshasa
const GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
export const GANA_KEYS = ["deva", "manushya", "rakshasa"] as const;
// Nadi: 0 Adi, 1 Madhya, 2 Antya (repeats A M An An M A)
const NADI = Array.from({ length: 27 }, (_, i) => [0, 1, 2, 2, 1, 0][i % 6]);
export const NADI_KEYS = ["adi", "madhya", "antya"] as const;
// Yoni animals (order of YONI_TABLE rows)
export const YONI_KEYS = ["horse", "elephant", "sheep", "serpent", "dog", "cat", "rat", "cow", "buffalo", "tiger", "deer", "monkey", "mongoose", "lion"] as const;
const YONI_OF_NAK = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
const YONI_TABLE = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];
export const _YONI_TABLE = YONI_TABLE;
// Varna by rashi: 3 Brahmin, 2 Kshatriya, 1 Vaishya, 0 Shudra
const VARNA = [2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3];
// Vashya groups: 0 chatushpada, 1 manava, 2 jalachara, 3 vanachara, 4 keeta
function vashyaGroup(rashi: number, star: MoonStar): number {
  const firstHalf = (star.nak * 4 + star.pada - 1) % 9 < 4.5;
  switch (rashi) {
    case 0: case 1: return 0;
    case 2: case 5: case 6: case 10: return 1;
    case 3: case 11: return 2;
    case 4: return 3;
    case 7: return 4;
    case 8: return firstHalf ? 1 : 0;
    case 9: return firstHalf ? 0 : 2;
  }
  return 1;
}
const VASHYA_TABLE = [
  [2, 1, 1, 0.5, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0.5, 0, 1, 2, 0],
  [1, 1, 1, 0, 2],
];
export const RASHI_LORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
type Rel = "F" | "N" | "E";
const FRIENDS: Record<string, { F: string[]; E: string[] }> = {
  Sun: { F: ["Moon", "Mars", "Jupiter"], E: ["Venus", "Saturn"] },
  Moon: { F: ["Sun", "Mercury"], E: [] },
  Mars: { F: ["Sun", "Moon", "Jupiter"], E: ["Mercury"] },
  Mercury: { F: ["Sun", "Venus"], E: ["Moon"] },
  Jupiter: { F: ["Sun", "Moon", "Mars"], E: ["Mercury", "Venus"] },
  Venus: { F: ["Mercury", "Saturn"], E: ["Sun", "Moon"] },
  Saturn: { F: ["Mercury", "Venus"], E: ["Sun", "Moon", "Mars"] },
};
export function relation(a: string, b: string): Rel {
  if (a === b) return "F";
  const r = FRIENDS[a];
  if (!r) return "N";
  return r.F.includes(b) ? "F" : r.E.includes(b) ? "E" : "N";
}
function maitriPoints(la: string, lb: string): number {
  if (la === lb) return 5;
  const k = [relation(la, lb), relation(lb, la)].sort().join("");
  return ({ FF: 5, FN: 4, NN: 3, EF: 1, EN: 0.5, EE: 0 } as Record<string, number>)[k] ?? 3;
}
// Gana table [x][y] in the traditional order; averaged both ways below.
const GANA_TABLE = [
  [6, 6, 0],
  [5, 6, 0],
  [0, 0, 6],
];

export type KootaResult = {
  id: KootaId;
  points: number;
  max: number;
  /** stable engine code the UI and the LLM explain in plain words */
  code: string;
  dosha?: boolean;
  dosha_cancelled?: boolean;
  cancel_rule?: string;
};

export type MatchResult = {
  total: number;
  max: 36;
  band: "very_easy" | "good" | "needs_care";
  kootas: KootaResult[];
  a: { nak: string; pada: number; rashi: number; gana: string; nadi: string; yoni: string };
  b: { nak: string; pada: number; rashi: number; gana: string; nadi: string; yoni: string };
};

function taraOk(from: number, to: number): boolean {
  const n = ((to - from + 27) % 27) + 1;
  return ![3, 5, 7].includes(n % 9 === 0 ? 9 : n % 9);
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function ashtakoota(a: MoonStar, b: MoonStar): MatchResult {
  const ra = rashiOfStar(a), rb = rashiOfStar(b);
  const ks: KootaResult[] = [];
  // 1 Varna
  const va = VARNA[ra], vb = VARNA[rb];
  const varna = ((va >= vb ? 1 : 0) + (vb >= va ? 1 : 0)) / 2;
  ks.push({ id: "varna", points: varna, max: 1, code: varna === 1 ? "same_or_balanced" : "different_approach" });
  // 2 Vashya
  const ga = vashyaGroup(ra, a), gb = vashyaGroup(rb, b);
  const vashya = (VASHYA_TABLE[ga][gb] + VASHYA_TABLE[gb][ga]) / 2;
  ks.push({ id: "vashya", points: vashya, max: 2, code: vashya >= 2 ? "easy_mutual" : vashya >= 1 ? "some_adjusting" : "more_adjusting" });
  // 3 Tara (both directions, 1.5 each)
  const tara = (taraOk(a.nak, b.nak) ? 1.5 : 0) + (taraOk(b.nak, a.nak) ? 1.5 : 0);
  ks.push({ id: "tara", points: tara, max: 3, code: tara === 3 ? "both_support" : tara > 0 ? "one_way_support" : "needs_care" });
  // 4 Yoni
  const ya = YONI_OF_NAK[a.nak], yb = YONI_OF_NAK[b.nak];
  const yoni = YONI_TABLE[ya][yb];
  ks.push({ id: "yoni", points: yoni, max: 4, code: yoni === 4 ? "same" : yoni >= 3 ? "friendly" : yoni === 2 ? "neutral" : "different_instincts" });
  // 5 Graha Maitri
  const la = RASHI_LORD[ra], lb = RASHI_LORD[rb];
  const maitri = maitriPoints(la, lb);
  ks.push({ id: "graha_maitri", points: maitri, max: 5, code: maitri >= 4 ? "friends" : maitri >= 3 ? "neutral" : "different_minds" });
  // 6 Gana
  const gna = GANA[a.nak], gnb = GANA[b.nak];
  const gana = (GANA_TABLE[gna][gnb] + GANA_TABLE[gnb][gna]) / 2;
  ks.push({ id: "gana", points: gana, max: 6, code: gna === gnb ? "same" : gana >= 5 ? "close" : "different_temperament" });
  // 7 Bhakoot
  const d1 = houseFrom(ra, rb), d2 = houseFrom(rb, ra);
  const pairKey = [d1, d2].sort((x, y) => x - y).join("/");
  const bhakootBad = ["2/12", "5/9", "6/8"].includes(pairKey);
  const lordsFriendly = la === lb || (relation(la, lb) === "F" && relation(lb, la) === "F");
  // Same sign lord is the exception common calculators restore points for; friendly lords
  // soften the dosha (flagged as cancelled) but keep the points honest.
  const bhakootPoints = !bhakootBad || la === lb ? 7 : 0;
  ks.push({
    id: "bhakoot",
    points: bhakootPoints,
    max: 7,
    code: bhakootBad ? `pair_${pairKey.replace("/", "_")}` : "supportive",
    ...(bhakootBad
      ? {
        dosha: true,
        dosha_cancelled: lordsFriendly,
        ...(lordsFriendly ? { cancel_rule: la === lb ? "same_sign_lord" : "friendly_sign_lords" } : {}),
      }
      : {}),
  });
  // 8 Nadi
  const sameNadi = NADI[a.nak] === NADI[b.nak];
  let nadiCancel: string | undefined;
  if (sameNadi) {
    if (ra === rb && a.nak !== b.nak) nadiCancel = "same_rashi_different_star";
    else if (a.nak === b.nak && a.pada !== b.pada) nadiCancel = "same_star_different_pada";
    else if (a.nak === b.nak && ra !== rb) nadiCancel = "same_star_different_rashi";
    else if (ra !== rb && la === lb) nadiCancel = "same_sign_lord";
  }
  const nadiPoints = !sameNadi || nadiCancel === "same_rashi_different_star" ? 8 : 0;
  ks.push({
    id: "nadi",
    points: nadiPoints,
    max: 8,
    code: sameNadi ? "same_nadi" : "different_nadi",
    ...(sameNadi ? { dosha: true, dosha_cancelled: Boolean(nadiCancel), ...(nadiCancel ? { cancel_rule: nadiCancel } : {}) } : {}),
  });
  const total = round1(ks.reduce((s, k) => s + k.points, 0));
  const side = (s: MoonStar, r: number) => ({
    nak: NAKSHATRAS[s.nak] as string,
    pada: s.pada,
    rashi: r,
    gana: GANA_KEYS[GANA[s.nak]],
    nadi: NADI_KEYS[NADI[s.nak]],
    yoni: YONI_KEYS[YONI_OF_NAK[s.nak]],
  });
  return {
    total,
    max: 36,
    band: total >= 28 ? "very_easy" : total >= 18 ? "good" : "needs_care",
    kootas: ks.map((k) => ({ ...k, points: round1(k.points) })),
    a: side(a, ra),
    b: side(b, rb),
  };
}

// ------------------------------------------------------------------ Kuja dosha

export const KUJA_HOUSES = [1, 2, 4, 7, 8, 12];
export type KujaRef = "lagna" | "moon" | "venus";
export type KujaResult = {
  /** where Mars sits, by reference; null when that reference is unavailable */
  from: Record<KujaRef, { house: number; flagged: boolean } | null>;
  present: boolean;
  /** person-level cancellations that apply (engine rule codes) */
  cancellations: string[];
  status: "none" | "cancelled" | "mild" | "present";
  approximate: boolean;
};

const EXCEPTION_SIGNS: Record<number, number[]> = {
  2: [2, 5], // 2nd in Mithuna / Kanya
  12: [1, 6], // 12th in Vrishabha / Tula
  4: [0, 7], // 4th in Mesha / Vrishchika
  7: [9, 3], // 7th in Makara / Karka
  8: [8, 11], // 8th in Dhanu / Meena
};

export function kujaDosha(n: NatalGrahas, moonRashi: number): KujaResult {
  const mars = n.grahas.Mars;
  const refs: Record<KujaRef, number | null> = {
    lagna: n.lagna ? n.lagna.sign : null,
    moon: moonRashi,
    venus: n.grahas.Venus.sign,
  };
  const from = {} as KujaResult["from"];
  for (const k of ["lagna", "moon", "venus"] as KujaRef[]) {
    const r = refs[k];
    if (r == null) {
      from[k] = null;
      continue;
    }
    const house = houseFrom(r, mars.sign);
    from[k] = { house, flagged: KUJA_HOUSES.includes(house) };
  }
  const flaggedRefs = (Object.keys(from) as KujaRef[]).filter((k) => from[k]?.flagged);
  const present = flaggedRefs.length > 0;
  const cancellations: string[] = [];
  if (present) {
    if (mars.sign === 0 || mars.sign === 7) cancellations.push("mars_own_sign");
    if (mars.sign === 9) cancellations.push("mars_exalted");
    if (mars.sign === 4 || mars.sign === 10) cancellations.push("mars_in_leo_or_aquarius");
    const jup = n.grahas.Jupiter as GrahaPos;
    const jh = houseFrom(jup.sign, mars.sign);
    if (jh === 1) cancellations.push("jupiter_with_mars");
    else if ([5, 7, 9].includes(jh)) cancellations.push("jupiter_aspects_mars");
    if (n.grahas.Moon && n.exact && n.grahas.Moon.sign === mars.sign) cancellations.push("moon_with_mars");
    // House-and-sign exceptions: every flagged reference must be covered by one.
    const covered = flaggedRefs.every((k) => {
      const h = from[k]!.house;
      return (EXCEPTION_SIGNS[h] ?? []).includes(mars.sign);
    });
    if (covered) cancellations.push("house_sign_exception");
  }
  const status: KujaResult["status"] = !present
    ? "none"
    : cancellations.length
    ? "cancelled"
    : flaggedRefs.length === 1
    ? "mild"
    : "present";
  return { from, present, cancellations, status, approximate: !n.exact };
}

/** Pair view: if both partners carry it, tradition treats it as balanced (cancelled). */
export function pairKuja(a: KujaResult, b: KujaResult): { status: "none" | "balanced" | "cancelled" | "one_side"; note_code: string } {
  const aOn = a.status === "mild" || a.status === "present";
  const bOn = b.status === "mild" || b.status === "present";
  if (aOn && bOn) return { status: "balanced", note_code: "both_have_it" };
  if (aOn || bOn) return { status: "one_side", note_code: aOn ? "a_has_it" : "b_has_it" };
  if (a.status === "cancelled" || b.status === "cancelled") return { status: "cancelled", note_code: "cancelled_in_chart" };
  return { status: "none", note_code: "none" };
}
