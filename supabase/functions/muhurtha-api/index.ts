import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  bondMonthPrepare,
  askStreamResponse,
  handleRequest,
  pushBondMoments,
  pushBriefLine,
  pushSavedEvents,
  migrateLegacyPacks,
  pushChartMoments,
  startGoldenReading,
  sweepReadings,
  sweepStalledBirthPacks,
  warmBirthPack,
} from "./engine.ts";
import { runWarmup } from "./warmup.ts";
import { lunaProbe, primaryProvider, readingModel } from "./openai_responses.ts";
import { maxAttempts, openAiAllowed } from "./llm_policy.ts";
import { readingEffort } from "./reading_shards.ts";
import { runLunaEval } from "./luna_eval.ts";

/** Internal: Luna key + latency probe (no secrets out; booleans and timings only). */
async function runLlmProbe(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {
    primary: primaryProvider(), reading_model: readingModel(), openai_allowed: openAiAllowed(), max_attempts: maxAttempts(),
    reading_effort: readingEffort(),
  };
  out.none = await lunaProbe("none");
  if (body.low !== false) out.low = await lunaProbe("low");
  return out;
}
import { dispatchDuePush, recordPushClick } from "./push.ts";
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
      body.action === "reading_migrate_legacy" || body.action === "llm_probe" || body.action === "luna_eval"
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
        const probe = await runLlmProbe(body);
        console.log("[llm_probe]", JSON.stringify(probe).slice(0, 3000));
        return new Response(JSON.stringify(probe), { headers: { ...cors, "Content-Type": "application/json" } });
      }
      if (body.action === "luna_eval") {
        // Synthetic profiles only; runs in the background and writes llm_evals.
        const task = runLunaEval(adminSupabase, body)
          .then((r) => console.log("[luna_eval]", JSON.stringify(r)))
          .catch((e) => console.warn("[luna_eval] failed", e instanceof Error ? e.message : e));
        // deno-lint-ignore no-explicit-any
        const rt = (globalThis as any).EdgeRuntime;
        if (rt?.waitUntil) rt.waitUntil(task);
        else await task;
        return new Response(JSON.stringify({ started: true, run_id: body.run_id ?? null }), { headers: { ...cors, "Content-Type": "application/json" } });
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

    if (body.action === "notification_click") {
      // Public, best effort: the service worker reports a notification tap (no personal data).
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
      const ok = await recordPushClick(admin, String(body.sid ?? ""), String(body.nid ?? ""), String(body.click_action ?? "open"));
      return new Response(JSON.stringify({ ok }), { headers: { ...cors, "Content-Type": "application/json" } });
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
      const result = await dispatchDuePush(adminSupabase, Date.now(), pushChartMoments, pushBondMoments, {
        briefLine: pushBriefLine,
        savedEvents: pushSavedEvents,
      });
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
    if (body.action === "ask_stream") {
      // Server-sent events: meta -> delta* -> done (or error).
      return await askStreamResponse(supabase, user, body, loggingSupabase, cors);
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
