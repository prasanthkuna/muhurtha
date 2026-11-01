import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  bondMonthPrepare,
  handleRequest,
  pushBondMoments,
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
import { geminiConfigured, geminiModel, geminiProbe, primaryProvider, readingModel } from "./openai_responses.ts";
import { maxAttempts, openAiAllowed } from "./llm_policy.ts";
import { buildReadingSchema, buildSystemPrompt, buildUserPrompt, type V2Facts } from "./reading_v2.ts";

/** Internal: which LLM is primary and whether Gemini accepts the reading schema (no secrets out). */
async function runLlmProbe(admin: SupabaseClient, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { primary: primaryProvider(), reading_model: readingModel(), gemini_configured: geminiConfigured(), openai_allowed: openAiAllowed(), max_attempts: maxAttempts() };
  if (!geminiConfigured()) return out;
  const model = String(body.model ?? geminiModel());
  if (!body.skip_tiny) out.tiny = await geminiProbe(model, {
    system: "Return JSON.", user: "Say hi.", schemaName: "t",
    schema: { type: "object", properties: { hi: { type: "string" } }, required: ["hi"], additionalProperties: false },
    reasoningEffort: "low", maxOutputTokens: 200,
  }, { noHop: true });
  if (body.list_models) out.models = await geminiProbe(model, { system: "", user: "", schemaName: "__models", schema: {} }, {});
  const readingId = String(body.reading_id ?? "");
  if (!readingId) return out;
  const { data } = await admin.from("readings").select("facts").eq("id", readingId).maybeSingle();
  const facts = (data as { facts: V2Facts } | null)?.facts;
  if (!facts) return { ...out, reading: "facts_missing" };
  const input = { system: buildSystemPrompt(facts), user: buildUserPrompt(facts), schemaName: "r", schema: buildReadingSchema(facts, { withLengths: false }), reasoningEffort: (String(body.effort ?? "low") as "low" | "medium"), maxOutputTokens: 40000 };
  const variants = (body.variants as string[] | undefined) ?? ["base", "noItems", "noDescriptions", "schemaInPrompt"];
  for (const v of variants) {
    out[v] = await geminiProbe(model, input, {
      noItems: v === "noItems" || v === "noItemsNoDesc", noDescriptions: v === "noDescriptions" || v === "noItemsNoDesc",
      schemaInPrompt: v === "schemaInPrompt", noThinking: v === "noThinking",
      keepItems: v === "base", timeoutMs: Number(body.timeout_ms ?? 135_000),
      noHop: true, returnText: Boolean(body.return_text),
    });
  }
  return out;
}
import { dispatchDuePush } from "./push.ts";
import { invitePreview, quickMatch } from "./bond.ts";
import { panchangToday, StarInputError, starTeaser } from "./star_public.ts";
import { ensurePlan, type PlanCode, PRO_PLANS, razorpayConfig } from "./razorpay.ts";
import type { AppLocale } from "./vedic_labels.ts";

const FUNNEL_EVENTS = new Set([
  "welcome_view", "welcome_locale", "teaser_submit", "teaser_result", "signin_click", "onboarding_view",
  "onboarding_submit", "reading_ready", "install_prompt_view", "install_accept", "share_landing_view",
  "share_cta", "share_whatsapp", "match_prefill", "paywall_view", "paywall_cta", "pro_purchased",
  "pro_welcome_view", "pro_welcome_cta", "moved_sheet_view", "moved_sheet_action",
]);

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
      body.action === "reading_migrate_legacy" || body.action === "llm_probe"
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
      if (body.action === "llm_probe") {
        const probe = await runLlmProbe(adminSupabase, body);
        console.log("[llm_probe]", JSON.stringify(probe).slice(0, 3000));
        return new Response(JSON.stringify(probe), { headers: { ...cors, "Content-Type": "application/json" } });
      }
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

    if (body.action === "star_quick_public" || body.action === "panchang_today_public") {
      // Public, zero-LLM birth-star teaser and today's panchang (Welcome + shared-link landing). Nothing stored.
      try {
        const out = body.action === "star_quick_public"
          ? starTeaser(body as Record<string, unknown>)
          : panchangToday(body as Record<string, unknown>);
        return new Response(JSON.stringify(out), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      } catch (e) {
        const msg = e instanceof StarInputError ? e.message : "Could not read that date";
        return new Response(JSON.stringify({ error: msg, error_code: "invalid_input" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    if (body.action === "funnel_event") {
      // Public, best-effort product/funnel event (allowlisted names, primitive props only).
      const name = String(body.name ?? "");
      if (!FUNNEL_EVENTS.has(name)) {
        return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
      const props: Record<string, string | number | boolean> = {};
      const raw = (body.props && typeof body.props === "object") ? body.props as Record<string, unknown> : {};
      for (const [k, v] of Object.entries(raw).slice(0, 12)) {
        if (!/^[a-z_]{1,24}$/.test(k)) continue;
        if (typeof v === "string") props[k] = v.slice(0, 80);
        else if (typeof v === "number" && Number.isFinite(v)) props[k] = v;
        else if (typeof v === "boolean") props[k] = v;
      }
      const anon = typeof body.anon_id === "string" ? body.anon_id.slice(0, 40) : null;
      let profileId: string | null = null;
      const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (bearer && bearer !== (Deno.env.get("SUPABASE_ANON_KEY") ?? "") && bearer.split(".").length === 3) {
        try {
          const { data: u } = await admin.auth.getUser(bearer);
          if (u?.user?.id) {
            const { data: p } = await admin.from("profiles").select("id").eq("user_id", u.user.id).maybeSingle();
            profileId = (p as { id?: string } | null)?.id ?? null;
          }
        } catch { /* anonymous */ }
      }
      await admin.from("app_logs").insert({
        profile_id: profileId, service: "product", level: "info", message: name, context: { ...props, anon_id: anon, funnel: true },
      });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (body.action === "match_quick_public" || body.action === "invite_preview") {
      // Public, zero-LLM: the /match share page and the /join invite preview (no birth data out).
      const result = body.action === "match_quick_public"
        ? quickMatch((body.a ?? {}) as Record<string, unknown>, (body.b ?? {}) as Record<string, unknown>)
        : await invitePreview(createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey), String(body.token ?? ""));
      return new Response(JSON.stringify(result), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (body.action === "bond_month_prepare") {
      const cronSecret = Deno.env.get("PUSH_CRON_SECRET") ?? "";
      const given = req.headers.get("x-push-cron-secret") ?? "";
      if (!(cronSecret && given === cronSecret) && !isServiceRoleRequest(req, serviceKey)) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const adminSupabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
      const result = await bondMonthPrepare(adminSupabase);
      console.log("[bond_month_prepare]", JSON.stringify(result).slice(0, 2000));
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
      const result = await dispatchDuePush(adminSupabase, Date.now(), pushChartMoments, pushBondMoments);
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
