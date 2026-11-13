/**
 * Jyotisha rule engine on D1 (one Parashari school, whole-sign houses, Lahiri).
 *
 * Input: computed positions (grahas.ts). Output: an evidence pack — every chart statement the
 * model may make, each with a stable id, the calculation it comes from (ref) and the traditional
 * meaning it is allowed to explain. Nothing here is interpretation beyond classical tables:
 *   - house lordships from Lagna (Moon sign when the birth time is not exact: Chandra Lagna);
 *   - placements by sign and house; dignity (exalted / moolatrikona / own / friendly / neutral /
 *     enemy / debilitated, naisargika friendships); combustion; retrogression;
 *   - conjunctions (same sign), graha drishti (7th for all; Mars 4/8, Jupiter 5/9, Saturn 3/10;
 *     no node aspects — schools differ);
 *   - a small set of well-defined yogas (Gajakesari, Budha-Aditya, Chandra-Mangala, Pancha
 *     Mahapurusha, Parashari Raja yoga, Yogakaraka, Parivartana, Kemadruma);
 *   - dasha lords' natal role (houses ruled, placement, dignity) and their current transit link;
 *   - D9 (navamsa) only when the birth time is exact and not near a navamsa boundary; D10 only
 *     behind an explicit flag.
 */
import { GRAHA_KEYS, type GrahaKey, type GrahaPos, houseFrom } from "./grahas.ts";
import { RASHI_LORD, relation } from "./koota.ts";

export const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
type Planet = Exclude<GrahaKey, "Rahu" | "Ketu">;
const PLANETS: Planet[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

const EXALT: Record<Planet, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
/** Moolatrikona sign and degree range (BPHS). */
const MOOLA: Record<Planet, [number, number, number]> = {
  Sun: [4, 0, 20], Moon: [1, 3, 30], Mars: [0, 0, 12], Mercury: [5, 15, 20], Jupiter: [8, 0, 10], Venus: [6, 0, 15], Saturn: [10, 0, 20],
};
/** Combustion orbs from the Sun (degrees); [direct, retrograde]. */
const COMBUST: Partial<Record<Planet, [number, number]>> = {
  Moon: [12, 12], Mars: [17, 17], Mercury: [14, 12], Jupiter: [11, 11], Venus: [10, 8], Saturn: [15, 15],
};
const ASPECTS: Partial<Record<GrahaKey, number[]>> = {
  Sun: [7], Moon: [7], Mercury: [7], Venus: [7], Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10],
};
const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];
const DUSTHANA = [6, 8, 12];

