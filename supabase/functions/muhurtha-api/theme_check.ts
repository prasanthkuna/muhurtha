/**
 * Theme-level repetition checker for the dated day cards: stock star lines, "hint" leakage,
 * slot-note openers, natal-trait density, overused words, repeated 4-grams, title formulas
 * and misspelled star/tithi names. Flags feed the targeted repair; stats feed the eval.
 */
import type { V2DayCopy, V2Facts } from "./reading_v2.ts";
import { NAK_MEANING, TITHI_MEANING, YOGA_MEANING } from "./meanings.ts";

export type ThemeFlag = { id: string; reason: string };
export type ThemeStats = {
  days: number;
  stock_star_days: number;
  hint_days: number;
  slot_opener_notes: number;
  trait_days: number;
  trait_off_days: number;
  overused: Record<string, number>;
  max_ngram_days: number;
  top_ngrams: [string, number][];
  title_formula: number;
  misspelled: string[];
};

type Loc = V2Facts["locale"];
const STOCK_STAR: Record<Loc, RegExp> = {
  en: /\b(is today'?s star|today'?s star is|today’s star)\b/i,
  te: /ఈరోజు\s+(మీ\s+)?నక్షత్రం|నక్షత్రం\s+ఈరోజు|నేటి నక్షత్రం/,
  hi: /आज का नक्षत्र|आज नक्षत्र/,
};
const HINT: Record<Loc, RegExp> = { en: /\bhints?\b/i, te: /హింట్/, hi: /हिंट|संकेत दिन/ };
const SLOT_OPENER: Record<Loc, RegExp> = {
  en: /^(use this|use the|a good slot|good for|this slot|this window|a slot)/i,
  te: /^(ఈ\s+(టైమ్|సమయం|స్లాట్)|ఈ టైమ్‌)/,
  hi: /^(यह समय|इस समय|यह स्लॉट)/,
};
export const OVERUSED: Record<Loc, string[]> = {
  en: ["familiar", "simple", "gentle", "quiet", "steady", "small step", "one thing", "ordinary"],
  te: ["సింపుల్", "ప్రశాంతంగా", "తెలిసిన", "నెమ్మదిగా", "ఒక్క పని"],
  hi: ["सरल", "शांत", "परिचित", "छोटा कदम", "धीरे"],
};
const TRAIT_STOP = new Set(["something", "usable", "things", "person", "people", "practical", "everything", "anything", "though", "through", "piece", "pieces", "every", "their", "being", "makes", "making", "small", "control"]);
const TITLE_ALLOW = new Set(["haste", "hasty", "mulch", "revel", "swat", "magic", "maghi", "rohan", "chips", "ardent", "pushes", "pushed", "pusher", "shiva", "indra", "brahma"]);

