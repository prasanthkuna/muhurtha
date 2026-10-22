"use client";

import { useEffect } from "react";

/** Registers the service worker on every page (mounted from the root layout). */
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* optional */
    });
  }, []);
  return null;
}
