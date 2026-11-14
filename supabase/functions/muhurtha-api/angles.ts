/**
 * Engine-assigned per-day angles: the "already used" ledger that keeps 45 day cards from
 * reading like one template. Each day gets its own life area, action, opener, tone, lead
 * fact and the one slot the model writes a note for. Deterministic, no LLM chaining:
 * every shard sees the whole ledger in the cached prefix.
 */
import { TITHI_MEANING, tithiBase, YOGA_MEANING } from "./meanings.ts";

export type DayAngle = {
  /** Life area this day's copy is about. */
  area: string;
  /** What kind of action the day suggests. */
  action: string;
  /** How the body opens. */
  opener: string;
  tone: string;
  /** Which engine fact leads the reason. */
  lead: "star" | "tithi" | "tara" | "yoga";
  /** The natal trait may be mentioned only on these days (at most 1 in 5). */
  trait_ok: boolean;
  /** The one window the model writes a note for; the others get engine notes. */
  slot: string;
};

export type AngleInput = {
  date: string;
  weekday: number;
  tithi: string;
  tithiIndex: number;
  nakshatra: string;
  yoga: string;
  tara: string | null;
  rank: number;
  favours: string[];
  windows: { id: string; kind: "good" | "caution"; hora?: string; best?: boolean }[];
  /** The engine's day verdict (calendar.ts); the card must agree with it. */
  tone?: "supportive" | "mixed" | "rest";
  avoid?: string | null;
};

const ADULT_POOL = ["work", "money", "home", "family", "partner", "friends", "body", "learning", "self", "errands"];
const CHILD_POOL = ["play", "learning", "sleep", "food", "bonding", "family", "outdoors", "calm"];
const FAVOUR_AREA: Record<string, [string, string]> = {
  money: ["money", "learning"],
  travel: ["errands", "outdoors"],
  talks: ["friends", "bonding"],
  love: ["partner", "bonding"],
  health: ["body", "food"],
  rest: ["self", "sleep"],
  new_starts: ["work", "learning"],
};
const OPENERS = ["scene", "question", "contrast", "reason", "person", "verdict", "image"];
export const OPENER_HOW: Record<string, string> = {
  scene: "open with a small everyday scene",
  question: "open with a short, real question",
  contrast: "open with a 'not this, but that' contrast",
  reason: "open with the reason (the lead fact's meaning) in plain words",
  person: "open with someone in their life",
  verdict: "open with a plain one-clause verdict",
  image: "open with a tiny image or metaphor",
};
const TONES: Record<string, string[]> = {
  careful: ["calm", "gentle", "steady"],
  mixed: ["light", "practical", "warm"],
  supportive: ["upbeat", "brisk", "playful"],
};
const AREA_HORA: Record<string, string[]> = {
  work: ["sun", "saturn", "mercury"], money: ["jupiter", "mercury", "venus"], home: ["moon", "mars"],
  family: ["moon", "jupiter"], partner: ["venus", "moon"], friends: ["venus", "mercury"], body: ["mars", "sun"],
  learning: ["mercury", "jupiter"], self: ["moon", "jupiter", "sun"], errands: ["mercury", "saturn"],
  play: ["venus", "mars"], sleep: ["moon"], food: ["moon", "jupiter"], bonding: ["moon", "venus"],
  outdoors: ["mars", "sun"], calm: ["moon", "jupiter"],
};

/** Areas that suit a keep-light day, and the actions a non-supportive day must not suggest. */
const LIGHT_AREAS = new Set(["self", "home", "errands", "body", "family", "learning", "sleep", "calm", "food", "bonding"]);
const AVOID_AREA: Record<string, string[]> = {
  money: ["money"], travel: ["errands", "outdoors"], talks: ["friends"], love: ["partner"], health: ["body"], new_starts: ["work"],
};
const BIG_ACTIONS = new Set(["start", "decide", "celebrate"]);

function actionCandidates(d: AngleInput): string[] {
  const all = actionCandidatesRaw(d);
  // Verdict first: no "start"/"decide" on a keep-light day, no "start" on a mixed day unless
  // the Calendar itself says the day favours new starts.
  if (d.tone === "rest") {
    const ok = all.filter((a) => !BIG_ACTIONS.has(a));
    return ok.length ? ok : ["rest", "plan", "tidy"];
  }
  if (d.tone === "mixed" && !d.favours.includes("new_starts")) {
    const ok = all.filter((a) => a !== "start");
    return ok.length ? ok : ["finish", "plan", "fix"];
  }
  return all;
}

