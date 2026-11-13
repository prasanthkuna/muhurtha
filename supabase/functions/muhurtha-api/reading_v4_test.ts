import { assert, assertEquals } from "jsr:@std/assert@1";
import { buildReadingFacts } from "./engine.ts";
import { buildReadingSchema, buildReadingView, buildSystemPrompt, sanitizeContent, type V2Content, validateContent } from "./reading_v2.ts";
import { planShards } from "./reading_shards.ts";
import { chapterPlanV4, checkClaims, compileContext, fillPlansV4, requiredIdsV4, type V4Plan } from "./reading_v4.ts";
import { moonSiderealLongitudeDeg, nakshatraMetaFromSiderealLon } from "./ephemeris.ts";
import { lagnaSidereal } from "./grahas.ts";

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
const facts = (bi: any = BI, loc: "en" | "te" | "hi" = "en") => buildReadingFacts(PROF as any, bi, loc, "2026-11-12", null, { v4: true });
const tok = (s: string) => Math.ceil(s.length / 4);

Deno.test("v4 facts: evidence pack, story, progressive plan", () => {
  const f = facts();
  assertEquals(f.facts_version, 4);
  assert(f.chart && f.chart.evidence.length > 20, "evidence");
  assertEquals(f.chart!.ref, "lagna");
  assert(f.chart!.evidence.some((e) => e.id.startsWith("md:")) && f.chart!.evidence.some((e) => e.id.startsWith("ad:")));
  assertEquals(f.story!.themes.length, 3);
  assertEquals(new Set(f.story!.themes.map((t) => t.id)).size, 3);
  const plans = planShards(f);
  assertEquals(plans.map((p) => p.key), ["A", "B", "C", "D"]);
  const req = requiredIdsV4(f);
  assertEquals(req.days.length, 7);
  assert(req.chapters.length >= 2 && req.chapters.includes(f.current_chapter_id!));
  assertEquals(fillPlansV4(f, null).map((p) => p.scope.days!.length).reduce((a, b) => a + b, 0), 45);
  const lazy = chapterPlanV4(f, null, f.chapters[2].chapter_id)!;
  assert(lazy.scope.chapters!.includes(f.chapters[2].chapter_id) && lazy.scope.chapters!.length <= 5);
});

Deno.test("v4 compiler: each part gets only its facts, within budget; compact schemas", () => {
  const f = facts();
  const sys = tok(buildSystemPrompt(f));
  const budget: Record<string, number> = { A: 4500, B: 4000, C: 4500, D: 2500 };
  for (const p of planShards(f)) {
    const c = compileContext(f, p as V4Plan);
    const schema = JSON.stringify(buildReadingSchema(f, { withLengths: true, scope: p.scope }));
    const n = tok(c.user);
    assert(n < budget[p.key], `${p.key} context ${n} tokens`);
    if (p.key === "C") assert(!c.user.includes("EVIDENCE"), "days get no chart evidence");
    if (p.key === "A") assert(c.evidenceIds.length >= 8 && !c.user.includes('"days"'));
    if (p.key === "B") assert(!c.user.includes('"meanings"'));
    assertEquals(schema.includes('"push"'), p.key === "D", `${p.key} push only in D`);
    assert(!schema.includes('"days"') || p.key === "C", `${p.key} days only in C`);
    assert(sys + n + tok(schema) < 9000, `${p.key} total`);
  }
});

Deno.test("v4 validator: chart claims need cited evidence", () => {
  const f = facts();
  const ev = f.chart!.evidence;
  const md = ev.find((e) => e.id.startsWith("md:"))!;
  const g = md.grahas[0];
  const ok = checkClaims(`${g} shapes this period.`, [md.id], f);
  assertEquals(ok.unsupported, []);
  assert(ok.claims >= 1);
  const bad = checkClaims("Your exalted Venus in the 7th house gives a Gajakesari yoga.", [], f);
  assert(bad.unsupported.includes("graha:Venus") && bad.unsupported.includes("house:7") && bad.unsupported.includes("yoga:gajakesari") && bad.unsupported.includes("dignity:exalted"), JSON.stringify(bad));
  // Moon-sign talk is natal basics, not a claim; weekday words are not grahas.
  assertEquals(checkClaims("Your Moon sign is Virgo. Plan it for Saturday.", [], f).unsupported, []);
  const noTime = facts({ ...BI, exact_birth_time: null, birth_input_mode: "date_only", time_bucket: "morning" });
  assertEquals(noTime.chart!.ref, "moon");
  assert(checkClaims("Your Lagna is strong.", ["lagna"], noTime).unsupported.includes("lagna:unknown_time"));
});

