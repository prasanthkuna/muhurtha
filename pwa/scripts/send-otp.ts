/** bun run scripts/send-otp.ts [10-digit-phone] */
import { createClient } from "@supabase/supabase-js";

const phoneArg = process.argv[2] ?? "9008393030";
const phone = phoneArg.startsWith("+") ? phoneArg : `+91${phoneArg.replace(/\D/g, "")}`;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);
const { data, error } = await supabase.auth.signInWithOtp({ phone });
if (error) {
  console.error("OTP send failed:", error.message);
  process.exit(1);
}
console.log("OTP sent to", phone, data);
console.warn(
  "Do not run send-otp again until the user verifies — each send invalidates the previous SMS code.",
);
