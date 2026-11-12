import { assert, assertEquals } from "jsr:@std/assert@1";
import { liveFacts } from "./engine.ts";
import { syntheticProfiles, evalCases, scriptShare } from "./luna_eval.ts";
import { mergeShards, planShards, previewFrom } from "./reading_shards.ts";
import { normalizePrefs } from "./push.ts";

Deno.test("shards cover every engine id exactly once, A carries Decode + current chapter", () => {
  for (const sp of syntheticProfiles(12)) {
    const f = liveFacts(sp.prof, sp.bi, sp.locale, "2026-11-12", null)!;
    const plans = planShards(f);
    const days = plans.flatMap((p) => p.scope.days ?? []);
    const ch = plans.flatMap((p) => p.scope.chapters ?? []);
    assertEquals(days.sort(), f.days.map((d) => d.date).sort());
    assertEquals(new Set(ch).size, ch.length);
    assertEquals(ch.length, f.chapters.length);
    const a = plans[0];
    assertEquals(a.key, "A");
    assert(a.scope.profile);
    if (f.current_chapter_id != null) assert(a.scope.chapters?.includes(f.current_chapter_id));
    assertEquals(plans.filter((p) => p.scope.extras).length, 1);
    assertEquals(plans.flatMap((p) => p.scope.weekdays ?? []).length, f.weekdays.length);
  }
});

Deno.test("mergeShards keeps profile/push from their shard and sorts days", () => {
  const m = mergeShards([
    { profile: { title: "t", summary: "s", strengths: [], watchouts: [], work_style: "", relationship_style: "", share_line: "" }, days: [{ date: "2026-11-14" } as never] },
    { days: [{ date: "2026-11-12" } as never] },
  ]);
  assertEquals(m.profile.title, "t");
  assertEquals(m.days.map((d) => d.date), ["2026-11-12", "2026-11-14"]);
});

Deno.test("preview from part A", () => {
  const sp = syntheticProfiles(1)[0];
  const f = liveFacts(sp.prof, sp.bi, sp.locale, "2026-11-12", null)!;
  const p = previewFrom(f, {
    profile: { title: "Calm builder", summary: "x", strengths: ["a"], watchouts: [], work_style: "", relationship_style: "", share_line: "" },
    chapters: [{ chapter_id: f.current_chapter_id as number, title: "Ch", highlight: "h", body: "b", share_line: "" }],
    days: [{ date: "2026-11-12", title: "Day", line: "L" } as never],
  });
  assertEquals(p?.chapter?.title, "Ch");
  assertEquals(p?.today?.title, "Day");
});

Deno.test("eval set: 30 profiles, 150 questions, 50 per language", () => {
  const c = evalCases();
  assertEquals(c.length, 150);
  for (const l of ["en", "te", "hi"]) assertEquals(c.filter((x) => x.locale === l).length, 50);
  assert(scriptShare("ఈరోజు మంచి టైమ్", "te") > 0.9);
  assert(scriptShare("Today is good", "hi") < 0.1);
});

Deno.test("push prefs: saved-event reminders default on, explicit mute respected", () => {
  assertEquals(normalizePrefs({}).events, true);
  assertEquals(normalizePrefs({ events: false }).events, false);
});
