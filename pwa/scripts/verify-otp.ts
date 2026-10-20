/** bun run scripts/verify-otp.ts <6-digit-otp> [phone] */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

const token = process.argv[2];
const phoneArg = process.argv[3] ?? "9008393030";
if (!token) {
  console.error("Usage: bun run scripts/verify-otp.ts <otp> [phone]");
  process.exit(1);
}

const phone = phoneArg.startsWith("+") ? phoneArg : `+91${phoneArg.replace(/\D/g, "")}`;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

const { data, error } = await supabase.auth.verifyOtp({
  phone,
  token,
  type: "sms",
});

if (error) {
  console.error("Verify failed:", error.message);
  process.exit(1);
}

console.log("Signed in as", data.user?.id);
const access = data.session?.access_token;
if (!access) process.exit(1);

const packRes = await fetch(`${url}/functions/v1/muhurtha-api`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${access}`,
    apikey: key,
  },
  body: JSON.stringify({ action: "birth_pack_get", locale: "en" }),
});
const pack = await packRes.json();
if (!packRes.ok) {
  console.error("birth_pack_get failed:", pack);
  process.exit(1);
}
console.log("Pack OK:", pack.displayName, pack.status, "screens", pack.screensReady);

const ref = new URL(url).hostname.split(".")[0];
const cookieName = `sb-${ref}-auth-token`;
const sessionPayload = JSON.stringify({
  access_token: data.session!.access_token,
  refresh_token: data.session!.refresh_token,
  expires_at: data.session!.expires_at,
  expires_in: data.session!.expires_in,
  token_type: "bearer",
  user: data.user,
});

const authDir = join(import.meta.dir, "..", "e2e", ".auth");
mkdirSync(authDir, { recursive: true });
const storagePath = join(authDir, "user.json");
writeFileSync(
  storagePath,
  JSON.stringify({
    cookies: [
      {
        name: cookieName,
        value: encodeURIComponent(sessionPayload),
        domain: "localhost",
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ],
    origins: [],
  }),
);
console.log("Wrote Playwright storage:", storagePath);
