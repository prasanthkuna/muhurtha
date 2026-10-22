/** Plain-language labels for engine Panchanga codes (no raw snake_case on screen). */
export function statusLabel(t: (key: string) => string, status: string): string {
  const key = `ui.status_${status}`;
  const label = t(key);
  return label === key ? status.replaceAll("_", " ") : label;
}

/** "Tithi · Lunar day" — keeps the traditional term with a plain explanation. */
export function factorLabel(t: (key: string) => string, name: string | undefined): string {
  if (!name) return "";
  const key = `ui.f_${name.trim().toLowerCase()}`;
  const plain = t(key);
  return plain === key ? name : `${name} · ${plain}`;
}
