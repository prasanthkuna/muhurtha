import { assert, assertEquals } from "jsr:@std/assert@1";
import { buildReadingFacts } from "./engine.ts";
import { HORA_THEME, horaLord, NAK_MEANING, TARA_MEANING, TITHI_MEANING, YOGA_MEANING } from "./meanings.ts";
import { NAKSHATRAS } from "./vimshottari.ts";
import { buildReadingView, buildSystemPrompt, buildUnionSchema, buildUserPrompt, type V2Content, validateContent } from "./reading_v2.ts";
import { planShards, shardMissing, shardOnly } from "./reading_shards.ts";
import { misspelledNames, themeCheck, themeOk } from "./theme_check.ts";
import { engineDayCopy, valueMeaning } from "./engine_copy.ts";

const PROF = {
  id: "p", current_city: "Hyderabad", current_timezone: "Asia/Kolkata", current_lat: 17.385, current_lng: 78.4867,
  display_name: "Test", language_code: "en", explanation_mode: null, onboarding_intent: null,
};
const BI = {
  id: "b", profile_id: "p", date_of_birth: "1993-07-21", exact_birth_time: "12:10:00", time_bucket: null,
  birth_input_mode: "exact_time", janma_nakshatra: "Ashlesha", nakshatra_pada: 4,
  birth_lat: 15.8492886, birth_lng: 80.3546764, birth_timezone: "Asia/Kolkata", birth_place: "Chirala",
};
// deno-lint-ignore no-explicit-any
const facts = (loc: "en" | "te" | "hi" = "en") => buildReadingFacts(PROF as any, BI as any, loc, "2026-11-12", null, { v4: false });

Deno.test("meaning tables cover every star, tithi, yoga, tara and hora in EN/TE/HI", () => {
  for (const n of NAKSHATRAS) {
    const m = NAK_MEANING[n];
    assert(m, `missing star ${n}`);
    assert(/[\u0C00-\u0C7F]/.test(m.meaning.te) && /[\u0900-\u097F]/.test(m.meaning.hi) && m.good_for.en, n);
  }
  assertEquals(Object.keys(YOGA_MEANING).length, 27);
  assertEquals(Object.keys(TITHI_MEANING).length, 16);
  assertEquals(Object.keys(TARA_MEANING).length, 9);
  assertEquals(Object.keys(HORA_THEME).length, 7);
  for (const t of Object.values(TARA_MEANING)) assert(!/hint/i.test(t.en));
});

Deno.test("hora lords follow the Chaldean order from the weekday lord", () => {
  assertEquals(horaLord(0, 360, 1080, 361), "sun");
  assertEquals(horaLord(0, 360, 1080, 361 + 60), "venus");
  assertEquals(horaLord(4, 360, 1080, 400), "jupiter");
});

Deno.test("v3 facts: 45 dated days, no weekday cards, one model slot per day, spread angles", () => {
  const f = facts();
  assertEquals(f.facts_version, 3);
  assertEquals(f.days.length, 45);
  assertEquals(f.weekdays.length, 0);
  for (const d of f.days) {
    assertEquals(d.windows.filter((w) => w.writer === "llm").length, 1, d.date);
    assert(d.angle, d.date);
    assert(d.windows.every((w) => w.hora), "every slot has a hora lord");
  }
  for (let i = 1; i < f.days.length; i++) {
    const a = f.days[i].angle!, prev = f.days.slice(Math.max(0, i - 3), i).map((d) => d.angle!);
    assert(!prev.map((p) => p.area).includes(a.area), `area repeats near ${f.days[i].date}`);
    assertEquals(a.opener === f.days[i - 1].angle!.opener, false);
  }
  const traitDays = f.days.filter((d) => d.angle!.trait_ok).length;
  assert(traitDays <= Math.ceil(45 / 5), `trait days ${traitDays}`);
  const starLeads = f.days.filter((d) => d.angle!.lead === "star").length;
  assert(starLeads <= 45 / 3 + 1, `star leads ${starLeads}`);
  assert(Object.keys(f.meanings!.stars).length >= 20);
});

Deno.test("v3 chapter facts: no natal trait strings, no duplicates, own sub-period theme", () => {
  const f = facts();
  const natal = f.natal as { signals?: string[]; archetype?: Record<string, string> };
  const traits = new Set([...(natal.signals ?? []), ...Object.values(natal.archetype ?? {})].map((x) => String(x).toLowerCase()));
  for (const c of f.chapters) {
    for (const x of [...c.support, ...c.pressure]) assert(!traits.has(x.toLowerCase()), `trait in chapter ${c.chapter_id}: ${x}`);
    assertEquals(new Set(c.support).size, c.support.length);
    assertEquals(new Set(c.pressure).size, c.pressure.length);
    if (c.kind !== "summary") assert(c.ad_theme, `ad theme ${c.chapter_id}`);
  }
});

