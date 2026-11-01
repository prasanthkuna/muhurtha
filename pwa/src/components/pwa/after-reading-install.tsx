"use client";

import { useEffect } from "react";
import { InstallChip } from "@/components/pwa/install-chip";
import { installDismissedRecently, usePwaInstall } from "@/lib/pwa-install";
import { logProduct } from "@/lib/product-events";

const READY_KEY = "muh_reading_ready_v1";

/** On Decode once a reading exists: log the first reading (funnel) and offer install at the payoff moment. */
export function AfterReadingInstall({ userId }: { userId: string | null }) {
  const { ready, standalone, installed } = usePwaInstall();

  useEffect(() => {
    if (!userId) return;
    try {
      const k = `${READY_KEY}_${userId}`;
      if (localStorage.getItem(k)) return;
      localStorage.setItem(k, "1");
      logProduct("reading_ready", {});
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    if (!ready || standalone || installed || installDismissedRecently()) return;
    try {
      if (sessionStorage.getItem("muh_install_view_logged")) return;
      sessionStorage.setItem("muh_install_view_logged", "1");
    } catch {
      return;
    }
    logProduct("install_prompt_view", { surface: "decode" });
  }, [ready, standalone, installed]);

  return (
    <InstallChip
      variant="banner"
      titleKey="install.afterTitle"
      bodyKey="install.afterBody"
      onOpen={() => logProduct("install_accept", { surface: "decode" })}
    />
  );
}
