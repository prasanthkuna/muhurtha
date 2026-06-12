import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { handleRequest } from "./engine.ts";
import { smokeTestLocaleLlm } from "./locale_smoke.ts";
import type { AppLocale } from "./vedic_labels.ts";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function createRequestClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
}

function createLoggingClient(authHeader: string): SupabaseClient {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceRoleKey) return createRequestClient(authHeader);
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey,
  );
}

function jwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function isServiceRoleRequest(req: Request, serviceKey: string): boolean {
  if (!serviceKey) return false;
  const apiKey = req.headers.get("apikey") ?? "";
  if (apiKey === serviceKey) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  const token = apiKey || bearer;
  return jwtRole(token) === "service_role";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    if (body.action === "smoke_test_locale_llm") {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (!isServiceRoleRequest(req, serviceKey)) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const locale = (body.locale as AppLocale) ?? "en";
      const skipOpenAi = body.skip_openai === true;
      const loggingSupabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        serviceKey,
      );
      const result = await smokeTestLocaleLlm(
        locale,
        loggingSupabase,
        null,
        { skipOpenAi },
      );
      return new Response(JSON.stringify(result), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createRequestClient(authHeader);
    const loggingSupabase = createLoggingClient(authHeader);
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          error_code: "unauthenticated",
        }),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }
    const result = await handleRequest(supabase, user, body, loggingSupabase);
    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const maybe = e as { code?: string; status?: number } | undefined;
    return new Response(
      JSON.stringify({
        error: msg,
        error_code: maybe?.code ?? "internal_error",
      }),
      {
        status: maybe?.status ?? 500,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }
});
