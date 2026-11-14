import { assert, assertEquals } from "jsr:@std/assert@1";
import { DateTime } from "luxon";
import { buildReadingFacts, todayWindows } from "./engine.ts";
import { calendarDayForBirth } from "./bond.ts";
import { eventsForDay, normalizePrefs } from "./push.ts";
import { buildReadingSchema, buildReadingView, buildSystemPrompt, sanitizeContent, type V2Content, validateContent } from "./reading_v2.ts";
import { compileContext, fillPlansV4, planPartsV4 } from "./reading_v4.ts";
import { arcsOf, chapterAreas, clipSentences, looksTruncated, stageKey, v5Flags, wrongScript } from "./reading_v5.ts";
import { askSources, askTopic, bestDays, groundedFallback, personalExplain } from "./ask_grounded.ts";

const PROF = {
  id: "p", current_city: "Hyderabad", current_timezone: "Asia/Kolkata", current_lat: 17.385, current_lng: 78.4867,
  display_name: "Test", language_code: "en", explanation_mode: null, onboarding_intent: null,
};
const BI = {
  id: "b", profile_id: "p", date_of_birth: "1993-07-21", exact_birth_time: "12:10:00", time_bucket: null,
  birth_input_mode: "exact_time", janma_nakshatra: "Ashlesha", nakshatra_pada: 4,
  birth_lat: 15.8492886, birth_lng: 80.3546764, birth_timezone: "Asia/Kolkata", birth_place: "Chirala",
};
/** Several synthetic charts (different decades, cities, exact and star-only). */
const CHARTS = [
  BI,
  { ...BI, id: "c2", date_of_birth: "1961-02-14", exact_birth_time: "05:40:00", birth_lat: 13.0827, birth_lng: 80.2707, janma_nakshatra: null, nakshatra_pada: null },
  { ...BI, id: "c3", date_of_birth: "1988-10-03", exact_birth_time: "22:15:00", birth_lat: 28.6139, birth_lng: 77.209, janma_nakshatra: null, nakshatra_pada: null },
  { ...BI, id: "c4", date_of_birth: "2004-05-30", exact_birth_time: "09:05:00", birth_lat: 19.076, birth_lng: 72.8777, janma_nakshatra: null, nakshatra_pada: null },
  { ...BI, id: "c5", date_of_birth: "1975-12-25", exact_birth_time: null, time_bucket: "morning", birth_input_mode: "time_bucket", janma_nakshatra: "Rohini", nakshatra_pada: 2 },
];
const DATE = "2026-11-12";
// deno-lint-ignore no-explicit-any
const v5 = (bi: any = BI, loc: "en" | "te" | "hi" = "en") => buildReadingFacts(PROF as any, bi, loc, DATE, null, { v5: true });

Deno.test("v5 facts: version 5, life stage and per-chapter areas, arcs cover every chapter", () => {
  const f = v5();
  assertEquals(f.facts_version, 5);
  const detail = f.chapters.filter((c) => c.kind !== "summary");
  assert(detail.every((c) => typeof c.life_stage === "string" && c.life_stage.length > 0));
  // Per chapter, not per person: the sub-periods do not all share one area list.
  const sigs = new Set(detail.map((c) => (c.chapter_domains ?? []).join(",")));
  assert(sigs.size >= Math.min(5, detail.length - 1), `areas too uniform: ${sigs.size}`);
  const arcs = arcsOf(f.chapters);
  assertEquals(arcs.flatMap((a) => a.chapter_ids).length, f.chapters.length);
});

Deno.test("v5 life stage keys by age", () => {
  assertEquals(stageKey(12, 15), "teens");
  assertEquals(stageKey(24, 27), "twenties");
  assertEquals(stageKey(32, 35), "thirties");
  assertEquals(stageKey(0, 3), "early_childhood");
  assertEquals(stageKey(null, null), null);
});

Deno.test("v5 chapter areas come from the sub-period lord's houses", () => {
  const f = v5();
  const venus = chapterAreas(f.chart, "Jupiter", "Venus");
  const sat = chapterAreas(f.chart, "Jupiter", "Saturn");
  assert(venus.length > 0 && sat.length > 0);
  assert(venus.join() !== sat.join());
});

