"use client";

import { useEffect, useRef } from "react";
import { listenForWebOtp } from "@/lib/auth/web-otp";

/** Start WebOTP listener when on OTP step; calls back with 6-digit code. */
export function useOtpAutofill(
  active: boolean,
  onCode: (code: string) => void,
) {
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  useEffect(() => {
    if (!active) return;
    const ac = new AbortController();
    void (async () => {
      const code = await listenForWebOtp(ac.signal);
      if (code) onCodeRef.current(code);
    })();
    return () => ac.abort();
  }, [active]);
}
