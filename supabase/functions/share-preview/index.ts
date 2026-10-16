import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const shareSiteBase = (Deno.env.get("SHARE_SITE_URL") ?? "https://muhurta-legal.vercel.app")
  .replace(/\/$/, "");
const playStoreUrl = (Deno.env.get("PLAY_STORE_URL") ??
  "https://play.google.com/store/apps/details?id=app.muhurta").trim();

function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extractShareId(req: Request): string | null {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("id")?.trim();
  if (fromQuery) return fromQuery;
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && last !== "share-preview") return last;
  return null;
}

function playUrlWithReferrer(ref: string | null): string {
  if (!ref) return playStoreUrl;
  const referrer = encodeURIComponent(`ref=${ref}`);
  const joiner = playStoreUrl.includes("?") ? "&" : "?";
  return `${playStoreUrl}${joiner}referrer=${referrer}`;
}

function renderHtml(
  shareId: string,
  card: {
  share_title: string;
  share_body: string;
  share_context: string | null;
  language_code: string;
  profile_id: string;
}, ref: string | null): string {
  const title = escapeHtml(card.share_title);
  const body = escapeHtml(card.share_body);
  const context = escapeHtml(card.share_context ?? "");
  const pageTitle = `Muhūrta — ${card.share_title}`;
  const ogDescription = card.share_body.slice(0, 200);
  const ogImage = `${shareSiteBase}/assets/og-share.png`;
  const playHref = escapeHtml(playUrlWithReferrer(ref ?? card.profile_id));
  const checkLabel = card.language_code === "te"
    ? "నీదీ చూడండి"
    : card.language_code === "hi"
    ? "अपना भी देखें"
    : "Check yours";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(card.language_code)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${shareSiteBase}/c/${escapeHtml(shareId)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Instrument+Sans:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/style.css" />
  <style>
    .share-card { margin-top: 1.25rem; padding: 1.5rem; border: 1px solid rgba(230,184,92,.28); border-radius: 16px; background: #171107; }
    .share-eyebrow { color: #8F7D5D; font-size: .85rem; margin: 0 0 .5rem; }
    .share-title { font-family: Fraunces, serif; color: #F5E8C8; font-size: 1.35rem; margin: 0 0 .75rem; line-height: 1.35; }
    .share-body { color: #CDBB94; line-height: 1.55; margin: 0; }
    .cta { display: inline-block; margin-top: 1.25rem; padding: .75rem 1.25rem; border-radius: 999px; background: #E6B85C; color: #080704; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <main class="wrap">
    <p class="brand">Muhūrta</p>
    <p class="tag">First check your past. Then choose the right time.</p>
    <div class="card share-card">
      ${context ? `<p class="share-eyebrow">${context}</p>` : ""}
      <h1 class="share-title">${title}</h1>
      <p class="share-body">${body}</p>
      <a class="cta" href="${playHref}">${checkLabel} — Google Play</a>
    </div>
    <p class="footer" style="margin-top:1.5rem"><a href="${playHref}">Get Muhūrta on Google Play</a></p>
  </main>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const shareId = extractShareId(req);
  if (!shareId) {
    return new Response("Missing share id", { status: 400 });
  }

  if (!supabaseUrl || !serviceKey) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const url = new URL(req.url);
  const ref = url.searchParams.get("ref")?.trim() || null;

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("share_cards")
    .select("share_title, share_body, share_context, language_code, profile_id")
    .eq("id", shareId)
    .maybeSingle();

  if (error || !data) {
    return new Response("Share card not found", { status: 404 });
  }

  const html = renderHtml(shareId, data, ref);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
