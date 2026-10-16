/** Canonical merge for staged birth-pack generation.
 * New LLM entries replace fallback content for the same deterministic key.
 * Other arrays belong to their phase and are replaced, never appended blindly.
 */
const KEYED_ARRAYS: Record<string, string> = {
  journey_phases: "periodLabel",
  journey_phase_facts: "periodLabel",
  today_cards: "key",
  weekly_cards: "key",
  monthly_cards: "key",
};

export function mergePackSections(
  parts: Record<string, unknown>[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const part of parts) {
    for (const [field, incoming] of Object.entries(part)) {
      if (incoming === null || incoming === undefined) continue;
      const previous = out[field];
      if (!Array.isArray(incoming) || !Array.isArray(previous)) {
        out[field] = incoming;
        continue;
      }
      const keyField = KEYED_ARRAYS[field];
      if (!keyField) {
        // These arrays represent complete outputs of a single generation phase.
        out[field] = incoming;
        continue;
      }
      const byKey = new Map<string, Record<string, unknown>>();
      const unkeyed: unknown[] = [];
      for (const value of [...previous, ...incoming]) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          unkeyed.push(value);
          continue;
        }
        const row = value as Record<string, unknown>;
        const key = typeof row[keyField] === "string"
          ? (row[keyField] as string).trim()
          : String(row[keyField] ?? "").trim();
        if (!key) {
          unkeyed.push(value);
          continue;
        }
        const prior = byKey.get(key);
        // Retain deterministic fields missing from LLM output, but prefer the
        // latest LLM prose and share hook for the period/date.
        byKey.set(key, prior ? { ...prior, ...row } : { ...row });
      }
      out[field] = [...byKey.values(), ...unkeyed];
    }
  }
  return out;
}
