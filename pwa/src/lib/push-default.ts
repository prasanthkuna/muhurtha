/**
 * Notifications are ON by default. The phone still has to allow them (Android/iOS only show
 * the permission prompt from a tap), so "default on" means:
 *  - permission already granted and the user never turned alerts off → subscribe silently;
 *  - permission not asked yet → one in-app card after the first reading ("Allow"), at most
 *    twice, at least 3 days apart, never again once declined in the browser or turned off;
 *  - the user's explicit "turn off" in Settings is remembered and always wins.
 */
import { currentSubscription, enablePush, permissionState, pushSupported } from "@/lib/web-push";

const CHOICE_KEY = "muh_push_choice_v1"; // "on" | "off" (explicit user choice)
const PROMPT_KEY = "muh_push_prompt_v1"; // { n: dismissals, at: last dismissal ms }
const MAX_DISMISSALS = 2;
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

export type PushChoice = "on" | "off" | null;

export function pushChoice(): PushChoice {
  try {
    const v = localStorage.getItem(CHOICE_KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

export function setPushChoice(choice: "on" | "off") {
  try {
    localStorage.setItem(CHOICE_KEY, choice);
  } catch {
    /* ignore */
  }
}

/** True when the user has not turned notifications off: the default. */
export function pushWantedByDefault(): boolean {
  return pushChoice() !== "off";
}

function promptState(): { n: number; at: number } {
  try {
    const raw = JSON.parse(localStorage.getItem(PROMPT_KEY) ?? "null") as { n?: number; at?: number } | null;
    return { n: Number(raw?.n ?? 0), at: Number(raw?.at ?? 0) };
  } catch {
    return { n: 0, at: 0 };
  }
}

export function snoozePushPrompt() {
  const s = promptState();
  try {
    localStorage.setItem(PROMPT_KEY, JSON.stringify({ n: s.n + 1, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

/** Should the one-tap "Allow notifications" card show now? */
export async function shouldOfferPush(): Promise<boolean> {
  if (!pushSupported() || !pushWantedByDefault()) return false;
  const perm = permissionState();
  if (perm === "denied" || perm === "unsupported") return false;
  if (perm === "granted" && (await currentSubscription().catch(() => null))) return false;
  // Granted but not subscribed means the silent auto-subscribe failed: the card's button
  // retries without any browser prompt (same snooze limits).
  const s = promptState();
  if (s.n >= MAX_DISMISSALS) return false;
  if (s.n > 0 && Date.now() - s.at < SNOOZE_MS) return false;
  return true;
}

let autoTried = false;

/** Permission already granted, no subscription, never turned off: subscribe without asking. */
export async function autoEnablePush(locale: string, timezone: string): Promise<boolean> {
  if (autoTried) return false;
  autoTried = true;
  if (!pushSupported() || permissionState() !== "granted" || !pushWantedByDefault()) return false;
  if (await currentSubscription().catch(() => null)) return false;
  try {
    await enablePush(locale, timezone);
    return true;
  } catch {
    return false;
  }
}
