import { assert, assertEquals } from "jsr:@std/assert@1";
import { aspectedHouses, buildChartPack, dasamsaSign, dignityOf, navamsaSign, signLord, areaEvidence, topEvidence, type ChartInput } from "./jyotisha.ts";
import type { GrahaKey, GrahaPos } from "./grahas.ts";

const at = (lon: number, retro = false): GrahaPos => ({ lon, sign: Math.floor(lon / 30), deg: lon % 30, retro });
function chart(lagnaLon: number | null, p: Partial<Record<GrahaKey, number>>, retro: GrahaKey[] = []): ChartInput {
  const base: Record<GrahaKey, number> = { Sun: 10, Moon: 160, Mars: 200, Mercury: 15, Jupiter: 95, Venus: 340, Saturn: 190, Rahu: 50, Ketu: 230, ...p };
  const g = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, at(v, retro.includes(k as GrahaKey) || k === "Rahu" || k === "Ketu")])) as Record<GrahaKey, GrahaPos>;
  return { grahas: g, lagna: lagnaLon == null ? null : at(lagnaLon), exact: lagnaLon != null };
}

Deno.test("dignity: exaltation, debilitation, moolatrikona, own, friendship", () => {
  assertEquals(dignityOf("Sun", 10), "exalted");
  assertEquals(dignityOf("Sun", 190), "debilitated");
  assertEquals(dignityOf("Sun", 125), "moolatrikona");
  assertEquals(dignityOf("Sun", 145), "own");
  assertEquals(dignityOf("Moon", 31), "exalted");
  assertEquals(dignityOf("Moon", 40), "moolatrikona");
  assertEquals(dignityOf("Mercury", 160), "exalted");
  assertEquals(dignityOf("Mercury", 167), "moolatrikona");
  assertEquals(dignityOf("Mercury", 175), "own");
  assertEquals(dignityOf("Jupiter", 95), "exalted");
  assertEquals(dignityOf("Jupiter", 280), "debilitated");
  assertEquals(dignityOf("Saturn", 190), "exalted");
  assertEquals(dignityOf("Saturn", 305), "moolatrikona");
  assertEquals(dignityOf("Mars", 130), "friendly"); // Mars in Leo (Sun is a friend)
  assertEquals(dignityOf("Mars", 70), "enemy"); // Mars in Gemini (Mercury is an enemy)
  assertEquals(dignityOf("Venus", 100), "enemy"); // Venus in Cancer (Moon is an enemy)
  assertEquals(dignityOf("Saturn", 250), "neutral"); // Saturn in Sagittarius (Jupiter neutral)
});

Deno.test("vargas and aspects", () => {
  assertEquals(navamsaSign(0), 0); // Aries 0° → Aries navamsa
  assertEquals(navamsaSign(35), 10); // Taurus 5° → Aquarius navamsa (fixed signs start from the 9th)
  assertEquals(navamsaSign(62), 6); // Gemini 2° → Libra (dual signs start from the 5th)
  assertEquals(navamsaSign(95), 4); // Cancer 5° → Leo
  assertEquals(dasamsaSign(1), 0); // Aries 1° → Aries
  assertEquals(dasamsaSign(31), 9); // Taurus 1° → Capricorn (9th from Taurus)
  assertEquals(aspectedHouses("Mars", 1), [4, 7, 8]);
  assertEquals(aspectedHouses("Jupiter", 10), [2, 4, 6]);
  assertEquals(aspectedHouses("Saturn", 12), [2, 6, 9]);
  assertEquals(aspectedHouses("Rahu", 1), []);
  assertEquals(signLord(5), "Mercury");
});

Deno.test("chart pack: lordships, yogas, dasha role, transit; Moon fallback without exact time", () => {
  // Taurus Lagna: Saturn rules 9 and 10 → Yogakaraka. Jupiter exalted in Cancer (3rd).
  const c = chart(40, { Saturn: 305 }); // Saturn in Aquarius (10th, moolatrikona) → Sasa yoga
  const pack = buildChartPack(c, { md: "Saturn", ad: "Mercury", transit: chart(null, { Saturn: 340, Jupiter: 70 }).grahas });
  const ids = pack.evidence.map((e) => e.id);
  assertEquals(pack.ref, "lagna");
  assert(ids.includes("y:yogakaraka:saturn"), "yogakaraka");
  assert(ids.includes("y:sasa"), "sasa");
  assert(ids.includes("h10"));
  assert(ids.includes("md:saturn") && ids.includes("ad:mercury") && ids.includes("t:saturn") && ids.includes("md-ad"));
  const md = pack.evidence.find((e) => e.id === "md:saturn")!;
  assert(/rules the 9th and 10th/.test(md.ref), md.ref);
  assert(/trikona lord/.test(md.ref));
  // Gajakesari: Moon in Virgo (160°), Jupiter in Cancer → 11th from Moon: no. Put Jupiter in Sagittarius (4th from Virgo).
  const g = buildChartPack(chart(40, { Jupiter: 250 }));
  assert(g.evidence.some((e) => e.id === "y:gajakesari"));
  // Budha-Aditya: Sun 10°, Mercury 15° (both Aries).
  assert(g.evidence.some((e) => e.id === "y:budha_aditya"));
  // Without exact time: Moon-sign houses, no Lagna-only yogas, no D9.
  const m = buildChartPack(chart(null, { Saturn: 305 }), { md: "Saturn" });
  assertEquals(m.ref, "moon");
  assert(!m.evidence.some((e) => e.id === "y:sasa" || e.id.startsWith("d9:") || e.id.startsWith("y:yogakaraka")));
  assertEquals(m.confidence.d9, false);
  assertEquals(m.confidence.d10, false);
});

Deno.test("chart pack: combustion, retrograde, parivartana, kemadruma, D10 only behind the flag", () => {
  const c = chart(40, { Mercury: 14, Mars: 45, Venus: 5, Moon: 160, Jupiter: 280, Saturn: 70 }, ["Mercury"]);
  const pack = buildChartPack(c);
  const merc = pack.evidence.find((e) => e.id === "p:mercury")!;
  assert(/retrograde/.test(merc.ref) && /combust/.test(merc.ref), merc.ref);
  // Mars in Taurus (Venus's sign), Venus in Aries (Mars's sign) → exchange.
  assert(pack.evidence.some((e) => e.id === "y:parivartana:mars-venus"));
  // Moon in Virgo with nothing in Leo/Virgo/Libra (Sun/nodes excluded) → Kemadruma.
  assert(pack.evidence.some((e) => e.id === "y:kemadruma"));
  assert(!pack.evidence.some((e) => e.id.startsWith("d10:")));
  assert(buildChartPack(c, { d10: true }).evidence.some((e) => e.id === "d10:10lord"));
  assert(!buildChartPack(chart(0.5, {}), { d10: true }).evidence.some((e) => e.id === "d10:10lord"), "boundary lagna blocks D10");
});

Deno.test("area and top evidence are chart-specific", () => {
  const a = buildChartPack(chart(40, {}));
  const b = buildChartPack(chart(130, {})); // Leo Lagna: different lords for every house
  const ca = areaEvidence(a, "career").map((e) => e.ref);
  const cb = areaEvidence(b, "career").map((e) => e.ref);
  assert(ca.join() !== cb.join());
  assert(topEvidence(a).length > 0);
});
