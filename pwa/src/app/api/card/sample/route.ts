import { renderCard } from "@/lib/share/render-card";
import { isCardType, sanitizeCardPayload, type CardLocale, type CardSize } from "@/lib/share/card-types";
import { FIXTURES } from "@/lib/share/fixtures";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

/** Static sample cards (fixed demo copy) — used for previews, QA and the plan page. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const type = q.get("type") ?? "today";
  const locale = (["en", "te", "hi"].includes(q.get("locale") ?? "") ? q.get("locale") : "en") as CardLocale;
  const sizeParam = q.get("size");
  const size: CardSize = sizeParam === "og" || sizeParam === "story" ? sizeParam : "feed";
  if (!isCardType(type)) return new Response("Unknown card type", { status: 404 });
  const payload = sanitizeCardPayload({ type, locale, data: FIXTURES[locale][type] });
  if (!payload) return new Response("Bad sample", { status: 500 });
  const png = await renderCard(payload, size);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=604800",
    },
  });
}
