import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  handleRequest,
  migrateLegacyPacks,
  pushChartMoments,
  startGoldenReading,
  sweepReadings,
  sweepStalledBirthPacks,
  warmBirthPack,
} from "./engine.ts";
import { smokeTestOpenRouterModels } from "./openrouter_model_smoke.ts";
import { smokeTestLowCostModels } from "./low_cost_model_smoke.ts";
import { runWarmup } from "./warmup.ts";
import { dispatchDuePush } from "./push.ts";
import { ensurePlan, type PlanCode, PRO_PLANS, razorpayConfig } from "./razorpay.ts";
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

function isServiceRoleRequest(req: Request, serviceKey: string): boolean {
  if (!serviceKey) return false;
  const apiKey = req.headers.get("apikey") ?? "";
  if (apiKey === serviceKey) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  if (bearer === serviceKey) return true;
  // Platform may rotate stored secrets; accept any service_role JWT for this project.
  try {
    const segment = bearer.split(".")[1];
    if (!segment) return false;
    const payload = JSON.parse(atob(segment.replace(/-/g, "+").replace(/_/g, "/")));
    const projectRef = (Deno.env.get("SUPABASE_URL") ?? "").match(
      /https:\/\/([^.]+)\.supabase\.co/,
    )?.[1];
    return payload?.role === "service_role" &&
      (!projectRef || payload?.ref === projectRef);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (req.method === "GET") {
      const url = new URL(req.url);
      if (url.searchParams.get("warmup") === "1" || url.pathname.endsWith("/warmup")) {
        if (!isServiceRoleRequest(req, serviceKey)) {
          return new Response(JSON.stringify({ error: "forbidden" }), {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        const probeLlm = url.searchParams.get("probe_llm") !== "0";
        const result = await runWarmup({ probeLlm });
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 503,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    if (body.action === "warmup") {
      if (!isServiceRoleRequest(req, serviceKey)) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const result = await runWarmup({
        probeLlm: body.probe_llm !== false,
      });
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (body.action === "birth_pack_warm") {
      if (!isServiceRoleRequest(req, serviceKey)) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const adminSupabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        serviceKey,
      );
      const result = await warmBirthPack(adminSupabase, body);
      return new Response(JSON.stringify(result), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (body.action === "smoke_test_low_cost_models") {
      if (!isServiceRoleRequest(req, serviceKey)) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const result = await smokeTestLowCostModels();
      return new Response(JSON.stringify(result), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (body.action === "smoke_test_openrouter_models") {
      if (!isServiceRoleRequest(req, serviceKey)) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const result = await smokeTestOpenRouterModels(
        undefined,
        null,
        {
          birthPackProbe: body.birth_pack_probe === true,
          models: Array.isArray(body.models)
            ? body.models.filter((m): m is string => typeof m === "string")
            : undefined,
        },
      );
      return new Response(JSON.stringify(result), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (body.action === "pack_sweep") {
      // pg_cron safety net: finish birth packs whose client stopped polling mid-generation.
      const cronSecret = Deno.env.get("PUSH_CRON_SECRET") ?? "";
      const given = req.headers.get("x-push-cron-secret") ?? "";
      if (!(cronSecret && given === cronSecret) && !isServiceRoleRequest(req, serviceKey)) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const adminSupabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
      const result = await sweepStalledBirthPacks(adminSupabase);
      if ((result.considered as number) > 0) console.log("[pack_sweep]", JSON.stringify(result));
      return new Response(JSON.stringify(result), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (
      body.action === "reading_sweep" || body.action === "reading_golden" ||
      body.action === "reading_migrate_legacy"
    ) {
      // Internal reading v2 entry points: pg_cron sweep, OpenAI webhook relay, golden tests
      // and the zero-LLM legacy migration. Shared cron secret or the service role only.
      const cronSecret = Deno.env.get("PUSH_CRON_SECRET") ?? "";
      const given = req.headers.get("x-push-cron-secret") ?? "";
      if (!(cronSecret && given === cronSecret) && !isServiceRoleRequest(req, serviceKey)) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const adminSupabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
      const result = body.action === "reading_sweep"
        ? await sweepReadings(adminSupabase, body)
        : body.action === "reading_golden"
        ? await startGoldenReading(adminSupabase, body)
        : await migrateLegacyPacks(adminSupabase, body);
      if (body.action !== "reading_sweep" || (result.considered as number) > 0) {
        console.log(`[${body.action}]`, JSON.stringify(result).slice(0, 2000));
      }
      return new Response(JSON.stringify(result), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (body.action === "billing_ensure_plans") {
      // Idempotent: find or create the Razorpay plans for the configured key mode (billing_plans).
      const cronSecret = Deno.env.get("PUSH_CRON_SECRET") ?? "";
      const given = req.headers.get("x-push-cron-secret") ?? "";
      if (!(cronSecret && given === cronSecret) && !isServiceRoleRequest(req, serviceKey)) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const cfg = razorpayConfig();
      if (!cfg) {
        return new Response(JSON.stringify({ error: "payments_unavailable" }), {
          status: 503,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const adminSupabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
      const plans: Record<string, string> = {};
      for (const code of Object.keys(PRO_PLANS) as PlanCode[]) {
        plans[code] = await ensurePlan(adminSupabase, cfg, code);
      }
      return new Response(JSON.stringify({ mode: cfg.mode, plans }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (body.action === "push_dispatch") {
      // Called by pg_cron every 5 minutes (shared secret) or manually with the service role.
      const cronSecret = Deno.env.get("PUSH_CRON_SECRET") ?? "";
      const given = req.headers.get("x-push-cron-secret") ?? "";
      if (!(cronSecret && given === cronSecret) && !isServiceRoleRequest(req, serviceKey)) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const adminSupabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
      const result = await dispatchDuePush(adminSupabase, Date.now(), pushChartMoments);
      if (result.considered > 0 || result.suppressed > 0) console.log("[push_dispatch]", JSON.stringify(result));
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
