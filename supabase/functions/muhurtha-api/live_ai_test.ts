import { assertEquals } from "jsr:@std/assert@1";
import { allowedDates, classifyQuestion, followupChips, guardText, JsonFieldStream, sentenceProblem, StreamGuard } from "./live_ai.ts";

Deno.test("classify: sensitive topics win, then intent", () => {
  const cases: [string, string, string | null][] = [
    ["Should I quit my job this month?", "sensitive", "job_quit"],
    ["నేను జాబ్ మానేయాలా?", "sensitive", "job_quit"],
    ["क्या मुझे दवा बंद करनी चाहिए?", "sensitive", "medical"],
    ["Will I get pregnant this year?", "sensitive", "pregnancy"],
    ["Is this a good month to try for a baby?", "sensitive", "pregnancy"],
    ["When should we start a family?", "sensitive", "pregnancy"],
    ["lucky number for lottery", "sensitive", "gambling"],
    ["Should I buy this flat?", "sensitive", "finance"],
    ["What is Rahu Kalam?", "concept", null],
    ["రాహుకాలం అంటే ఏమిటి?", "concept", null],
    ["Best day to start gym?", "when_best", null],
    ["I feel stuck lately", "feelings", null],
  ];
  for (const [q, intent, cat] of cases) {
    const r = classifyQuestion(q);
    if (r.intent !== intent || r.sensitive !== cat) throw new Error(`${q} -> ${JSON.stringify(r)}`);
  }
});

Deno.test("json field stream emits the answer as it grows and exposes the enum prefix", () => {
  const parts: string[] = [];
  const s = new JsonFieldStream("answer", (t) => parts.push(t));
  const full = JSON.stringify({ topic: "work", best_window: "g1", caution_window: "none", suggested_date: "", answer: "Yes, \"go\" now.\nThen rest \u00e9.", action_line: "x", remember: [] });
  for (let i = 0; i < full.length; i += 7) s.push(full.slice(i, i + 7));
  if (parts.join("") !== "Yes, \"go\" now.\nThen rest \u00e9.") throw new Error(JSON.stringify(parts.join("")));
  const pre = s.prefixJson();
  if (pre?.best_window !== "g1" || pre?.topic !== "work") throw new Error(JSON.stringify(pre));
});

Deno.test("guard: withholds invented dates and clock times before display, keeps engine dates", () => {
  const allowed = allowedDates(null, "2026-11-12", ["2026-11-13", "2026-11-19"]);
  const ok = guardText("Thursday 19 Nov looks better. Go for it.", "en", allowed);
  if (ok.hits.length || !ok.text.includes("19 Nov")) throw new Error(JSON.stringify(ok));
  const bad = guardText("Do it on 3 Dec at 10:30 am. Keep it light.", "en", allowed);
  if (!bad.hits.length || bad.text.includes("3 Dec") || bad.text.includes("10:30")) throw new Error(JSON.stringify(bad));
  if (!bad.text.includes("Keep it light.")) throw new Error("dropped a clean sentence");
  const year = guardText("This eases by 2031.", "en", allowed);
  if (!year.hits.length) throw new Error("year not caught");
  const safety = guardText("You should quit your job now. Plan your savings.", "en", allowed, true);
  if (!safety.hits.find((h) => h.kind === "safety") || /quit your job now/.test(safety.text)) throw new Error(JSON.stringify(safety));
});

Deno.test("guard: plain words flush early (first words fast)", () => {
  const out: string[] = [];
  const g = new StreamGuard("en", allowedDates(null, "2026-11-12", []), false, (t) => out.push(t));
  g.push("Yes, this is a good ");
  if (!out.length) throw new Error("no early flush");
  g.push("week for it.");
  g.end();
  if (out.join("") !== "Yes, this is a good week for it.") throw new Error(out.join("|"));
});

Deno.test("chips come from intent + screen (no model call)", () => {
  const c = followupChips("when_best", "life", "te", { suggestedDate: "2026-11-19" });
  if (c.length !== 3 || !c.find((x) => x.kind === "save_event")) throw new Error(JSON.stringify(c));
  const d = followupChips("concept", "decode", "en");
  if (!d.find((x) => /strength/.test(x.label))) throw new Error(JSON.stringify(d));
});

Deno.test("guard: a year before a month is not read as a day (2028 ఆగస్టు)", () => {
  const allowed = { dayMonths: new Set<string>(), months: new Set([8]), years: new Set([2028]) };
  assertEquals(sentenceProblem("ఇది 2028 ఆగస్టు వరకు ఉంటుంది.", allowed, false), null);
  assertEquals(sentenceProblem("It runs until 2028 August.", allowed, false), null);
  assertEquals(sentenceProblem("Try 28 August.", allowed, false), "date");
});

Deno.test("guard: a half-shown sentence is closed, not glued to the withheld line", () => {
  const allowed = { dayMonths: new Set<string>(), months: new Set<number>(), years: new Set<number>() };
  let shown = "";
  const g = new StreamGuard("en", allowed, false, (t) => (shown += t));
  for (const piece of ["This big chapter of yours ", "keeps going until ", "2031 March. Then ease up."]) g.push(piece);
  const final = g.end();
  assertEquals(final, shown.trim());
  assertEquals(/until\s+Check/.test(final), false);
  assertEquals(final.includes("…"), true);
  assertEquals(final.includes("2031"), false);
});

Deno.test("guard: verb look-alikes of months and negated advice are not flagged", () => {
  const allowed = { dayMonths: new Set<string>(), months: new Set([11]), years: new Set([2026]) };
  assertEquals(sentenceProblem("వీలైతే మీటింగ్‌ను ఆదివారానికి మార్చి, ముందుగా రాసుకోండి.", allowed, false), null);
  assertEquals(sentenceProblem("You may feel lighter; march on with the plan.", allowed, false), null);
  assertEquals(sentenceProblem("Try 12 మార్చి instead.", allowed, false), "date");
  assertEquals(sentenceProblem("I can't decide whether you should quit, but Monday looks calmer.", allowed, true), null);
  assertEquals(sentenceProblem("You should quit tomorrow.", allowed, true), "safety");
});
