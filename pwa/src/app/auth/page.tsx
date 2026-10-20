"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PrimaryButton } from "@/components/editorial/primary-button";
import { createClient } from "@/lib/supabase/client";
import { pickPhoneFromContacts, supportsContactPicker, supportsWebOtp } from "@/lib/auth/web-otp";
import { useOtpAutofill } from "@/hooks/use-otp-autofill";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

function normalizeOtp(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/today";

  const [phoneInput, setPhoneInput] = useState("");
  const [phoneSent, setPhoneSent] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verifyInFlight = useRef<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const verifyOtp = useCallback(
    async (codeOverride?: string) => {
      if (busy || !phoneSent) return;
      const code = normalizeOtp(codeOverride ?? otp);
      if (code.length !== 6) {
        setError("Enter the 6-digit code from SMS.");
        return;
      }
      if (verifyInFlight.current === code) return;
      verifyInFlight.current = code;

      setBusy(true);
      setError(null);
      const supabase = createClient();
      if (!supabase) {
        setBusy(false);
        verifyInFlight.current = null;
        return;
      }

      const { error: err } = await supabase.auth.verifyOtp({
        phone: phoneSent,
        token: code,
        type: "sms",
      });

      if (err) {
        setBusy(false);
        verifyInFlight.current = null;
        setError(err.message);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setBusy(false);
        verifyInFlight.current = null;
        setError("Signed in but session missing. Try again.");
        return;
      }

      setBusy(false);
      router.refresh();
      const dest = nextPath.startsWith("/") ? nextPath : "/today";
      window.location.assign(dest);
    },
    [busy, phoneSent, otp, router, nextPath],
  );

  useOtpAutofill(step === "otp" && !busy, (code) => {
    setOtp(code);
    void verifyOtp(code);
  });

  useEffect(() => {
    if (step === "otp" && normalizeOtp(otp).length === 6 && !busy) {
      void verifyOtp(otp);
    }
  }, [otp, step, busy, verifyOtp]);

  useEffect(() => {
    if (step === "otp") otpInputRef.current?.focus();
  }, [step]);

  async function sendOtp(resend = false) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Add Supabase keys to .env.local.");
      setBusy(false);
      return;
    }
    const normalized = resend && phoneSent ? phoneSent : normalizePhone(phoneInput);
    if (normalized.length < 12) {
      setError("Enter a valid 10-digit mobile number.");
      setBusy(false);
      return;
    }

    const webHost =
      typeof window !== "undefined" ? window.location.host : undefined;

    const { error: err } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: {
        data: webHost
          ? { web_otp_host: webHost, otp_sms_format: "webotp" as const }
          : undefined,
      },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setPhoneSent(normalized);
    setOtp("");
    verifyInFlight.current = null;
    setStep("otp");
  }

  async function pickPhone() {
    const picked = await pickPhoneFromContacts();
    if (!picked) return;
    setPhoneInput(picked.replace(/^\+91/, "").replace(/\D/g, "").slice(-10));
  }

  function changeNumber() {
    setStep("phone");
    setPhoneSent(null);
    setOtp("");
    setError(null);
    verifyInFlight.current = null;
  }

  const masked =
    phoneSent && phoneSent.length > 6
      ? `${phoneSent.slice(0, 3)}…${phoneSent.slice(-3)}`
      : "";

  const otpHint = supportsWebOtp()
    ? "When SMS arrives, Chrome may offer to fill the code automatically."
    : "Code may autofill from SMS on supported browsers (iOS Safari, Chrome Android).";

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg overflow-x-clip bg-canvas px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
      <Link href="/welcome" className="text-sm text-gold-text">
        ← Back
      </Link>
      <h1 className="mt-6 font-serif text-3xl text-ink">Sign in</h1>
      <p className="mt-2 text-ink-secondary">Phone OTP — same flow as the native app.</p>

      {step === "phone" ? (
        <div className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-ink-secondary">
            Mobile number
            <input
              type="tel"
              autoComplete="tel-national"
              enterKeyHint="done"
              data-testid="auth-phone"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="10-digit mobile"
              className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink outline-none focus:ring-2 focus:ring-gold-text/30"
            />
          </label>
          {supportsContactPicker() ? (
            <button
              type="button"
              className="w-full text-sm font-medium text-gold-text"
              onClick={() => void pickPhone()}
            >
              Choose number from contacts
            </button>
          ) : null}
          <PrimaryButton
            data-testid="auth-send-otp"
            type="button"
            disabled={busy}
            onClick={() => void sendOtp(false)}
            className="w-full"
          >
            {busy ? "Sending…" : "Send code"}
          </PrimaryButton>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ink-secondary">
            Code sent to {masked}.{" "}
            <button
              type="button"
              className="font-medium text-gold-text underline-offset-2 hover:underline"
              onClick={changeNumber}
            >
              Change number
            </button>
          </p>
          <p className="text-xs text-ink-tertiary">{otpHint}</p>
          <label className="block text-sm font-medium text-ink-secondary">
            OTP
            <input
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              name="one-time-code"
              maxLength={6}
              data-testid="auth-otp"
              value={otp}
              onChange={(e) => setOtp(normalizeOtp(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void verifyOtp();
              }}
              className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-mono text-lg tracking-widest text-ink outline-none focus:ring-2 focus:ring-gold-text/30"
            />
          </label>
          <PrimaryButton
            data-testid="auth-verify"
            type="button"
            disabled={busy || normalizeOtp(otp).length !== 6}
            onClick={() => void verifyOtp()}
            className="w-full"
          >
            {busy ? "Verifying…" : "Verify & open Today"}
          </PrimaryButton>
          <button
            type="button"
            disabled={busy}
            className="w-full text-center text-sm text-gold-text disabled:opacity-50"
            onClick={() => void sendOtp(true)}
          >
            Resend code
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-4 text-sm text-warning-ink" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
