import { renderCard } from "@/lib/share/render-card";
import { loadSharedCard } from "@/lib/share/server";
import type { CardSize } from "@/lib/share/card-types";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

function sizeOf(v: string | null): CardSize {
  return v === "og" || v === "story" ? v : "feed";
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const size = sizeOf(new URL(req.url).searchParams.get("size"));
  const card = await loadSharedCard(id.replace(/\.png$/, ""));
  if (!card) {
    return new Response("Card not found", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }
  const png = await renderCard(card, size);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Content is immutable per id; a day at the edge keeps revocation reasonably prompt.
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      "Content-Disposition": `inline; filename="muhurta-${card.type}-${size}.png"`,
    },
  });
}