Deno.test("v3 shards: identical union schema; every day in exactly one part; coverage check", () => {
  const f = facts();
  const plans = planShards(f);
  const all = plans.flatMap((p) => p.scope.days ?? []);
  assertEquals(all.length, 45);
  assertEquals(new Set(all).size, 45);
  assert(plans.some((p) => p.key === "C3"));
  assert(plans.every((p) => !(p.scope.weekdays ?? []).length));
  const s1 = JSON.stringify(buildUnionSchema(f, true));
  assertEquals(JSON.stringify(buildUnionSchema(f, true)), s1);
  const c = plans.find((p) => p.key === "C")!;
  assertEquals(shardMissing(c, { days: [] }).length, c.scope.days!.length);
  const stray = shardOnly(c, { days: [{ date: "1999-01-01" } as never, { date: c.scope.days![0] } as never] });
  assertEquals(stray.days!.length, 1);
});

Deno.test("v3 prompt: angle rules + MEANINGS; no tara_hint, no 'hint' labels", () => {
  const f = facts();
  const sys = buildSystemPrompt(f);
  assert(sys.includes("angle.opener") && sys.includes("trait_ok"));
  const up = buildUserPrompt(f);
  assert(up.startsWith("MEANINGS"));
  assert(!/tara_hint|tithi_hint|\bhint\b/i.test(up));
});

Deno.test("theme checker flags template repetition and misspelled star names", () => {
  assertEquals(misspelledNames("Pushy's Careful Finish").length, 1);
  assertEquals(misspelledNames("Pushya's Careful Finish").length, 0);
  assertEquals(misspelledNames("Haste Makes Waste").length, 0);
  const f = facts();
  const days = f.days.slice(0, 10).map((d) => ({
    date: d.date, title: `${d.nakshatra}'s Plan`, line: "Keep it simple and familiar today.",
    body: `${d.nakshatra} is today's star and its hint says keep things familiar and simple today.`,
    do: ["a", "b"], avoid: ["c", "d"], window_notes: [{ window_id: "g1", label: "x", note: "Use this slot to tidy up." }],
  }));
  const t = themeCheck(days, f);
  assert(t.stats.stock_star_days === 10 && t.stats.hint_days === 10 && t.stats.slot_opener_notes === 10);
  assert(!themeOk(t.stats).ok);
  assert(t.flags.some((x) => x.reason.startsWith("ngram_repeat")));
});

Deno.test("v3 view: engine slot notes for other slots and real engine cards past the written range", () => {
  const f = facts();
  const d0 = f.days[0];
  const slot = d0.windows.find((w) => w.writer === "llm")!;
  const content = {
    profile: { title: "t", summary: "s", strengths: [], watchouts: [], work_style: "", relationship_style: "", share_line: "" },
    areas: [], chapters: [], weekdays: [], weeks: [], months: [], ask_starters: [], remedies: [], push: {} as never,
    days: [{ date: d0.date, title: "A", line: "B", body: "C", do: [], avoid: [], window_notes: [{ window_id: slot.id, label: "Mine", note: "model note" }] }],
  } as unknown as V2Content;
  const engineDay = (date: string) => f.days.find((d) => d.date === date) ?? null;
  const v = buildReadingView(content, f, { dateStr: d0.date, tz: "Asia/Kolkata", locale: "en", daysBefore: 0, daysAfter: 5, engineDay });
  const cards = v.today_cards as Record<string, unknown>[];
  assertEquals(cards.length, 6);
  assertEquals(cards[0].source, "day");
  const goods = cards[0].good_window_notes as { why_it_works: string }[];
  assertEquals(goods.length, d0.windows.filter((w) => w.kind === "good").length);
  assert(goods.some((g) => g.why_it_works === "model note"));
  assert(goods.some((g) => /hour traditionally suits/.test(g.why_it_works)) || goods.length === 1);
  for (const c of cards.slice(1)) assertEquals(c.source, "engine");
  assertEquals(new Set(cards.slice(1).map((c) => c.title)).size, 5);
  assert(!cards.some((c) => c.source === "weekday"));
});

Deno.test("engine copy and Explain meanings are value-specific in every language", () => {
  const te = engineDayCopy({ nakshatra: "Pushya", tithi: "Shukla Panchami", yoga: "Siddhi", tara: "Mitra" }, "te");
  assert(te.title.includes("పుష్యమి") && te.title.includes("పంచమి"));
  assert(valueMeaning("nakshatra", "Pushya", "en").includes("Brihaspati"));
  assert(valueMeaning("nakshatra", "పుష్యమి", "te").includes("బృహస్పతి"));
  assert(valueMeaning("tithi", "Krishna Ekadashi", "hi").includes("एकादशी"));
  assertEquals(valueMeaning("nakshatra", "", "en"), "");
});

Deno.test("v3 validator: only the model's slot needs a note; theme stats reported", () => {
  const f = facts();
  const v = validateContent({ days: [], weekdays: [], chapters: [], weeks: [], months: [], areas: [] } as unknown as V2Content, f);
  assert(v.stats.theme);
  assert(!v.fatal.some((x) => x.startsWith("weekdays")));
});
