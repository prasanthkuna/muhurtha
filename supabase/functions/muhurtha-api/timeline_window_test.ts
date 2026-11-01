import { assert, assertEquals } from "jsr:@std/assert@1";
import { vimshottariMahadashas, NAKSHATRAS } from "./vimshottari.ts";
import { ageAt, lifeTimelineRows, LATER_MIN_YEARS, MAX_FULL_CHAPTERS, rowTense, SUMMARY_MAX_AGE, YEAR_MS } from "./timeline_window.ts";

const NOW = new Date("2026-11-01T06:30:00Z");
const fmt = (d: Date) => d.toISOString().slice(0, 7);

export function describe(label: string, birth: Date, nk: number, pada: number, frac: number | null = null, print = true) {
  const mds = vimshottariMahadashas(birth, nk, pada, frac);
  const rows = lifeTimelineRows(mds, NOW);
  if (print) {
    console.log(`\n== ${label}: born ${birth.toISOString().slice(0, 10)}, ${NAKSHATRAS[nk]} p${pada}, age ${ageAt(birth, NOW)}`);
    rows.forEach((r, i) =>
      console.log(
        `${String(i).padStart(2)} ${r.kind.padEnd(7)} ${(r.kind === "detail" ? `${r.mdLord}-${r.adLord}` : `${r.mdLords.join("+")}${r.early ? " (early)" : ""}`).padEnd(26)} ${fmt(r.start)}..${fmt(r.end)}  ages ${ageAt(birth, r.start).toFixed(1)}-${ageAt(birth, r.end).toFixed(1)}  ${rowTense(r, NOW)}`,
      )
    );
    const full = rows.filter((r) => r.kind === "detail").length;
    console.log(`   full=${full} summary=${rows.length - full} total=${rows.length}`);
  }
  return { mds, rows };
}

function checkInvariants(birth: Date, rows: ReturnType<typeof lifeTimelineRows>, age: number) {
  assert(rows.length > 0);
  // Contiguous, ordered, no gaps or overlaps.
  assertEquals(rows[0].start.getTime(), birth.getTime(), "covers from birth");
  for (let i = 1; i < rows.length; i++) {
    assert(Math.abs(rows[i].start.getTime() - rows[i - 1].end.getTime()) < 1000, `gap at ${i}`);
  }
  const last = rows[rows.length - 1];
  assert(last.end.getTime() >= birth.getTime() + (SUMMARY_MAX_AGE - LATER_MIN_YEARS) * YEAR_MS - 1000, "covers to age 79-80");
  const full = rows.filter((r) => r.kind === "detail");
  assert(full.length <= MAX_FULL_CHAPTERS, `budget ${full.length}`);
  assertEquals(rows.filter((r) => rowTense(r, NOW) === "current").length, 1, "exactly one current");
  const current = rows.find((r) => rowTense(r, NOW) === "current")!;
  assertEquals(current.kind, "detail", "current is a full chapter");
  if (age >= 12) {
    for (const r of full) assert(ageAt(birth, r.start) >= 11.99, `full row before 12: ${ageAt(birth, r.start)}`);
  }
  assert(rows.filter((r) => r.kind === "summary" && r.early).length <= 1);
  // Free unlock rule picks current + the next row; the next row must be a full chapter.
  const ci = rows.indexOf(current);
  if (rows[ci + 1]) assertEquals(rows[ci + 1].kind, "detail");
}

const CASES: [string, string, number, number][] = [
  ["age 5", "2021-06-15T04:00:00Z", 3, 2],
  ["age 20", "2006-03-10T10:00:00Z", 10, 1],
  ["age 33", "1993-08-20T02:00:00Z", 22, 3],
  ["age 50", "1976-12-05T12:00:00Z", 6, 4],
  ["age 75", "1951-09-01T01:00:00Z", 15, 2],
];

for (const [label, iso, nk, pada] of CASES) {
  Deno.test(`timeline window ${label}`, () => {
    const birth = new Date(iso);
    const { rows } = describe(label, birth, nk, pada);
    checkInvariants(birth, rows, ageAt(birth, NOW));
  });
}

Deno.test("timeline window: every nakshatra x ages 1..85 holds the invariants", () => {
  let maxFull = 0;
  let maxRows = 0;
  for (let nk = 0; nk < 27; nk++) {
    for (const pada of [1, 4]) {
      for (let age = 1; age <= 85; age += 2) {
        const birth = new Date(NOW.getTime() - (age + 0.37) * YEAR_MS);
        const { rows } = describe("", birth, nk, pada, null, false);
        checkInvariants(birth, rows, age);
        maxFull = Math.max(maxFull, rows.filter((r) => r.kind === "detail").length);
        maxRows = Math.max(maxRows, rows.length);
      }
    }
  }
  console.log(`sweep: max full=${maxFull}, max rows=${maxRows}`);
});

Deno.test("timeline window: budget folds oldest past rows into early years", () => {
  const birth = new Date("1993-08-20T02:00:00Z");
  const mds = vimshottariMahadashas(birth, 22, 3);
  const rows = lifeTimelineRows(mds, NOW, { maxFull: 12 });
  checkInvariants(birth, rows, 33);
  assertEquals(rows.filter((r) => r.kind === "detail").length >= 9, true);
  assert(rows[0].kind === "summary" && rows[0].early);
});
