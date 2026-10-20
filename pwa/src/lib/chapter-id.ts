/** Stable route id for life chapters (sortOrder + slug). */
export function chapterIdFrom(sortOrder: number, periodLabel: string): string {
  const slug = periodLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${sortOrder}-${slug || "chapter"}`;
}

export function parseChapterId(id: string): { sortOrder: number; slug: string } {
  const dash = id.indexOf("-");
  if (dash < 0) return { sortOrder: -1, slug: id };
  return {
    sortOrder: Number.parseInt(id.slice(0, dash), 10),
    slug: id.slice(dash + 1),
  };
}
