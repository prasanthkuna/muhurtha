import { strict as assert } from "node:assert";
import { mergePackSections } from "./birth_pack_merge.ts";

Deno.test("generated life chapters replace fallback by period, not append", () => {
  const fallback = Array.from({ length: 25 }, (_, i) => ({
    periodLabel: `period-${i}`, sortOrder: i, title: "Mercury / Rahu",
    shareHook: "Repeated fallback", mahadashaLord: "Mercury",
  }));
  const generated = fallback.map((phase, i) => ({
    periodLabel: phase.periodLabel, sortOrder: i,
    title: `A distinctive chapter ${i}`,
    shareHook: `A unique story ${i}`,
  }));
  const result = mergePackSections([
    { journey_phases: fallback }, { journey_phases: generated },
  ]);
  const chapters = result.journey_phases as typeof fallback;
  assert.equal(chapters.length, 25);
  assert.equal(chapters[0].title, "A distinctive chapter 0");
  assert.equal(chapters[24].shareHook, "A unique story 24");
  assert.equal(chapters[0].mahadashaLord, "Mercury");
});

Deno.test("generation retries do not duplicate keyed records", () => {
  const initial = { today_cards: [{ key: "2026-10-16", body: "old" }] };
  const partial = { today_cards: [{ key: "2026-10-16", body: "new" },
    { key: "2026-10-17", body: "fresh" }] };
  const result = mergePackSections([initial, partial, partial]);
  const days = result.today_cards as { key: string; body: string }[];
  assert.deepEqual(days.map((day) => day.key), ["2026-10-16", "2026-10-17"]);
  assert.equal(days[0].body, "new");
});

Deno.test("single-phase arrays are replaced, not concatenated", () => {
  const result = mergePackSections([
    { share_cards: [{ title: "fallback" }] },
    { share_cards: [{ title: "new editorial" }] },
  ]);
  assert.deepEqual(result.share_cards, [{ title: "new editorial" }]);
});
