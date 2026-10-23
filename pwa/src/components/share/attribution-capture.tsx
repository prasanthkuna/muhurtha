"use client";

import { useEffect } from "react";
import { rememberAttribution } from "@/lib/share/attribution";

/** Stores first-touch attribution (src + shared card id) for the post-sign-in referral claim. */
export function AttributionCapture({ src, refId }: { src?: string; refId?: string }) {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    rememberAttribution(src ?? q.get("src"), refId ?? q.get("ref"));
  }, [src, refId]);
  return null;
}
