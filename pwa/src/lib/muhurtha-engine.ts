import { normalizePackResponse } from "./birth-pack-views";
import type { BirthPackPayload } from "./types";

/** Supabase project region (Mumbai). Override with SUPABASE_FUNCTIONS_REGION if moved. */
const ENGINE_REGION = process.env.SUPABASE_FUNCTIONS_REGION || "ap-south-1";

export async function invokeEngine(
  accessToken: string | undefined,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured");
  }

  const action = String(body.action ?? "");
  // Reads are safe to repeat; anything else is retried only when the platform refused the
  // request before our code ran (Supabase sets sb-error-code, e.g. SERVICE_DEGRADED / BOOT_ERROR).
  const readOnly = /_get$|_status$|^today_get$|^birth_pack_get$/.test(action);
  const delays = [250, 800];
  let res: Response | null = null;
  let data: Record<string, unknown> = {};
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(`${url}/functions/v1/muhurtha-api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken ?? key}`,
          apikey: key,
          // Run the edge function next to the database (ap-south-1 / Mumbai). Without this the
          // function executes near the caller and every PostgREST hop crosses continents.
          "x-region": ENGINE_REGION,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch (e) {
      if (readOnly && attempt < delays.length) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }
      throw e;
    }
    const platformRefused = [502, 503, 504].includes(res.status) && (res.headers.has("sb-error-code") || readOnly);
    if (platformRefused && attempt < delays.length) {
      await res.body?.cancel().catch(() => {});
      await new Promise((r) => setTimeout(r, delays[attempt]));
      continue;
    }
    data = (await res.json().catch(() => ({ error: `http_${res!.status}`, error_code: res!.status >= 500 ? "engine_unavailable" : `http_${res!.status}` }))) as Record<string, unknown>;
    break;
  }
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
