// Ashtakoota vs an independent implementation (@prisri/jyotish, fixtures generated once) on
// 40 star pairs, plus symmetry and Kuja dosha rules.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { _YONI_TABLE, ashtakoota, kujaDosha, type MoonStar, pairKuja, rashiOfStar } from "./koota.ts";
import type { GrahaKey, GrahaPos, NatalGrahas } from "./grahas.ts";

type Scores = Record<string, number>;
type Fx = { a: MoonStar; b: MoonStar; ab: Scores; ba: Scores };
const fx = JSON.parse(await Deno.readTextFile(new URL("./koota_fixtures.json", import.meta.url))) as Fx[];
const pts = (m: ReturnType<typeof ashtakoota>, id: string) => m.kootas.find((k) => k.id === id)!.points;

Deno.test("kootas match the reference implementation on 40 pairs", () => {
  for (const f of fx) {
    const m = ashtakoota(f.a, f.b);
    const tag = `${JSON.stringify(f.a)}~${JSON.stringify(f.b)}`;
    for (const id of ["tara", "graha_maitri", "bhakoot", "nadi"]) {
      assertEquals(pts(m, id), f.ab[id], `${id} ${tag}`);
      assertEquals(f.ab[id], f.ba[id], `reference ${id} symmetric ${tag}`);
    }
    for (const id of ["varna", "gana"]) {
      assertEquals(pts(m, id), Math.round(((f.ab[id] + f.ba[id]) / 2) * 10) / 10, `${id} avg ${tag}`);
    }
    const ra = rashiOfStar(f.a), rb = rashiOfStar(f.b);
    if (![8, 9].includes(ra) && ![8, 9].includes(rb)) {
      assertEquals(pts(m, "vashya"), (f.ab.vashya + f.ba.vashya) / 2, `vashya avg ${tag}`);
    }
    if (f.ab.yoni === 4 || f.ab.yoni === 0) assertEquals(pts(m, "yoni"), f.ab.yoni, `yoni ${tag}`);
    assert(m.total >= 0 && m.total <= 36);
  }
});

Deno.test("swapping partners never changes the result", () => {
  for (const f of fx) {
    const x = ashtakoota(f.a, f.b), y = ashtakoota(f.b, f.a);
    assertEquals(x.total, y.total);
    assertEquals(x.kootas.map((k) => k.points), y.kootas.map((k) => k.points));
  }
});

Deno.test("yoni table is symmetric with 4 on the diagonal and 0 for sworn enemies", () => {
  for (let i = 0; i < 14; i++) {
    assertEquals(_YONI_TABLE[i][i], 4);
    for (let j = 0; j < 14; j++) assertEquals(_YONI_TABLE[i][j], _YONI_TABLE[j][i]);
  }
  for (const [p, q] of [[0, 8], [1, 13], [2, 11], [3, 12], [4, 10], [5, 6], [7, 9]]) assertEquals(_YONI_TABLE[p][q], 0);
});

Deno.test("same star, same pada: nadi dosha stays (not cancelled)", () => {
  const m = ashtakoota({ nak: 3, pada: 2 }, { nak: 3, pada: 2 });
  const n = m.kootas.find((k) => k.id === "nadi")!;
  assertEquals(n.points, 0);
  assertEquals(n.dosha_cancelled, false);
});

function natal(signs: Partial<Record<GrahaKey, number>>, lagna: number | null): NatalGrahas {
  const g = {} as Record<GrahaKey, GrahaPos>;
  for (const k of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as GrahaKey[]) {
    const s = signs[k] ?? 0;
    g[k] = { lon: s * 30 + 10, sign: s, deg: 10, retro: false };
  }
  return { at: "", grahas: g, lagna: lagna == null ? null : { lon: lagna * 30 + 5, sign: lagna, deg: 5, retro: false }, exact: lagna != null };
}

Deno.test("kuja dosha: flagged from Lagna, Moon and Venus, with cancellations", () => {
  // Mars in Gemini (2), Lagna Aries (0) -> 3rd: not flagged. Moon Taurus (1) -> 2nd: flagged.
  const a = kujaDosha(natal({ Mars: 2, Venus: 4, Jupiter: 6 }, 0), 1);
  assertEquals(a.from.lagna?.flagged, false);
  assertEquals(a.from.moon?.house, 2);
  assert(a.present);
  // 2nd house in Mithuna is a classical exception; Jupiter in Libra aspects Mars (5th) too.
  assert(a.cancellations.includes("house_sign_exception"));
  assertEquals(a.status, "cancelled");
  // Mars in Cancer (3), Lagna Aries -> 4th, Moon Aries -> 4th, Venus Cancer -> 1st; Jupiter Taurus: no aspect.
  const b = kujaDosha(natal({ Mars: 3, Venus: 3, Jupiter: 1 }, 0), 0);
  assertEquals(b.status, "present");
  assertEquals(b.cancellations.length, 0);
  // Mars exalted in Capricorn.
  const c = kujaDosha(natal({ Mars: 9, Venus: 9, Jupiter: 0 }, 9), 9);
  assert(c.cancellations.includes("mars_exalted"));
  // No exact time: Lagna reference is skipped and the result is approximate.
  const d = kujaDosha(natal({ Mars: 3, Venus: 5, Jupiter: 1 }, null), 3);
  assertEquals(d.from.lagna, null);
  assert(d.approximate);
  assertEquals(pairKuja(b, b).status, "balanced");
  assertEquals(pairKuja(b, c).status, "one_side");
});

Deno.test("kuja flags match the reference on 24 Swiss-Ephemeris charts", async () => {
  const { natalGrahas } = await import("./grahas.ts");
  const g = JSON.parse(await Deno.readTextFile(new URL("./grahas_fixtures.json", import.meta.url))) as { id: string; utc: string; lat: number; lng: number }[];
  const ref = JSON.parse(await Deno.readTextFile(new URL("./kuja_fixtures.json", import.meta.url))) as { id: string; lagna: boolean; moon: boolean; venus: boolean; hasDosha: boolean }[];
  for (const c of g) {
    const n = natalGrahas(new Date(c.utc), c.lat, c.lng, true);
    const k = kujaDosha(n, n.grahas.Moon.sign);
    const r = ref.find((x) => x.id === c.id)!;
    assertEquals([k.from.lagna?.flagged, k.from.moon?.flagged, k.from.venus?.flagged], [r.lagna, r.moon, r.venus], c.id);
    // Reference cancels only own/exalted Mars; ours is a superset of cancellation rules.
    if (!r.hasDosha && k.present) assert(k.cancellations.length > 0, `${c.id} should be cancelled`);
    if (r.hasDosha) assert(k.present, `${c.id} should be present`);
  }
});
