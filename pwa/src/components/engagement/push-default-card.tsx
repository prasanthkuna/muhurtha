"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2 } from "@/components/celestial/muh-icon";
import { useLocale } from "@/context/locale-context";
import { useAppData } from "@/context/app-data-context";
import { enablePush } from "@/lib/web-push";
import { setPushChoice, shouldOfferPush, snoozePushPrompt } from "@/lib/push-default";
import { logProduct } from "@/lib/product-events";

/**
 * Shown once a reading exists (Decode): notifications are on by default, the phone just
 * needs one tap to allow them. Never shown after "turn off", a browser block, or 2 "Not now".
 */
export function PushDefaultCard() {
  const { t, locale } = useLocale();
  const { profileTimezone } = useAppData();
  const [state, setState] = useState<"hidden" | "offer" | "busy" | "on" | "blocked">("hidden");

  useEffect(() => {
    let live = true;
    const id = window.setTimeout(() => {
      void shouldOfferPush().then((ok) => {
        if (live && ok) {
          setState("offer");
          logProduct("push_prompt_view", { surface: "decode" });
        }
      });
    }, 4000);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, []);

  if (state === "hidden") return null;

  async function allow() {
    setState("busy");
    try {
      await enablePush(locale, profileTimezone || "Asia/Kolkata");
      setPushChoice("on");
      logProduct("push_prompt_accept", { surface: "decode" });
      setState("on");
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      logProduct("push_prompt_fail", { surface: "decode", code });
      if (code === "denied") setState("blocked");
      else {
        snoozePushPrompt();
        setState("hidden");
      }
    }
  }

  function later() {
    snoozePushPrompt();
    logProduct("push_prompt_later", { surface: "decode" });
    setState("hidden");
  }

  return (
    <section
      data-testid="push-default-card"
      className="rounded-2xl border border-gold-accent/30 bg-gold-wash/40 px-4 py-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-full bg-paper p-2 text-gold-text">
          <Bell className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {state === "on" ? t("pushDefault.onTitle") : t("pushDefault.title")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
            {state === "on"
              ? t("pushDefault.onBody")
              : state === "blocked"
                ? t("settings.pushBlockedHelp")
                : t("pushDefault.body")}
          </p>
          {state === "offer" || state === "busy" ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={state === "busy"}
                onClick={() => void allow()}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gold-button px-4 text-sm font-semibold text-ink disabled:opacity-60"
                data-testid="push-default-allow"
              >
                {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {t("pushDefault.allow")}
              </button>
              <button
                type="button"
                onClick={later}
                className="min-h-10 px-1 text-sm font-medium text-ink-tertiary underline-offset-2 hover:underline"
              >
                {t("pushDefault.later")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