Deno.test("v4 validate + view: progressive coverage, engine chapter cards, evidence refs", () => {
  const f = facts();
  const req = requiredIdsV4(f);
  const ev = f.chart!.evidence;
  const day = (date: string) => ({ date, title: `T ${date}`, line: "A line that says why.", body: "Some body text long enough to be real and different on every single day " + date, do: ["a"], avoid: ["b"], window_notes: [] });
  const c = {
    profile: { title: "t", summary: "s", strengths: [], watchouts: [], work_style: "", relationship_style: "", share_line: "", evidence_ids: [ev[0].id, "bogus"] },
    areas: f.area_ids.map((a) => ({ area_id: a, headline: "h", summary: "Saturn brings structure here.", evidence_ids: [] })),
    chapters: req.chapters.map((id) => ({ chapter_id: id, title: `Ch ${id}`, highlight: "h", body: "b", share_line: "", evidence_ids: [] })),
    days: req.days.map(day), weekdays: [], weeks: f.weeks.map((w) => ({ period_key: w.period_key, headline: "h", body: "b", caution: "c" })),
    months: f.months.map((m) => ({ period_key: m.period_key, headline: "h", body: "b", caution: "c" })),
    ask_starters: [], remedies: [], push: Object.fromEntries(["today_ready", "good_soon", "good_start", "caution_soon", "caution_start"].map((k) => [k, { title: "x", body: "y" }])),
  } as unknown as V2Content;
  const s = sanitizeContent(c, f);
  assertEquals(s.profile.evidence_ids, [ev[0].id]);
  const v = validateContent(s, f);
  assertEquals(v.fatal, []);
  assert(v.flags.some((x) => x.section === "areas" && x.reasons.some((r) => r.startsWith("unsupported_claim:graha:Saturn"))));
  assert(Number(v.stats.claims) >= 6 && Number(v.stats.unsupported_claims) >= 6);
  const view = buildReadingView(s, f, { dateStr: "2026-11-12", tz: "Asia/Kolkata", locale: "en" }) as Record<string, unknown>;
  const phases = view.journey_phases as { pending?: boolean; sortOrder: number }[];
  assertEquals(phases.length, f.chapters.length);
  assertEquals(phases.filter((p) => !p.pending).length, req.chapters.length);
  const cards = view.today_cards as { key: string; source: string }[];
  assert(cards.filter((x) => x.source === "day").length === 7 && cards.some((x) => x.source === "engine"));
});

/** First date in 1990 with the Moon in Hasta at both 05:30 and 08:30 IST (same dasha), different Lagnas. */
function* hastaPairs() {
  for (let d = 0; d < 365 * 8; d++) {
    const day = new Date(Date.UTC(1986, 0, 1 + d));
    const iso = day.toISOString().slice(0, 10);
    const a = new Date(`${iso}T00:00:00Z`), b = new Date(`${iso}T03:00:00Z`);
    const na = nakshatraMetaFromSiderealLon(moonSiderealLongitudeDeg(a)), nb = nakshatraMetaFromSiderealLon(moonSiderealLongitudeDeg(b));
    if (na.name === "Hasta" && nb.name === "Hasta") {
      const la = Math.floor(lagnaSidereal(a, 17.385, 78.4867) / 30), lb = Math.floor(lagnaSidereal(b, 17.385, 78.4867) / 30);
      if (la !== lb) yield { iso, pa: na.pada, pb: nb.pada };
    }
  }
}

Deno.test("personalization: two Hasta charts in the same dasha, different Lagnas, get different evidence", () => {
  const cur = (f: ReturnType<typeof facts>) => f.chapters.find((c) => c.chapter_id === f.current_chapter_id)!;
  let a: ReturnType<typeof facts> | null = null, b: ReturnType<typeof facts> | null = null;
  for (const { iso, pa, pb } of hastaPairs()) {
    const mk = (t: string, pada: number) => ({ ...BI, id: `h${t}`, date_of_birth: iso, exact_birth_time: t, janma_nakshatra: "Hasta", nakshatra_pada: pada, birth_lat: 17.385, birth_lng: 78.4867 });
    const x = facts(mk("05:30:00", pa)), y = facts(mk("08:30:00", pb));
    if (cur(x).md === cur(y).md && cur(x).ad === cur(y).ad) { a = x; b = y; break; }
  }
  if (!a || !b) throw new Error("no same-dasha Hasta pair");
  assert(a.chart!.ref_sign !== b.chart!.ref_sign, "different Lagna");
  const refs = (f: typeof a) => new Set(f.chart!.evidence.filter((e) => e.kind !== "transit").map((e) => e.ref));
  const ra = refs(a), rb = refs(b);
  const inter = [...ra].filter((x) => rb.has(x)).length;
  const jac = inter / (ra.size + rb.size - inter);
  assert(jac < 0.35, `evidence overlap ${jac.toFixed(2)}`);
  const careerA = a.chart!.areas.career.join(), careerB = b.chart!.areas.career.join();
  const ctxA = compileContext(a, planShards(a)[0] as V4Plan).user, ctxB = compileContext(b, planShards(b)[0] as V4Plan).user;
  assert(ctxA !== ctxB && (careerA !== careerB || a.chart!.ref_sign !== b.chart!.ref_sign));
});