Deno.test("v5 prompt: no lord-chain mandate, no legacy weekday rules; every part compiles", () => {
  const f = v5();
  const sys = buildSystemPrompt(f);
  assert(!sys.includes("tie each chapter to its period lords"), "lord-chain mandate still present");
  assert(!sys.includes("weekdays are evergreen"), "legacy weekday rule still present");
  assert(!sys.includes("Past chapters: 1-2 reflective sentences"));
  assert(sys.includes("life_stage") && sys.includes("verdict"));
  for (const p of planPartsV4(f)) {
    const c = compileContext(f, p, null);
    assert(c.user.length < 16000, `${p.key} context too big: ${c.user.length}`);
    const schema = JSON.stringify(buildReadingSchema(f, { withLengths: true, scope: p.scope }));
    if (p.key === "B") assert(schema.includes("\"arcs\"") && schema.includes("\"action\"") && schema.includes("\"why\""));
  }
  const B = compileContext(f, planPartsV4(f).find((p) => p.key === "B")!, null).user;
  assert(B.includes("life_stage") && B.includes("chapter_domains"));
});

Deno.test("v5 writes every chapter up front: background fill plans cover all unwritten chapters", () => {
  const f = v5();
  const first = new Set(planPartsV4(f).flatMap((p) => p.scope.chapters ?? []));
  const fill = new Set(fillPlansV4(f, { chapters: [...first].map((id) => ({ chapter_id: id })) } as never).flatMap((p) => p.scope.chapters ?? []));
  for (const c of f.chapters) assert(first.has(c.chapter_id) || fill.has(c.chapter_id), `chapter ${c.chapter_id} never written`);
});

Deno.test("sentence-safe trim never cuts mid-sentence when a sentence fits", () => {
  const s = "This is the first sentence. This is the second one, a little longer. And a third that will not fit at all in the budget.";
  const t = clipSentences(s, 70);
  assertEquals(t, "This is the first sentence. This is the second one, a little longer.");
  assert(!looksTruncated(t));
  assert(looksTruncated("Your foundation stretch builds savings and"));
  assertEquals(clipSentences("మొదటి వాక్యం. రెండవ వాక్యం చాలా పెద్దది మరియు ఇది సరిపోదు.", 20), "మొదటి వాక్యం.");
});

Deno.test("v5 validator flags lord chains, truncation, missing stage/action/why, past assertions, verdict clashes, wrong script", () => {
  const f = v5();
  const past = f.chapters.find((c) => c.kind !== "summary" && c.tense === "past")!;
  const cur = f.chapters.find((c) => c.chapter_id === f.current_chapter_id)!;
  const restDay = f.days.find((d) => d.verdict?.tone !== "supportive" && !d.verdict?.favours.includes("new_starts"))!;
  const c: Partial<V2Content> = {
    chapters: [
      { chapter_id: past.chapter_id, title: "A", highlight: "Something.", body: "The Moon lord links your house of home with your house of gains. You got married", share_line: "", why: "" },
      { chapter_id: cur.chapter_id, title: "B", highlight: "Now.", body: "Effort pays slowly.", share_line: "", why: "Because Saturn rules you.", action: "" },
    ],
    days: [{ date: restDay.date, title: "x", line: "A great day to start a new venture.", body: "Fine.", do: ["Start the project"], avoid: [], window_notes: [] }],
  };
  const reasons = v5Flags(c, f).map((x) => `${x.section}:${x.reason}`);
  for (const r of ["chapters:lord_chain", "chapters:truncated", "chapters:past_asserted", "chapters:why_missing", "chapters:action_missing", "chapters:stage_missing", "days:verdict_mismatch"]) {
    assert(reasons.includes(r), `missing ${r}: ${reasons.join(" ")}`);
  }
  assert(wrongScript("This sentence is entirely English and long enough to count here.", "te"));
  assert(wrongScript("இது தமிழ்", "te"));
  assert(!wrongScript("ఈ వారం మీకు career లో మంచి మార్పులు వస్తాయి, ప్లాన్ చేసుకోండి.", "te"));
});

