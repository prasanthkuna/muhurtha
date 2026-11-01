import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { APP_MODE_COOKIE, CANONICAL_ORIGIN, isLegacyHost } from "@/lib/site";

const APP_PREFIXES = [
  "/decode",
  "/today",
  "/life",
  "/timing",
  "/ask",
  "/settings",
  "/onboarding",
  "/traditions",
  "/plans",
  "/share",
  "/bond",
  "/calendar",
];

function isAppRoute(pathname: string) {
  return APP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Paths that always forward from an old host, even inside the installed app, so cards
 *  and match links that were already shared keep working on the new address. */
const SHARE_PREFIXES = ["/s/", "/match"];

function hasCodeVerifier(request: NextRequest) {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.endsWith("-code-verifier"));
}

/**
 * Old address → new address. A normal browser visit gets a 308 to the same path on the new
 * host. The installed app (start_url ?src=pwa, shortcuts, push taps, the muh_app cookie, or
 * any same-origin navigation) is left alone: a cross-origin redirect would throw it out of
 * standalone mode into a browser tab. Client-side (RSC) requests and prefetches are never
 * redirected; only top-level document loads are.
 */
function legacyRedirect(request: NextRequest): NextResponse | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const h = request.headers;
  if (h.get("rsc") || h.get("next-router-prefetch") || h.get("next-action")) return null;
  const purpose = `${h.get("sec-purpose") ?? ""} ${h.get("purpose") ?? ""}`;
  if (purpose.includes("prefetch")) return null;
  const dest = h.get("sec-fetch-dest");
  if (dest && dest !== "document") return null;

  const { pathname, search, searchParams } = request.nextUrl;
  if (searchParams.has("_rsc")) return null;
  const target = `${CANONICAL_ORIGIN}${pathname}${search}`;

  if (SHARE_PREFIXES.some((p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p))) {
    return NextResponse.redirect(target, 308);
  }
  if (pathname.startsWith("/auth/callback")) {
    // Sign-in started on the old host (installed app) has its PKCE verifier here: finish here.
    // Otherwise it started on the new host and Supabase sent it back to the old Site URL.
    return hasCodeVerifier(request) ? null : NextResponse.redirect(target, 308);
  }
  if (pathname.startsWith("/auth")) return null;

  if (request.cookies.get(APP_MODE_COOKIE)?.value === "1") return null;
  const src = searchParams.get("src") ?? "";
  if (src === "pwa" || src === "shortcut" || src.startsWith("push")) return null;
  if (h.get("sec-fetch-site") === "same-origin") return null;

  return NextResponse.redirect(target, 308);
}

export async function middleware(request: NextRequest) {
  // OAuth that fell back to the Site URL lands on "/?code=…": finish it on the callback route.
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (!url.searchParams.has("next")) url.searchParams.set("next", "/decode");
    return NextResponse.redirect(url, 307);
  }

  if (isLegacyHost(request.headers.get("host"))) {
    const moved = legacyRedirect(request);
    if (moved) return moved;
  }

  const supabaseResponse = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!isAppRoute(pathname)) return supabaseResponse;

  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (hasAuthCookie) return supabaseResponse;

  const url = request.nextUrl.clone();
  // One sign-in page: the Welcome screen (Google above the fold). /auth stays for email and errors.
  url.pathname = "/welcome";
  const src = url.searchParams.get("src");
  url.search = "";
  url.searchParams.set("next", pathname);
  if (src) url.searchParams.set("src", src);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // /api routes manage their own session (route handler getSession); static assets,
    // the service worker and the offline page never need a session refresh.
    "/((?!api/|_next/static|_next/image|favicon.ico|sw.js|offline.html|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|ico|txt)$).*)",
  ],
};
