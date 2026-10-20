/**
 * Dev-only: mint a one-time magic link for an existing user (no Google OAuth required).
 * Requires SUPABASE_SERVICE_ROLE_KEY (never commit). Example:
 *   $env:SUPABASE_SERVICE_ROLE_KEY = (supabase projects api-keys --project-ref kdngizqrybkrckvphyin | ...)
 *   bun run scripts/admin-magic-link.ts prasanthkuna@gmail.com
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://kdngizqrybkrckvphyin.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2] ?? "prasanthkuna@gmail.com";
const redirectTo =
  process.env.PWA_AUTH_REDIRECT ??
  "https://pwa-lyart-phi.vercel.app/auth/finish?next=/today";

if (!serviceKey) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY (service_role from Supabase dashboard or CLI).");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: {
    redirectTo,
  },
});

// Some projects ignore options.redirectTo in the returned link; patch if needed.
let link = data.properties?.action_link ?? "";
if (link.includes("redirect_to=http://localhost") && redirectTo.startsWith("https://")) {
  link = link.replace(/redirect_to=[^&]+/, `redirect_to=${encodeURIComponent(redirectTo)}`);
}

if (error || !data.properties?.action_link) {
  console.error(error?.message ?? "No action_link returned");
  process.exit(1);
}

console.log(link || data.properties?.action_link);
