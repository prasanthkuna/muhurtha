import { NextResponse, type NextRequest } from "next/server";
import { resolveInitialAppPath } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Google OAuth (PKCE ?code=) — exchange on server so verifier cookies from the request are used. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.next();
  }

  const next = url.searchParams.get("next") ?? "/today";
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${url.origin}/auth?error=supabase_config`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const errUrl = new URL("/auth", url.origin);
    errUrl.searchParams.set("error_description", error.message);
    return NextResponse.redirect(errUrl);
  }

  const dest = await resolveInitialAppPath(supabase, next);
  return NextResponse.redirect(`${url.origin}${dest}`);
}
