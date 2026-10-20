/** Web OTP API + Contact Picker (PWA parity with native SMS autofill). */

export function supportsWebOtp(): boolean {
  return (
    typeof window !== "undefined" &&
    "OTPCredential" in window &&
    typeof navigator.credentials?.get === "function"
  );
}

/** Listen for SMS bound to this origin (@host #code in message). Abort when leaving OTP step. */
export async function listenForWebOtp(signal: AbortSignal): Promise<string | null> {
  if (!supportsWebOtp()) return null;
  try {
    const cred = (await navigator.credentials.get({
      otp: { transport: ["sms"] },
      signal,
    } as CredentialRequestOptions)) as OTPCredential | null;
    const code = cred?.code?.replace(/\D/g, "") ?? "";
    return code.length === 6 ? code : null;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    return null;
  }
}

export function supportsContactPicker(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    typeof (navigator as Navigator & { contacts?: { select: unknown } }).contacts
      ?.select === "function"
  );
}

/** Chrome Android: pick a phone number from the device (no SIM read — user selects). */
export async function pickPhoneFromContacts(): Promise<string | null> {
  if (!supportsContactPicker()) return null;
  try {
    const nav = navigator as Navigator & {
      contacts: {
        select: (props: string[], opts?: { multiple?: boolean }) => Promise<
          { tel?: string[] }[]
        >;
      };
    };
    const picked = await nav.contacts.select(["tel"], { multiple: false });
    const first = picked[0]?.tel?.[0];
    return first?.trim() ?? null;
  } catch {
    return null;
  }
}
