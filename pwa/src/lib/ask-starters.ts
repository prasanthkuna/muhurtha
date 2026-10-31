/** Ask tab helpers: history chips and personal starter prompts (no LLM). */

export type SessionChip = { id: string; title: string; updatedAt: string; count: number };

function normTitle(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
}

/** Group identical questions (latest kept, with a count), newest first. */
export function dedupeSessions(rows: { id: string; title: string; updatedAt: string }[]): SessionChip[] {
  const byKey = new Map<string, SessionChip>();
  const sorted = [...rows].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  for (const r of sorted) {
    const k = normTitle(r.title);
    const hit = byKey.get(k);
    if (hit) hit.count += 1;
    else byKey.set(k, { ...r, count: 1 });
  }
  return [...byKey.values()];
}

/** Clip at a clause or word boundary with an ellipsis (never mid-word). */
export function clipWords(s: string, max = 42): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  // Prefer a whole clause ("Should I switch jobs, or…" → "Should I switch jobs…").
  const clause = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf("; "), cut.lastIndexOf(" – "), cut.lastIndexOf(" — "), cut.lastIndexOf("? "));
  if (clause > max * 0.55) return `${t.slice(0, clause).replace(/[\s,;:.!?–—-]+$/u, "")}…`;
  const at = cut.lastIndexOf(" ");
  const base = (at > max * 0.5 ? cut.slice(0, at) : t.slice(0, max)).replace(/[\s,;:.!?-]+$/u, "");
  return `${base}…`;
}

/** Personal starters first, then the reading's own templates; no near-duplicates. */
export function mergeStarters(personal: string[], templates: string[], limit = 6): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of [...personal, ...templates]) {
    const k = normTitle(s);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

const JARGON = /\b(jupiter|saturn|mars|mercury|venus|rahu|ketu|dasha|antardasha|mahadasha|bhukti|nakshatra|lagna|ascendant)\b|రాహు|కేతు|గురుడు|బృహస్పతి|శని గ్రహ|మహాదశ|అంతర్దశ|बृहस्पति|राहु|केतु|महादशा|अंतर्दशा/i;

/** Starters stay in plain words: no planet names or dasha jargon. */
export function plainStarter(q: string): boolean {
  return !!q.trim() && !JARGON.test(q);
}

type KeyDayLike = { date: string; tone: string; peak: number };

/** The strongest supportive day in the next `span` days after `today` (earliest on ties). */
export function pickKeyDay<T extends KeyDayLike>(days: T[], today: string, span = 10): T | null {
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + span);
  const last = end.toISOString().slice(0, 10);
  const pool = days.filter((d) => d.date > today && d.date <= last && d.tone === "supportive");
  pool.sort((a, b) => b.peak - a.peak || a.date.localeCompare(b.date));
  return pool[0] ?? null;
}
