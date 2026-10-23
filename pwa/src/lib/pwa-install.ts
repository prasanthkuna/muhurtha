"use client";

import { useCallback, useEffect, useState } from "react";

/** Chrome's BeforeInstallPromptEvent (not in lib.dom). */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    __muhBip?: BeforeInstallPromptEvent | null;
    __muhInstalled?: boolean;
  }
}

const DISMISS_KEY = "muh_install_dismissed_at";
const DISMISS_DAYS = 14;

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function installDismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86400_000;
  } catch {
    return false;
  }
}

export function dismissInstall() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * Install state. The `beforeinstallprompt` event is captured by an inline script in the root
 * layout (window.__muhBip) because Chrome can fire it before React hydrates.
 */
export function usePwaInstall() {
  const [standalone, setStandalone] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    setPromptEvent(window.__muhBip ?? null);
    setInstalled(Boolean(window.__muhInstalled));
    setReady(true);
    const onBip = () => setPromptEvent(window.__muhBip ?? null);
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onMode = () => setStandalone(isStandaloneDisplay());
    window.addEventListener("muh-bip", onBip);
    window.addEventListener("appinstalled", onInstalled);
    mq?.addEventListener?.("change", onMode);
    return () => {
      window.removeEventListener("muh-bip", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      mq?.removeEventListener?.("change", onMode);
    };
  }, []);

  /** Must run inside a user gesture. Returns the outcome, or "unavailable" (show manual steps). */
  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const ev = window.__muhBip ?? promptEvent;
    if (!ev) return "unavailable";
    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      window.__muhBip = null;
      setPromptEvent(null);
      if (choice.outcome === "accepted") setInstalled(true);
      return choice.outcome;
    } catch {
      return "unavailable";
    }
  }, [promptEvent]);

  return { ready, standalone, canPrompt: Boolean(promptEvent), installed, promptInstall };
}
