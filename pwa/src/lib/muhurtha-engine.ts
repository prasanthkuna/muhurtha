import { normalizePackResponse } from "./birth-pack-views";
import type { BirthPackPayload } from "./types";

export async function invokeEngine(
  accessToken: string | undefined,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured");
  }

  const res = await fetch(`${url}/functions/v1/muhurtha-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken ?? key}`,
      apikey: key,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || data.error) {
    const code = data.error_code?.toString() ?? `http_${res.status}`;
    const err = new Error(data.error?.toString() ?? code) as Error & { code?: string };
    err.code = code;
    throw err;
  }
  return data;
}

export async function fetchBirthPack(
  accessToken: string | undefined,
  locale = "en",
): Promise<BirthPackPayload> {
  const data = await invokeEngine(accessToken, {
    action: "birth_pack_get",
    may_generate: false,
    locale,
  });
  return normalizePackResponse(data);
}

export async function fetchToday(
  accessToken: string | undefined,
  date?: string,
  locale = "en",
) {
  return invokeEngine(accessToken, {
    action: "today_get",
    locale,
    ...(date ? { date } : {}),
  });
}

export async function purposeCheck(
  accessToken: string | undefined,
  purposeType: string,
  targetDate?: string,
) {
  return invokeEngine(accessToken, {
    action: "purpose_check",
    purpose_type: purposeType,
    ...(targetDate ? { target_date: targetDate } : {}),
  });
}

export async function askQuestion(
  accessToken: string | undefined,
  question: string,
  sessionId?: string,
  locale = "en",
) {
  return invokeEngine(accessToken, {
    action: "ask",
    question,
    locale,
    ...(sessionId ? { session_id: sessionId } : {}),
  });
}
