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

/** Clip at a word boundary with an ellipsis (never mid-word). */
export function clipWords(s: string, max = 42): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
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
