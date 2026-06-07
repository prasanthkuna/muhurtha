/** Best-effort repair for LLM JSON that is fenced, prefixed, or truncated. */
export function extractJsonObjectText(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

export function tryParseRepairedJson(raw: string): unknown | null {
  const candidates = [
    raw.trim(),
    extractJsonObjectText(raw),
  ];

  for (const base of candidates) {
    if (!base) continue;
    const attempts = [base];
    let padded = base;
    for (let i = 0; i < 12; i++) {
      padded = padded.replace(/,\s*$/, "");
      if (!padded.endsWith("}")) padded += "}";
      attempts.push(padded);
    }

    for (const attempt of attempts) {
      try {
        return JSON.parse(attempt);
      } catch {
        // continue
      }
    }
  }
  return null;
}