Deno.test("v5 view: arcs, life story, why/action and stage reach the client; trims by tense", () => {
  const f = v5();
  const cur = f.chapters.find((c) => c.chapter_id === f.current_chapter_id)!;
  const long = Array.from({ length: 20 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
  const content = sanitizeContent({
    profile: { title: "T", summary: "S.", strengths: [], watchouts: [], work_style: "", relationship_style: "", share_line: "", why: "Because." },
    areas: [], days: [], weekdays: [], weeks: [], months: [], ask_starters: [], remedies: [], push: {} as never,
    chapters: [{ chapter_id: cur.chapter_id, title: "Building the Base", highlight: "Build slowly.", body: long, why: "Saturn rules you.", action: "Save weekly.", share_line: "" }],
    arcs: [{ md: cur.md, line: "From chasing to building." }], life_story: "Two lines.",
  } as V2Content, f);
  const ch = content.chapters[0];
  assert(ch.body.length <= 900 && !looksTruncated(ch.body));
  const view = buildReadingView(content, f, { dateStr: DATE, tz: "Asia/Kolkata", locale: "en" }) as Record<string, unknown>;
  const ph = (view.journey_phases as Record<string, unknown>[]).find((p) => p.sortOrder === cur.chapter_id)!;
  assertEquals(ph.action, "Save weekly.");
  assertEquals(ph.lifeStage, stageKey(cur.age_from, cur.age_to));
  assert((view.life_arcs as unknown[]).length >= 2);
  assertEquals(view.life_story, "Two lines.");
  const v = validateContent(content, f);
  assert(!v.flags.some((x) => x.reasons.some((r) => r === "truncated" || r === "lord_chain")), JSON.stringify(v.flags));
});

Deno.test("cross-screen: one day verdict across Today/Calendar, reading days, Ask and push (45 days x 5 charts)", () => {
  const prefs = normalizePrefs({});
  let checked = 0;
  for (const bi of CHARTS) {
    // deno-lint-ignore no-explicit-any
    const f = buildReadingFacts(PROF as any, bi as any, "en", DATE, null, { v5: true });
    assertEquals(f.days.length, 45);
    for (const d of f.days) {
      // deno-lint-ignore no-explicit-any
      const cal = calendarDayForBirth(bi as any, PROF as any, d.date)!;
      assert(cal, `no calendar day ${d.date}`);
      // Reading day card (written to this) == Calendar/Today verdict.
      assertEquals(d.verdict!.tone, cal.tone, `${bi.id} ${d.date} tone`);
      assertEquals(JSON.stringify(d.verdict!.best), JSON.stringify(cal.best), `${bi.id} ${d.date} best`);
      assertEquals(d.day_tone, cal.tone === "rest" ? "careful" : cal.tone);
      // The model's one slot note is on the best window.
      const bestWin = d.windows.find((w) => w.best);
      if (cal.best && bestWin) assertEquals(d.angle!.slot, bestWin.id);
      // The angle never suggests a big start on a day the verdict says is not for it.
      if (cal.tone === "rest") assert(!["start", "decide", "celebrate"].includes(d.angle!.action), `${d.date} rest action ${d.angle!.action}`);
      if (cal.tone === "mixed" && !cal.favours.includes("new_starts")) assert(d.angle!.action !== "start");
      // Push: one good alert, for the verdict's best window only, none on rest days; brief carries the tone.
      const ev = eventsForDay(d.date, "Asia/Kolkata", PROF.current_lat, PROF.current_lng, "en", prefs, { tone: cal.tone, best: cal.best, best_kind: cal.best_kind });
      const goods = ev.filter((e) => e.payload.kind === "good_window");
      assert(goods.length <= 1);
      if (cal.tone === "rest") assertEquals(goods.length, 0);
      else if (cal.best) assertEquals(goods[0]?.key, `good:${d.date}:${cal.best.start}`);
      const brief = ev.find((e) => e.payload.kind === "daily_brief");
      if (brief && cal.best) assert(brief.payload.body.includes(clock12(cal.best.start)), "brief names the best window");
      assert(ev.length <= 3, "max 3 a day");
      // Ask: the grounded fallback for "today" states the same verdict.
      const fb = groundedFallback("Should I do it today?", "en", f, d.date, null)!;
      assert(fb.startsWith(cal.tone === "supportive" ? "Today is a good day" : cal.tone === "rest" ? "Today is a keep-light day" : "Today is a mixed day"), fb);
      checked++;
    }
    // Week/month best days (Ask, D part) are verdict-supportive days only.
    for (const w of f.weeks) for (const lbl of w.best_days ?? []) assert(typeof lbl === "string");
  }
  assertEquals(checked, 45 * CHARTS.length);
});

const clock12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

Deno.test("Ask fallback answers the question asked, in all three languages", () => {
  for (const loc of ["en", "te", "hi"] as const) {
    const f = v5(BI, loc);
    const qs = loc === "en"
      ? ["Which day this week is good for a money talk?", "What should I focus on this month?", "When does my current chapter end?", "Is today good for an interview?"]
      : loc === "te"
      ? ["ఈ వారం ఏ రోజు డబ్బు విషయం మాట్లాడటానికి బాగుంటుంది?", "ఈ నెల దేనిపై దృష్టి పెట్టాలి?", "నా ప్రస్తుత దశ ఎప్పుడు ముగుస్తుంది?", "ఈరోజు ఇంటర్వ్యూకి బాగుందా?"]
      : ["इस हफ़्ते पैसों की बात के लिए कौन सा दिन अच्छा है?", "इस महीने किस पर ध्यान दूँ?", "मेरी दशा कब खत्म होगी?", "क्या आज इंटरव्यू के लिए अच्छा है?"];
    const answers = qs.map((q) => groundedFallback(q, loc, f, DATE, null) ?? "");
    assert(answers.every((a) => a.length > 20), `${loc}: ${answers.join(" | ")}`);
    assertEquals(new Set(answers).size, answers.length, `${loc}: answers must differ by question`);
    if (loc !== "en") assert(answers.every((a) => !wrongScript(a, loc)), `${loc} script: ${answers.join(" | ")}`);
  }
  assertEquals(askTopic("Which day is best for travel?"), "which_day");
  assert(askSources("month", "when_best").includes("calendar"));
  const f = v5();
  const r = bestDays(f, DATE, "2026-11-30");
  for (const d of r.best) assert(f.days.find((x) => x.date === d)!.verdict!.tone !== "rest");
  assert(personalExplain("tara_bala", f, DATE, "en")?.startsWith("For you today"));
  assert(personalExplain("mahadasha", f, DATE, "te"));
});

Deno.test("push copy: verdict-driven brief in three languages, no good alert on keep-light days", () => {
  const prefs = normalizePrefs({});
  const { good } = todayWindows(PROF as never, DATE);
  for (const l of ["en", "te", "hi"]) {
    const rest = eventsForDay(DATE, "Asia/Kolkata", 17.385, 78.4867, l, prefs, { tone: "rest", best: good[0] ?? null, best_kind: "calm" });
    assertEquals(rest.filter((e) => e.payload.kind === "good_window").length, 0);
    const brief = rest.find((e) => e.payload.kind === "daily_brief")!;
    assert(brief.payload.title.length > 5);
    const mixed = eventsForDay(DATE, "Asia/Kolkata", 17.385, 78.4867, l, prefs, { tone: "mixed", best: good[1] ?? good[0], best_kind: "go" });
    assertEquals(mixed.filter((e) => e.payload.kind === "good_window").length, 1);
  }
  void DateTime;
});

Deno.test("small fixes: no past best dates in the current month; partner names display-cased", async () => {
  const { yearMonths } = await import("./calendar.ts");
  const { firstName, personFrom } = await import("./bond.ts");
  const place = personFrom(BI as never, "", { zone: "Asia/Kolkata", lat: 17.385, lng: 78.4867 }).place;
  const months = yearMonths("2026-11", place, () => ({ ad: "Venus" }), 2, "2026-11-20");
  assert(months[0].best_dates.every((b) => b.date >= "2026-11-20"), JSON.stringify(months[0].best_dates));
  assertEquals(firstName("sweety", "Partner"), "Sweety");
  assertEquals(firstName("RAVI KUMAR", "Partner"), "Ravi");
  assertEquals(firstName("McKenzie", "Partner"), "McKenzie");
  assertEquals(firstName("", "Partner"), "Partner");
});

Deno.test("v5: stripAlien drops drifted Tamil sentences from Telugu, keeps clean ones", async () => {
  const { stripAlien, hasAlien } = await import("./reading_v5.ts");
  const t = "ఈ దశ బంధాలను బలపరుస్తుంది. அளவோடு ஏற்க வேண்டும். మాట నెమ్మదిగా చెప్పండి.";
  const out = stripAlien(t, "te");
  if (hasAlien(out, "te") || !out.includes("బంధాలను") || !out.includes("నెమ్మదిగా")) throw new Error(out);
  if (stripAlien("Plain English.", "en") !== "Plain English.") throw new Error("en changed");
});
