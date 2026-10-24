import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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

export async function middleware(request: NextRequest) {
  const supabaseResponse = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!isAppRoute(pathname)) return supabaseResponse;

  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (hasAuthCookie) return supabaseResponse;

  const url = request.nextUrl.clone();
  url.pathname = "/auth";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // /api routes manage their own session (route handler getSession); static assets,
    // the service worker and the offline page never need a session refresh.
    "/((?!api/|_next/static|_next/image|favicon.ico|sw.js|offline.html|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|ico|txt)$).*)",
  ],
};