function actionCandidatesRaw(d: AngleInput): string[] {
  const base = tithiBase(d.tithi);
  const group = TITHI_MEANING[base]?.group;
  if (d.tara === "Janma") return ["rest", "plan", "tidy"];
  if (base === "Amavasya") return ["rest", "plan", "give"];
  if (base === "Purnima") return ["celebrate", "connect", "give"];
  if (group === "rikta") return ["finish", "fix", "tidy"];
  if (base === "Ekadashi") return ["learn", "plan", "give"];
  if (d.tara === "Vipat" || d.tara === "Pratyak" || d.tara === "Naidhana") return ["finish", "fix", "plan", "tidy"];
  if (d.tara === "Sampat") return ["ask", "decide", "start"];
  if (d.tara === "Mitra" || d.tara === "Parama Mitra") return ["connect", "ask", "celebrate"];
  if (d.tara === "Sadhana") return ["start", "decide", "finish"];
  if (d.tara === "Kshema") return ["fix", "learn", "connect"];
  if (d.favours.includes("new_starts")) return ["start", "decide", "learn"];
  return ["start", "learn", "connect"];
}

function leadOf(d: AngleInput, i: number): DayAngle["lead"] {
  const base = tithiBase(d.tithi);
  const g = TITHI_MEANING[base]?.group;
  if (base === "Purnima" || base === "Amavasya" || base === "Ekadashi" || g === "rikta") return "tithi";
  const cycle: DayAngle["lead"][] = ["star", "tithi", d.tara ? "tara" : "yoga", "yoga", "star", "tara"];
  const pick = cycle[i % cycle.length];
  if (pick === "yoga" && !YOGA_MEANING[d.yoga]) return "tithi";
  if (pick === "tara" && !d.tara) return "yoga";
  return pick;
}

/** Plan angles for consecutive days (index 0 = generation date). */
export function planDayAngles(days: AngleInput[], isChild: boolean, seed = 0): DayAngle[] {
  const pool = isChild ? CHILD_POOL : ADULT_POOL;
  const out: DayAngle[] = [];
  let rot = seed % pool.length;
  const traitOffset = seed % 5;
  days.forEach((d, i) => {
    const recentAreas = out.slice(-3).map((a) => a.area);
    const recentActions = out.slice(-2).map((a) => a.action);
    const fav = d.favours.map((f) => FAVOUR_AREA[f]?.[isChild ? 1 : 0]).filter((x): x is string => Boolean(x));
    const banned = new Set(d.avoid ? AVOID_AREA[d.avoid] ?? [] : []);
    const fits = (a: string) => !banned.has(a) && (d.tone !== "rest" || LIGHT_AREAS.has(a));
    let area = fav.find((a) => !recentAreas.includes(a) && !banned.has(a));
    if (!area) {
      for (let k = 0; k < pool.length; k++) {
        const cand = pool[(rot + k) % pool.length];
        if (!recentAreas.includes(cand) && fits(cand)) {
          area = cand;
          rot = (rot + k + 1) % pool.length;
          break;
        }
      }
    }
    area ??= pool[i % pool.length];
    const acts = actionCandidates(d);
    const action = acts.find((a) => !recentActions.includes(a)) ?? acts[0];
    const opener = OPENERS[(i * 3 + seed) % OPENERS.length];
    const toneKey = d.tone ? (d.tone === "rest" ? "careful" : d.tone) : d.rank >= 1 ? "supportive" : d.rank <= -1 ? "careful" : "mixed";
    const tone = TONES[toneKey][i % 3];
    const prefer = AREA_HORA[area] ?? [];
    const good = d.windows.filter((w) => w.kind === "good");
    // The model's one slot note goes on the verdict's best window, so Today's "best" and the note agree.
    const slot = good.find((w) => w.best)?.id ?? good.find((w) => w.hora && prefer.includes(w.hora))?.id ?? good[i % Math.max(1, good.length)]?.id ?? d.windows[0]?.id ?? "g1";
    out.push({ area, action, opener, tone, lead: leadOf(d, i), trait_ok: i % 5 === traitOffset, slot });
  });
  return out;
}