const words = (s: string) => (s.toLowerCase().match(/[\p{L}\p{M}']+/gu) ?? []);

function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[m][n];
}
const NAMES = [...new Set([
  ...Object.keys(NAK_MEANING).flatMap((n) => n.split(" ")).filter((w) => !["purva", "uttara"].includes(w.toLowerCase())),
  ...Object.keys(TITHI_MEANING),
  ...Object.keys(YOGA_MEANING),
].map((x) => x.toLowerCase()))];

/** A title word that looks like a star/tithi/yoga name but is spelled wrong ("Pushy's"). */
export function misspelledNames(title: string): string[] {
  const out: string[] = [];
  for (const raw of (title.match(/[A-Za-z]+(?:['’]s)?/g) ?? [])) {
    const w = raw.replace(/['’]s$/, "").toLowerCase();
    if (w.length < 4 || NAMES.includes(w) || TITLE_ALLOW.has(w)) continue;
    if (!/^[A-Z]/.test(raw)) continue;
    const near = NAMES.find((n) => n.slice(0, 2) === w.slice(0, 2) && Math.abs(n.length - w.length) <= 2 && lev(n, w) <= (n.length >= 6 ? 2 : 1));
    if (near) out.push(`${raw}->${near}`);
  }
  return out;
}

function traitStems(facts: V2Facts): string[] {
  const a = (facts.natal as { archetype?: Record<string, string> | null })?.archetype;
  if (!a) return [];
  const src = [a.strength, a.shadow, a.stress_pattern].filter(Boolean).join(" ");
  return [...new Set(words(src).filter((w) => w.length >= 6 && !TRAIT_STOP.has(w)).map((w) => w.slice(0, 6)))];
}

export function themeCheck(days: (V2DayCopy & { date: string })[], facts: V2Facts): { flags: ThemeFlag[]; stats: ThemeStats } {
  const loc = facts.locale;
  const flags: ThemeFlag[] = [];
  const angle = new Map(facts.days.map((d) => [d.date, d.angle]));
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;
  const stems = traitStems(facts);
  let stock = 0, hint = 0, slotOpen = 0, traitDays = 0, traitOff = 0, titleFormula = 0;
  const misspelled: string[] = [];
  const overused: Record<string, number> = {};
  const cap = Math.max(2, Math.ceil(n / 5));
  const gramDays = new Map<string, string[]>();
  const starFirst = new Set(Object.keys(NAK_MEANING).map((k) => k.split(" ")[0].toLowerCase()));
  for (const d of sorted) {
    const text = `${d.title ?? ""} ${d.line ?? ""} ${d.body ?? ""} ${(d.do ?? []).join(" ")} ${(d.avoid ?? []).join(" ")} ${(d.window_notes ?? []).map((x) => x.note).join(" ")}`;
    const low = text.toLowerCase();
    if (STOCK_STAR[loc].test(text)) {
      stock += 1;
      if (stock > 2) flags.push({ id: d.date, reason: "stock_star_line" });
    }
    if (HINT[loc].test(text)) {
      hint += 1;
      flags.push({ id: d.date, reason: "hint_word" });
    }
    for (const note of d.window_notes ?? []) {
      if (SLOT_OPENER[loc].test((note.note ?? "").trim())) {
        slotOpen += 1;
        if (slotOpen > 3) flags.push({ id: d.date, reason: "slot_opener" });
      }
    }
    const tw = words(text);
    const hasTrait = stems.length > 0 && tw.some((w) => stems.some((s) => w.startsWith(s)));
    if (hasTrait) {
      traitDays += 1;
      const a = angle.get(d.date);
      if (a && !a.trait_ok) {
        traitOff += 1;
        flags.push({ id: d.date, reason: "trait_off_day" });
      }
    }
    for (const w of OVERUSED[loc]) {
      if (low.includes(w)) {
        overused[w] = (overused[w] ?? 0) + 1;
        if (overused[w] > cap) flags.push({ id: d.date, reason: `overused:${w}` });
      }
    }
    const bw = words(`${d.line ?? ""} ${d.body ?? ""}`);
    const seen = new Set<string>();
    for (let i = 0; i + 4 <= bw.length; i++) {
      const g = bw.slice(i, i + 4).join(" ");
      if (seen.has(g)) continue;
      seen.add(g);
      const list = gramDays.get(g) ?? [];
      list.push(d.date);
      gramDays.set(g, list);
    }
    const first = (d.title ?? "").split(/\s+/)[0]?.replace(/['’]s$/, "").toLowerCase() ?? "";
    if (/['’]s\s/.test(d.title ?? "") && starFirst.has(first)) {
      titleFormula += 1;
      if (titleFormula > 3) flags.push({ id: d.date, reason: "title_formula" });
    }
    if (loc === "en") {
      const m = misspelledNames(d.title ?? "");
      if (m.length) {
        misspelled.push(...m);
        flags.push({ id: d.date, reason: `star_misspelled:${m[0]}` });
      }
    }
  }
  const grams = [...gramDays.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [g, ds] of grams) {
    if (ds.length <= 3) break;
    for (const id of ds.slice(3)) flags.push({ id, reason: `ngram_repeat:"${g}"` });
  }
  return {
    flags,
    stats: {
      days: n,
      stock_star_days: stock,
      hint_days: hint,
      slot_opener_notes: slotOpen,
      trait_days: traitDays,
      trait_off_days: traitOff,
      overused,
      max_ngram_days: grams[0]?.[1].length ?? 0,
      top_ngrams: grams.slice(0, 5).map(([g, ds]) => [g, ds.length]),
      title_formula: titleFormula,
      misspelled,
    },
  };
}

/** Eval thresholds for the theme stats. */
export function themeOk(s: ThemeStats): { ok: boolean; fails: string[] } {
  const fails: string[] = [];
  const maxOver = Math.max(0, ...Object.values(s.overused));
  if (s.stock_star_days > 2) fails.push(`stock_star_days=${s.stock_star_days}`);
  if (s.hint_days > 0) fails.push(`hint_days=${s.hint_days}`);
  if (s.slot_opener_notes > 3) fails.push(`slot_opener_notes=${s.slot_opener_notes}`);
  if (s.trait_days > Math.ceil(s.days / 5) + 1) fails.push(`trait_days=${s.trait_days}`);
  if (s.max_ngram_days > 4) fails.push(`max_ngram_days=${s.max_ngram_days}`);
  if (maxOver > Math.ceil(s.days / 4)) fails.push(`overused=${maxOver}`);
  if (s.title_formula > 3) fails.push(`title_formula=${s.title_formula}`);
  if (s.misspelled.length) fails.push(`misspelled=${s.misspelled.length}`);
  return { ok: fails.length === 0, fails };
}

/** What the rest of the reading already says: handed to the repair call so it does not echo it. */
export function alreadySaid(days: (V2DayCopy & { date: string })[], skip: Set<string>, stats: ThemeStats): string[] {
  const kept = days.filter((d) => !skip.has(d.date));
  const openers = kept.map((d) => words(d.body ?? "").slice(0, 3).join(" ")).filter(Boolean);
  const titles = kept.map((d) => d.title).filter(Boolean);
  return [
    `titles already used: ${titles.slice(0, 45).join(" | ")}`,
    `body openings already used: ${[...new Set(openers)].slice(0, 30).join(" | ")}`,
    `phrases already overused: ${stats.top_ngrams.filter(([, c]) => c > 2).map(([g]) => `"${g}"`).join(", ") || "none"}`,
    `words at their limit: ${Object.entries(stats.overused).filter(([, c]) => c >= Math.ceil(stats.days / 5)).map(([w]) => w).join(", ") || "none"}`,
  ];
}
