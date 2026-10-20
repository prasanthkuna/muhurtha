/**
 * Smoke-check birth pack for the signed-in user (run after verify-otp or with session cookie).
 * Usage: bun run scripts/check-pack-data.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_* in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    console.error("No session — sign in first.");
    process.exit(1);
  }

  const res = await fetch(`${url}/functions/v1/muhurtha-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: key,
    },
    body: JSON.stringify({ action: "birth_pack_get", locale: "en" }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error("API error:", json);
    process.exit(1);
  }

  const content = json.content as Record<string, unknown> | undefined;
  const luck = content?.natal_luck as Record<string, unknown> | undefined;
  console.log("displayName:", json.displayName);
  console.log("status:", json.status);
  console.log(
    "natal_luck:",
    luck
      ? {
          numbers: luck.lucky_numbers ?? luck.luckyNumbers,
          days: luck.lucky_days ?? luck.luckyDays,
          colours: (luck.lucky_colours ?? luck.luckyColours as unknown[])?.length ?? 0,
        }
      : "missing",
  );
  console.log("today_cards:", Array.isArray(content?.today_cards) ? content!.today_cards!.length : 0);
  console.log("journey_phases:", Array.isArray(content?.journey_phases) ? content!.journey_phases!.length : 0);
}

void main();
