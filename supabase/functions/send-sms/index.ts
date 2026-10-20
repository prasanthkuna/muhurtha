import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type HookPayload = {
  user: { phone: string; user_metadata?: Record<string, unknown> };
  sms: { otp: string };
};

const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";
const fallbackHash = Deno.env.get("ANDROID_SMS_APP_HASH") ?? "";

function userMeta(user: HookPayload["user"]): Record<string, unknown> {
  return user.user_metadata ?? {};
}

function resolveWebOtpHost(user: HookPayload["user"]): string {
  const meta = userMeta(user);
  const fromMeta = meta.web_otp_host;
  if (typeof fromMeta === "string" && fromMeta.trim().length > 0) {
    return fromMeta.trim();
  }
  const fromEnv = Deno.env.get("WEBOTP_HOSTS")?.split(",")[0]?.trim();
  return fromEnv ?? "";
}

function resolveAppHash(user: HookPayload["user"], webHost: string): string {
  const meta = userMeta(user);
  const fromMeta = meta.android_app_hash;
  if (typeof fromMeta === "string" && fromMeta.trim().length > 0) {
    return fromMeta.trim();
  }
  // Do not apply env fallback hash when this sign-in is for WebOTP (PWA).
  const format = meta.otp_sms_format;
  if (format === "webotp" || webHost.length > 0) {
    return "";
  }
  return fallbackHash.trim();
}

function buildSmsBody(
  otp: string,
  hash: string,
  webHost: string,
  smsFormat: string,
): string {
  const useWeb =
    smsFormat === "webotp" ||
    (webHost.length > 0 && smsFormat !== "retriever" && hash.length === 0);
  if (useWeb && webHost.length > 0) {
    return `Your Muhurtha code is ${otp}\n@${webHost} #${otp}`;
  }
  // Native Android SMS Retriever (Flutter): hash must be last line, <140 bytes.
  if (hash.length > 0) {
    return `<#> Your Muhurtha code is ${otp}\n${hash}`;
  }
  return `Your Muhurtha code is ${otp}`;
}

async function sendTwilioSms(to: string, body: string): Promise<Response> {
  if (!accountSid || !authToken || !fromNumber) {
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: "Twilio env vars missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = btoa(`${accountSid}:${authToken}`);
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });

  const twilioRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: params,
  });

  const json = await twilioRes.json();
  if (!twilioRes.ok) {
    return new Response(
      JSON.stringify({
        error: {
          http_code: twilioRes.status,
          message: `Twilio error: ${json.message ?? twilioRes.statusText}`,
        },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("SEND_SMS_HOOK_SECRET");
  if (!secret) {
    return new Response(
      JSON.stringify({
        error: { http_code: 500, message: "SEND_SMS_HOOK_SECRET is not set." },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(secret.replace(/^v1,whsec_/, ""));

  try {
    const { user, sms } = wh.verify(payload, headers) as HookPayload;
    const webHost = resolveWebOtpHost(user);
    const hash = resolveAppHash(user, webHost);
    const meta = userMeta(user);
    const smsFormat =
      typeof meta.otp_sms_format === "string" ? meta.otp_sms_format : "";
    const otp = sms.otp;
    const body = buildSmsBody(otp, hash, webHost, smsFormat);

    return await sendTwilioSms(user.phone, body);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: `Send SMS hook failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
