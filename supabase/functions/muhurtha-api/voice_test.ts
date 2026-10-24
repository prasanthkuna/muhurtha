/**
 * Voice lint: static strings (PWA message files + server phrase banks) and sampled
 * model output must follow the v2.3 voice (see voice.ts). Run: deno test -A voice_test.ts
 */
import { assert, assertEquals } from "jsr:@std/assert@1";
import { humanDate, polishVoice, voiceProblems, type VoiceLocale } from "./voice.ts";

const HERE = new URL(".", import.meta.url);
const PWA_LIB = new URL("../../../pwa/src/lib/", HERE);

const PWA_FILES = [
  "messages.ts", "messages-supplement.ts", "messages-billing.ts", "messages-reading.ts",
  "messages-share.ts", "messages-bond.ts", "jyotish-explainers/index.ts", "share/card-types.ts",
];
const SERVER_FILES = ["bond_phrases.ts", "push.ts", "share_copy.ts", "ask_pack.ts", "fallback_pack_copy.ts", "planner.ts", "copy.ts"];

const TE = /[\u0c00-\u0c7f]/;
const HI = /[\u0900-\u097f]/;
const LIT = /"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const BUTTON_KEY = /(cta|button|Button|save|retry|send|submit|run|mark|unlink|refresh|open[A-Z]?\w*|add|delete|cancel|install|upgrade|share|copyLink|download|revoke|detectLocation)$/;
// User-to-partner messages are allowed to be informal (they are written by the user to their partner).
const TE_INFORMAL_OK = /invite\.message/;

type Lit = { file: string; line: number; key: string; text: string; locale: VoiceLocale };

function literals(path: URL, file: string, enBlock?: (line: number) => boolean): Lit[] {
  const src = Deno.readTextFileSync(path);
  const out: Lit[] = [];
  src.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || /^\s*import\b/.test(line)) return;
    for (const m of line.matchAll(LIT)) {
      const text = m[1] ?? m[2] ?? "";
      if (!text || text.length < 3) continue;
      const before = line.slice(0, m.index);
      const key = /([A-Za-z0-9_."-]+)\s*:\s*$/.exec(before)?.[1]?.replace(/"/g, "") ?? "";
      const locale: VoiceLocale | null = TE.test(text) ? "te" : HI.test(text) ? "hi" : (enBlock?.(i + 1) && / /.test(text) ? "en" : null);
      if (!locale) continue;
      out.push({ file, line: i + 1, key, text, locale });
    }
  });
  return out;
}

/** English lives in the `en` block of each PWA message file: from `en` to the next `te`/`hi` block. */
function enRanges(path: URL): (line: number) => boolean {
  const lines = Deno.readTextFileSync(path).split("\n");
  const ranges: [number, number][] = [];
  let start = -1;
  lines.forEach((l, i) => {
    if (/^(?:const|export const) en\b|^\s{0,2}en: \{/.test(l)) start = i + 1;
    else if (start > 0 && /^(?:const|export const) (?:te|hi)\b|^\s{0,2}(?:te|hi): \{/.test(l)) { ranges.push([start, i]); start = -1; }
  });
  if (start > 0) ranges.push([start, lines.length]);
  return (n) => ranges.some(([a, b]) => n >= a && n <= b);
}

function problemsFor(lits: Lit[]): string[] {
  const bad: string[] = [];
  for (const l of lits) {
    if (l.locale === "te" && TE_INFORMAL_OK.test(l.key)) continue;
    const isButton = BUTTON_KEY.test(l.key);
    for (const p of voiceProblems(l.text, l.locale, { isButton })) bad.push(`${l.file}:${l.line} [${l.locale}] ${l.key} ${p} :: ${l.text.slice(0, 80)}`);
  }
  return bad;
}

Deno.test("voice lint: PWA static strings", () => {
  const lits = PWA_FILES.flatMap((f) => {
    const u = new URL(f, PWA_LIB);
    return literals(u, f, enRanges(u));
  });
  assert(lits.length > 1500, `expected the message files to load, got ${lits.length} strings`);
  const bad = problemsFor(lits);
  assertEquals(bad, [], `\n${bad.join("\n")}`);
});

Deno.test("voice lint: server phrase banks (Telugu / Hindi)", () => {
  const lits = SERVER_FILES.flatMap((f) => literals(new URL(f, HERE), f));
  const bad = problemsFor(lits);
  assertEquals(bad, [], `\n${bad.join("\n")}`);
});

Deno.test("human dates replace ISO", () => {
  assertEquals(humanDate("2026-10-24", "en", 2026), "24 Oct");
  assertEquals(humanDate("2027-08-03", "en", 2026), "3 Aug 2027");
  assertEquals(humanDate("2026-11-01", "te", 2026), "1 నవంబర్");
  assertEquals(humanDate("2028-06", "hi", 2026), "जून 2028");
  assertEquals(polishVoice("Ends 2027-01-15 — then Saturn.", "en", 2026), "Ends 15 Jan 2027, then Saturn.");
});

// Real lines sampled from production readings / Ask answers (2026-10-24 audit). After the
// last-mile polish none of them may still trip the lint.
const SAMPLED: [VoiceLocale, string][] = [
  ["en", "Use the cleaner window for one practical step and keep the follow-through steady."],
  ["en", "An auspicious window opens after lunch; harness it for the call you've been avoiding."],
  ["en", "Favourable energies support clear routines — navigate the day gently."],
  ["en", "Your Jupiter-Mercury chapter runs 2026-03-14 to 2028-06-20."],
  ["te", "ఈరోజు మంచి కిటికీ మరియు జాగ్రత్త సమయం చూసుకోండి."],
  ["te", "దయచేసి పెద్ద నిర్ణయాలు ఈ సమయంలో తీసుకోవచ్చు."],
  ["te", "2026-11-02 నుంచి కొత్త దశ మొదలవుతుంది."],
  ["hi", "आज की अच्छी खिड़की में काम शुरू करें।"],
];

Deno.test("voice lint: sampled model output is clean after polish", () => {
  const bad: string[] = [];
  for (const [loc, text] of SAMPLED) {
    const fixed = polishVoice(text, loc, 2026);
    const p = voiceProblems(fixed, loc);
    if (p.length) bad.push(`${loc}: ${p.join(",")} :: ${fixed}`);
  }
  assertEquals(bad, []);
});