export const HOUSE_MEANING: Record<number, string> = {
  1: "self, body, temperament, how one meets life",
  2: "family, savings, speech, food habits",
  3: "courage, effort, siblings, communication, short travel",
  4: "home, mother, inner peace, property, vehicles",
  5: "intelligence, children, creativity, learning, past merit",
  6: "work routines, service, health upkeep, debts, rivals",
  7: "partnership, marriage, business partners, public dealings",
  8: "sudden change, research, shared resources, longevity, hidden matters",
  9: "fortune, dharma, teachers, father, higher learning, long travel",
  10: "career, status, public role, authority, action",
  11: "gains, income, networks, elder siblings, wishes fulfilled",
  12: "expenses, rest, letting go, foreign lands, spiritual retreat",
};
export const GRAHA_KARAKA: Record<GrahaKey, string> = {
  Sun: "authority, father, vitality, self-respect",
  Moon: "mind, mother, feelings, nourishment",
  Mars: "energy, courage, property, siblings, drive",
  Mercury: "intellect, speech, trade, learning, skill",
  Jupiter: "wisdom, teachers, children, wealth, guidance",
  Venus: "relationships, comfort, art, pleasure, vehicles",
  Saturn: "discipline, duty, delay, labour, endurance",
  Rahu: "ambition, the unconventional, foreign things, obsession",
  Ketu: "detachment, spirituality, inherited skill, sudden breaks",
};
const DIGNITY_MEANING: Record<Dignity, string> = {
  exalted: "at full strength; its significations give their best",
  moolatrikona: "in its office sign; works steadily and purposefully",
  own: "at home; reliable and self-supported",
  friendly: "comfortable; results come with ease",
  neutral: "average strength; results depend on support",
  enemy: "uncomfortable; results come with effort",
  debilitated: "weak by sign; its significations need conscious care",
};
export const YOGA_MEANING: Record<string, string> = {
  gajakesari: "Gajakesari yoga: Jupiter in a kendra from the Moon; tradition links it with good name, wise counsel and protection",
  budha_aditya: "Budha-Aditya yoga: Sun and Mercury together; tradition links it with sharp intellect and skill with words",
  chandra_mangala: "Chandra-Mangala yoga: Moon and Mars together; tradition links it with enterprise and earning through effort",
  ruchaka: "Ruchaka (Pancha Mahapurusha): strong Mars in a kendra; courage, leadership, physical drive",
  bhadra: "Bhadra (Pancha Mahapurusha): strong Mercury in a kendra; intelligence, eloquence, trade",
  hamsa: "Hamsa (Pancha Mahapurusha): strong Jupiter in a kendra; wisdom, ethics, respect",
  malavya: "Malavya (Pancha Mahapurusha): strong Venus in a kendra; comfort, refinement, arts",
  sasa: "Sasa (Pancha Mahapurusha): strong Saturn in a kendra; authority through discipline and persistence",
  raja: "Raja yoga (Parashari): a kendra lord joins a trikona lord; tradition links it with rise through effort and support",
  yogakaraka: "Yogakaraka: one graha rules both a kendra and a trikona; its periods and placement matter more than usual",
  parivartana: "Parivartana yoga: two grahas in each other's signs; the two houses they rule work together",
  kemadruma: "Kemadruma: no graha beside the Moon (2nd/12th from it); tradition reads it as needing self-made support",
};
const PURUSHA: Partial<Record<Planet, string>> = { Mars: "ruchaka", Mercury: "bhadra", Jupiter: "hamsa", Venus: "malavya", Saturn: "sasa" };

export type Dignity = "exalted" | "moolatrikona" | "own" | "friendly" | "neutral" | "enemy" | "debilitated";
export type EvidenceKind = "lagna" | "placement" | "lordship" | "conjunction" | "aspect" | "yoga" | "dasha" | "transit" | "d9";
export type Evidence = {
  id: string;
  kind: EvidenceKind;
  /** The calculation, in plain words (what the engine computed). */
  ref: string;
  /** The traditional meaning the model may explain (English; the model localizes). */
  meaning: string;
  grahas: GrahaKey[];
  houses: number[];
  yoga?: string;
  /** Relative salience for selection (higher = more distinctive). */
  weight: number;
};
export type ChartInput = { grahas: Record<GrahaKey, GrahaPos>; lagna: GrahaPos | null; exact: boolean };
export type EvidenceOpts = {
  md?: string | null;
  ad?: string | null;
  /** Current transit positions (grahasAt(now)). */
  transit?: Record<GrahaKey, GrahaPos> | null;
  /** D10 is off unless explicitly enabled (and only with an exact, non-boundary birth time). */
  d10?: boolean;
};
export type ChartPack = {
  ref: "lagna" | "moon";
  ref_sign: string;
  confidence: { lagna: "exact" | "boundary" | "none"; d9: boolean; d10: boolean };
  evidence: Evidence[];
  /** House → evidence ids, for domain selection. */
  by_house: Record<number, string[]>;
  /** Graha → evidence ids. */
  by_graha: Record<string, string[]>;
};

const norm = (d: number) => ((d % 360) + 360) % 360;
const ord = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

