"use client";

import { useEffect } from "react";

/** Build id baked into this bundle at build time (next.config env). */
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const CHECK_EVERY_MS = 10 * 60 * 1000;
const MIN_GAP_MS = 60 * 1000;
const RELOAD_KEY = "muh-reloaded-for";

function typing(): boolean {
  const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (tag === "TEXTAREA" || tag === "INPUT") && !!el.value;
}

/** One reload per target (build id or SW swap) per tab session, so a bad deploy can't loop. */
function reloadOnce(target: string): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === target) return false;
    sessionStorage.setItem(RELOAD_KEY, target);
  } catch {
    /* private mode: still reload once for this page life */
  }
  window.location.reload();
  return true;
}

async function updateSw(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg =
      (await navigator.serviceWorker.getRegistration("/")) ||
      (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
    await Promise.race([reg.update(), new Promise((r) => setTimeout(r, 4000))]);
  } catch {
    /* optional */
  }
}

/**
 * Registers the service worker on every page (mounted from the root layout) and keeps
 * installed apps on the latest deploy: on load, focus, return-to-app and every 10 min it
 * compares /api/version with the build id baked into this bundle; when they differ it
 * refreshes the SW and reloads once. A new SW taking control also triggers one reload.
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    let last = 0;
    let busy = false;
    let pendingReload: string | null = null;

    const check = async (force = false) => {
      if (busy || !navigator.onLine) return;
      if (!force && Date.now() - last < MIN_GAP_MS) return;
      last = Date.now();
      busy = true;
      try {
        const res = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const { buildId } = (await res.json()) as { buildId?: string };
        if (!buildId || !BUILD_ID || buildId === BUILD_ID) return;
        await updateSw();
        if (typing()) {
          pendingReload = `build:${buildId}`;
          return;
        }
        reloadOnce(`build:${buildId}`);
      } catch {
        /* offline or flaky network: try again later */
      } finally {
        busy = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (pendingReload && !typing()) {
        reloadOnce(pendingReload);
        return;
      }
      void check();
    };
    const onFocus = () => void check();

    let onControllerChange: (() => void) | null = null;
    if ("serviceWorker" in navigator) {
      // Only reload when an existing worker was replaced (not on the very first install).
      const hadController = !!navigator.serviceWorker.controller;
      onControllerChange = () => {
        if (!hadController) return;
        reloadOnce(`sw:${BUILD_ID}`);
      };
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => reg.update())
        .catch(() => {
          /* optional */
        });
    }

    const first = window.setTimeout(() => void check(true), 3000);
    const timer = window.setInterval(() => void check(true), CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onFocus);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onFocus);
      if (onControllerChange) {
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      }
    };
  }, []);
  return null;
}