export function signLord(sign: number): Planet {
  return RASHI_LORD[((sign % 12) + 12) % 12] as Planet;
}
export function ownSigns(p: Planet): number[] {
  return RASHI_LORD.map((l, i) => (l === p ? i : -1)).filter((i) => i >= 0);
}
export function dignityOf(p: Planet, lon: number): Dignity {
  const sign = Math.floor(norm(lon) / 30);
  const deg = norm(lon) % 30;
  // Moon: exaltation is Taurus 0-3°, moolatrikona Taurus 3-30°.
  if (p === "Moon" && sign === 1) return deg < 3 ? "exalted" : "moolatrikona";
  if (sign === EXALT[p]) {
    // Mercury: exalted Virgo 0-15, moolatrikona 15-20, own 20-30.
    if (p === "Mercury") return deg < 15 ? "exalted" : deg < 20 ? "moolatrikona" : "own";
    return "exalted";
  }
  if (sign === (EXALT[p] + 6) % 12) return "debilitated";
  const [ms, a, b] = MOOLA[p];
  if (sign === ms && deg >= a && deg < b) return "moolatrikona";
  if (ownSigns(p).includes(sign)) return "own";
  const r = relation(p, signLord(sign));
  return r === "F" ? "friendly" : r === "E" ? "enemy" : "neutral";
}
export function navamsaSign(lon: number): number {
  return Math.floor(norm(lon) / (30 / 9)) % 12;
}
/** Dasamsa (D10): odd signs count from the same sign, even signs from the 9th. */
export function dasamsaSign(lon: number): number {
  const sign = Math.floor(norm(lon) / 30);
  const part = Math.floor((norm(lon) % 30) / 3);
  return (sign % 2 === 0 ? sign + part : sign + 8 + part) % 12;
}
/** Houses a graha aspects (whole sign), counted from its own house. */
export function aspectedHouses(g: GrahaKey, house: number): number[] {
  return (ASPECTS[g] ?? []).map((n) => ((house - 1 + n - 1) % 12) + 1);
}

export function buildChartPack(chart: ChartInput, opts: EvidenceOpts = {}): ChartPack {
  const G = chart.grahas;
  const moonSign = G.Moon.sign;
  const lagnaExact = Boolean(chart.exact && chart.lagna);
  const refSign = lagnaExact ? chart.lagna!.sign : moonSign;
  const refName = lagnaExact ? "Lagna" : "the Moon sign (Chandra Lagna)";
  const lagnaDeg = chart.lagna ? chart.lagna.lon % 30 : null;
  // Within 1° of a sign edge (~4 minutes of birth time) the Lagna could flip with a small time error.
  const boundary = lagnaDeg != null && (lagnaDeg < 1 || lagnaDeg > 29);
  // D9 of the slow grahas does not depend on the minute of birth; it is still only used with an
  // exact birth time. The Moon's navamsa is skipped within 0.25° (~30 min) of a navamsa edge.
  const d9 = lagnaExact;
  const nearNavEdge = (lon: number) => { const f = (norm(lon) % (30 / 9)) / (30 / 9); return f < 0.075 || f > 0.925; };
  const d10 = Boolean(opts.d10) && lagnaExact && !boundary;
  const ev: Evidence[] = [];
  const push = (e: Evidence) => { if (!ev.some((x) => x.id === e.id)) ev.push(e); };
  const houseOf = (g: GrahaKey) => houseFrom(refSign, G[g].sign);
  const lordOf = (h: number) => signLord(refSign + h - 1);

  push({
    id: "lagna",
    kind: "lagna",
    ref: lagnaExact
      ? `Lagna ${SIGNS[refSign]} (lord ${signLord(refSign)})${boundary ? "; near a sign edge, so treat as approximate" : ""}`
      : `Birth time not exact: houses counted from the Moon sign ${SIGNS[moonSign]}`,
    meaning: `${HOUSE_MEANING[1]}; ${SIGNS[refSign]} rising is ruled by ${signLord(refSign)} (${GRAHA_KARAKA[signLord(refSign)]})`,
    grahas: [signLord(refSign)],
    houses: [1],
    weight: 5,
  });

  // Placements with dignity, retrogression, combustion.
  for (const g of GRAHA_KEYS) {
    const h = houseOf(g);
    const parts = [`${g} in ${SIGNS[G[g].sign]}, ${ord(h)} from ${refName}`];
    let meaning = `${GRAHA_KARAKA[g]} expressed through the ${ord(h)} house (${HOUSE_MEANING[h]})`;
    let weight = 2;
    if ((PLANETS as string[]).includes(g)) {
      const p = g as Planet;
      const dg = dignityOf(p, G[g].lon);
      parts.push(dg);
      meaning += `; ${DIGNITY_MEANING[dg]}`;
      if (dg === "exalted" || dg === "debilitated") weight += 2;
      else if (dg === "own" || dg === "moolatrikona") weight += 1;
      if (G[g].retro) { parts.push("retrograde"); meaning += "; retrograde: its matters are revisited and worked inward"; weight += 1; }
      const orb = COMBUST[p];
      if (orb && p !== "Moon") {
        const sep = Math.abs(((G[g].lon - G.Sun.lon + 540) % 360) - 180);
        if (sep < (G[g].retro ? orb[1] : orb[0])) { parts.push("combust"); meaning += "; combust (close to the Sun): its significations work behind authority"; weight += 1; }
      }
    }
    const ruled = (PLANETS as string[]).includes(g) ? ownSigns(g as Planet).map((s) => houseFrom(refSign, s)) : [];
    if (ruled.length) parts.push(`rules the ${ruled.map(ord).join(" and ")}`);
    push({ id: `p:${g.toLowerCase()}`, kind: "placement", ref: parts.join(", "), meaning, grahas: [g], houses: [h, ...ruled], weight });
  }

  // House lordship chains (where each house's lord sits).
  for (let h = 1; h <= 12; h++) {
    const lord = lordOf(h);
    const at = houseOf(lord);
    const tone = DUSTHANA.includes(at) && !DUSTHANA.includes(h) ? "the house's matters meet obstacles or change"
      : KENDRA.includes(at) || TRIKONA.includes(at) ? "the house's matters are supported"
      : "the house's matters link to the other house";
    push({
      id: `h${h}`,
      kind: "lordship",
      ref: `${ord(h)} lord ${lord} sits in the ${ord(at)}`,
      meaning: `${HOUSE_MEANING[h]} connects with ${HOUSE_MEANING[at]}; ${tone}`,
      grahas: [lord],
      houses: [h, at],
      weight: h === 1 || h === 10 || h === 7 ? 2 : 1,
    });
  }

  // Conjunctions (same sign).
  for (let i = 0; i < GRAHA_KEYS.length; i++) {
    for (let j = i + 1; j < GRAHA_KEYS.length; j++) {
      const a = GRAHA_KEYS[i], b = GRAHA_KEYS[j];
      if ((a === "Rahu" && b === "Ketu") || G[a].sign !== G[b].sign) continue;
      const sep = Math.abs(((G[a].lon - G[b].lon + 540) % 360) - 180);
      push({
        id: `c:${a.toLowerCase()}-${b.toLowerCase()}`,
        kind: "conjunction",
        ref: `${a} with ${b} in ${SIGNS[G[a].sign]} (${ord(houseOf(a))}), ${sep.toFixed(0)}° apart`,
        meaning: `${GRAHA_KARAKA[a]} blends with ${GRAHA_KARAKA[b]} in the area of ${HOUSE_MEANING[houseOf(a)]}`,
        grahas: [a, b],
        houses: [houseOf(a)],
        weight: sep < 8 ? 3 : 2,
      });
    }
  }

  // Graha drishti onto houses that hold grahas, the Lagna and the 10th/7th.
  for (const g of GRAHA_KEYS) {
    for (const h of aspectedHouses(g, houseOf(g))) {
      const targets = GRAHA_KEYS.filter((t) => t !== g && houseOf(t) === h);
      if (!targets.length && ![1, 7, 10].includes(h)) continue;
      if (houseOf(g) === h) continue;
      push({
        id: `a:${g.toLowerCase()}>${h}`,
        kind: "aspect",
        ref: `${g} aspects the ${ord(h)}${targets.length ? ` (${targets.join(", ")})` : ""}`,
        meaning: `${GRAHA_KARAKA[g]} influences ${HOUSE_MEANING[h]}`,
        grahas: [g, ...targets],
        houses: [h],
        weight: (g === "Jupiter" || g === "Saturn") ? 2 : 1,
      });
    }
  }

  // Yogas.
  const yoga = (key: string, ref: string, grahas: GrahaKey[], houses: number[], weight = 4) =>
    push({ id: `y:${key}`, kind: "yoga", ref, meaning: YOGA_MEANING[key.split(":")[0]], grahas, houses, yoga: key.split(":")[0], weight });
  const fromMoon = (g: GrahaKey) => houseFrom(moonSign, G[g].sign);
  if (KENDRA.includes(fromMoon("Jupiter"))) yoga("gajakesari", `Jupiter ${ord(fromMoon("Jupiter"))} from the Moon`, ["Jupiter", "Moon"], [houseOf("Jupiter")]);
  if (G.Sun.sign === G.Mercury.sign) yoga("budha_aditya", `Sun and Mercury together in ${SIGNS[G.Sun.sign]}`, ["Sun", "Mercury"], [houseOf("Sun")], 3);
  if (G.Moon.sign === G.Mars.sign) yoga("chandra_mangala", `Moon and Mars together in ${SIGNS[G.Moon.sign]}`, ["Moon", "Mars"], [houseOf("Moon")]);
  if (lagnaExact) {
    for (const [p, key] of Object.entries(PURUSHA) as [Planet, string][]) {
      const dg = dignityOf(p, G[p].lon);
      if ((dg === "exalted" || dg === "own" || dg === "moolatrikona") && KENDRA.includes(houseOf(p))) {
        yoga(key, `${p} ${dg} in ${SIGNS[G[p].sign]}, ${ord(houseOf(p))} from Lagna (a kendra)`, [p], [houseOf(p)], 5);
      }
    }
    // Yogakaraka: one planet rules a kendra (not the 1st) and a trikona (not the 1st).
    for (const p of PLANETS) {
      const ruled = ownSigns(p).map((s) => houseFrom(refSign, s));
      if (ruled.some((h) => [4, 7, 10].includes(h)) && ruled.some((h) => [5, 9].includes(h))) {
        yoga(`yogakaraka:${p.toLowerCase()}`, `${p} rules the ${ruled.map(ord).join(" and ")} (kendra + trikona) for ${SIGNS[refSign]} Lagna`, [p], ruled, 4);
      }
    }
    // Parashari Raja yoga: a kendra lord and a trikona lord (different grahas) conjunct or in mutual 7th.
    const kLords = [...new Set([4, 7, 10].map(lordOf))];
    const tLords = [...new Set([5, 9].map(lordOf))];
    for (const k of kLords) {
      for (const t of tLords) {
        if (k === t) continue;
        const together = G[k].sign === G[t].sign;
        const mutual = houseFrom(G[k].sign, G[t].sign) === 7;
        if (together || mutual) {
          const pair = [k, t].sort().join("-").toLowerCase();
          yoga(`raja:${pair}`, `${k} (kendra lord) and ${t} (trikona lord) ${together ? `together in ${SIGNS[G[k].sign]}` : "in mutual 7th aspect"}`, [k, t], [houseOf(k), houseOf(t)], 4);
        }
      }
    }
  }
  for (let i = 0; i < PLANETS.length; i++) {
    for (let j = i + 1; j < PLANETS.length; j++) {
      const a = PLANETS[i], b = PLANETS[j];
      if (ownSigns(a).includes(G[b].sign) && ownSigns(b).includes(G[a].sign)) {
        yoga(`parivartana:${a.toLowerCase()}-${b.toLowerCase()}`, `${a} in ${b}'s sign and ${b} in ${a}'s sign (exchange)`, [a, b], [houseOf(a), houseOf(b)], 4);
      }
    }
  }
  const besideMoon = (["Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as GrahaKey[]).filter((g) => [1, 2, 12].includes(fromMoon(g)));
  if (!besideMoon.length) yoga("kemadruma", "No graha (other than Sun and nodes) in or beside the Moon's sign", ["Moon"], [houseOf("Moon")], 3);

  // D9 vargottama / navamsa dignity, only for a precise birth time.
  if (d9) {
    for (const p of PLANETS) {
      if (p === "Moon" && nearNavEdge(G.Moon.lon)) continue;
      const n = navamsaSign(G[p].lon);
      if (n === G[p].sign) {
        push({ id: `d9:${p.toLowerCase()}`, kind: "d9", ref: `${p} vargottama (same sign ${SIGNS[n]} in D1 and D9)`, meaning: `${GRAHA_KARAKA[p]} is steady and dependable (vargottama strengthens it)`, grahas: [p], houses: [houseOf(p)], weight: 3 });
      } else if (n === EXALT[p] || n === (EXALT[p] + 6) % 12) {
        const up = n === EXALT[p];
        push({ id: `d9:${p.toLowerCase()}`, kind: "d9", ref: `${p} ${up ? "exalted" : "debilitated"} in the navamsa (${SIGNS[n]})`, meaning: `${GRAHA_KARAKA[p]} ${up ? "gains inner strength over time" : "needs maturity to give its best"}`, grahas: [p], houses: [houseOf(p)], weight: 2 });
      }
    }
  }
  if (d10) {
    const ten = lordOf(10);
    const s = dasamsaSign(G[ten].lon);
    push({ id: "d10:10lord", kind: "d9", ref: `10th lord ${ten} falls in ${SIGNS[s]} in the dasamsa (D10)`, meaning: `career themes coloured by ${GRAHA_KARAKA[signLord(s)]}`, grahas: [ten], houses: [10], weight: 1 });
  }

  // Dasha lords: natal role + transit link.
  const lordRole = (lord: string, tag: "md" | "ad") => {
    if (!(GRAHA_KEYS as readonly string[]).includes(lord)) return;
    const g = lord as GrahaKey;
    const h = houseOf(g);
    const ruled = (PLANETS as string[]).includes(g) ? ownSigns(g as Planet).map((s) => houseFrom(refSign, s)) : [];
    const dg = (PLANETS as string[]).includes(g) ? dignityOf(g as Planet, G[g].lon) : null;
    const role = ruled.includes(1) ? "the Lagna lord (central to the whole chart)"
      : ruled.some((x) => x === 5 || x === 9) ? "a trikona lord (supportive)"
      : ruled.some((x) => DUSTHANA.includes(x)) ? "a dusthana lord (growth through difficulty)"
      : ruled.some((x) => KENDRA.includes(x)) ? "a kendra lord (action, structure)" : "a node (acts like its sign lord)";
    const nodeLord = g === "Rahu" || g === "Ketu" ? signLord(G[g].sign) : null;
    push({
      id: `${tag}:${g.toLowerCase()}`,
      kind: "dasha",
      ref: `${tag === "md" ? "Mahadasha" : "Antardasha"} lord ${g}: natal ${SIGNS[G[g].sign]}, ${ord(h)} from ${refName}${dg ? `, ${dg}` : ""}${ruled.length ? `, rules the ${ruled.map(ord).join(" and ")}` : ""}${nodeLord ? `, sign lord ${nodeLord}` : ""}; ${role}`,
      meaning: `this period activates ${HOUSE_MEANING[h]}${ruled.length ? ` and ${ruled.map((x) => HOUSE_MEANING[x]).join("; ")}` : ""}; ${GRAHA_KARAKA[g]}${dg ? `; ${DIGNITY_MEANING[dg]}` : ""}`,
      grahas: [g, ...(nodeLord ? [nodeLord] : [])],
      houses: [h, ...ruled],
      weight: tag === "md" ? 5 : 5,
    });
    const T = opts.transit;
    if (T) {
      const tm = houseFrom(moonSign, T[g].sign);
      const tl = houseFrom(refSign, T[g].sign);
      push({
        id: `t:${g.toLowerCase()}`,
        kind: "transit",
        ref: `${g} now transits ${SIGNS[T[g].sign]}: ${ord(tm)} from the natal Moon, ${ord(tl)} from ${refName}`,
        meaning: `the ${tag === "md" ? "period" : "sub-period"} lord is now moving through ${HOUSE_MEANING[tl]}`,
        grahas: [g],
        houses: [tl],
        weight: 3,
      });
    }
  };
  if (opts.md) lordRole(opts.md, "md");
  if (opts.ad && opts.ad !== opts.md) lordRole(opts.ad, "ad");
  if (opts.md && opts.ad && opts.md !== opts.ad && (GRAHA_KEYS as readonly string[]).includes(opts.md) && (GRAHA_KEYS as readonly string[]).includes(opts.ad)) {
    const rel = houseFrom(G[opts.md as GrahaKey].sign, G[opts.ad as GrahaKey].sign);
    const tone = [6, 8].includes(rel) ? "6/8 from each other: friction between the two agendas"
      : [2, 12].includes(rel) ? "2/12 from each other: one gains as the other spends"
      : [1, 5, 7, 9, 10, 4].includes(rel) ? "well placed from each other: the two agendas cooperate" : "a neutral link";
    push({ id: "md-ad", kind: "dasha", ref: `${opts.ad} sits ${ord(rel)} from ${opts.md} in the birth chart`, meaning: tone, grahas: [opts.md as GrahaKey, opts.ad as GrahaKey], houses: [], weight: 3 });
  }
  // Slow transits from the Moon that tradition watches (Saturn, Jupiter).
  if (opts.transit) {
    const sm = houseFrom(moonSign, opts.transit.Saturn.sign);
    const sadeSati = [12, 1, 2].includes(sm);
    if (sadeSati || sm === 8 || sm === 4) {
      push({ id: "t:saturn-moon", kind: "transit", ref: `Saturn transits the ${ord(sm)} from the natal Moon${sadeSati ? " (Sade Sati)" : sm === 8 ? " (Ashtama Shani)" : " (Ardhashtama)"}`, meaning: "a stretch of heavier duty and slower results; steadiness is rewarded", grahas: ["Saturn", "Moon"], houses: [houseOf("Moon")], weight: 4 });
    }
    const jm = houseFrom(moonSign, opts.transit.Jupiter.sign);
    push({ id: "t:jupiter-moon", kind: "transit", ref: `Jupiter transits the ${ord(jm)} from the natal Moon`, meaning: [2, 5, 7, 9, 11].includes(jm) ? "a supportive Jupiter transit (gochara): help and growth come more easily" : "Jupiter's transit is less supportive from the Moon; growth needs patience", grahas: ["Jupiter", "Moon"], houses: [], weight: 2 });
  }

  const by_house: Record<number, string[]> = {};
  const by_graha: Record<string, string[]> = {};
  for (const e of ev) {
    for (const h of new Set(e.houses)) (by_house[h] ??= []).push(e.id);
    for (const g of new Set(e.grahas)) (by_graha[g] ??= []).push(e.id);
  }
  return {
    ref: lagnaExact ? "lagna" : "moon",
    ref_sign: SIGNS[refSign],
    confidence: { lagna: lagnaExact ? (boundary ? "boundary" : "exact") : "none", d9, d10 },
    evidence: ev,
    by_house,
    by_graha,
  };
}

/** Houses (and karakas) each life area reads from. */
export const AREA_HOUSES: Record<string, { houses: number[]; karaka: GrahaKey[] }> = {
  career: { houses: [10, 6, 2], karaka: ["Sun", "Saturn"] },
  money: { houses: [2, 11], karaka: ["Jupiter"] },
  business: { houses: [7, 10, 3], karaka: ["Mercury"] },
  relationship: { houses: [7], karaka: ["Venus"] },
  family: { houses: [4, 2], karaka: ["Moon"] },
  health: { houses: [1, 6], karaka: ["Sun", "Moon"] },
  education: { houses: [5, 4, 9], karaka: ["Mercury", "Jupiter"] },
  children: { houses: [5], karaka: ["Jupiter"] },
  spirituality: { houses: [9, 12], karaka: ["Jupiter", "Ketu"] },
};

/** Evidence ids for one area: its house lords' chains, grahas in its houses, aspects on them, karaka placements. */
export function areaEvidence(pack: ChartPack, area: string, max = 6): Evidence[] {
  const spec = AREA_HOUSES[area] ?? { houses: [1], karaka: [] };
  const want = new Set<string>();
  for (const h of spec.houses) {
    want.add(`h${h}`);
    for (const id of pack.by_house[h] ?? []) if (/^(p:|a:|y:|c:)/.test(id)) want.add(id);
  }
  for (const k of spec.karaka) want.add(`p:${k.toLowerCase()}`);
  return pack.evidence.filter((e) => want.has(e.id)).sort((a, b) => b.weight - a.weight).slice(0, max);
}

/** The most distinctive chart facts (yogas, strong/weak dignities, D9), for the opening insight. */
export function topEvidence(pack: ChartPack, max = 8): Evidence[] {
  return [...pack.evidence].filter((e) => e.kind !== "lordship" && e.kind !== "aspect" && e.kind !== "transit")
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id)).slice(0, max);
}
