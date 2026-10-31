import { fixSept } from "@/lib/format-date";
/** Bond + Calendar client: types mirror the engine payloads (codes only; words come from
 *  messages-bond.ts). */
export type Band = "very_easy" | "good" | "needs_care";
export type Element = "fire" | "earth" | "air" | "water";
export type DayType = "warm" | "soft" | "support_a" | "support_b" | "talk" | "ordinary";
export type AreaId = "money" | "travel" | "talks" | "love" | "health" | "rest" | "new_starts";

export type KootaFact = { id: string; points: number; max: number; code: string; dosha?: boolean; dosha_cancelled?: boolean; cancel_rule?: string };
export type SideFact = { name: string; nakshatra: string; pada: number; moon_sign: string; gana: string; nadi: string; yoni: string; love: { needs: Element; shows: Element; conflict: Element } };
export type MatchFull = {
  total: number; max: 36; band: Band; approximate: boolean; a_name: string; b_name: string;
  kootas?: KootaFact[];
  kuja?: { pair: string; note_code: string; a: { status: string; cancellations: string[]; approximate: boolean }; b: { status: string; cancellations: string[]; approximate: boolean } };
  a?: SideFact; b?: SideFact;
};
export type MatchText = {
  headline: string; summary: string; kootas: { koota_id: string; plain: string }[]; kuja_note: string;
  strengths: string[]; practise: string;
  partners: { who: "a" | "b"; feels_loved: string; pleases: string[]; avoid: string[]; try_this_week: string }[];
  myth_bust: string; share_line: string;
};
export type Progress = { state: "none" | "generating" | "ready" | "failed"; pct: number; elapsed_ms: number; expected_ms: number };
export type Streak = { mine: number; together: number; best: number; done_today: string[]; partner_done_today: boolean; last7: { date: string; me: boolean; them: boolean }[] };
export type LinkView = { id: string; role: "owner" | "partner"; status: "details_only" | "invited" | "linked" | "unlinked"; partner_name: string; relationship_kind: string; invite_expires_at: string | null; linked_at: string | null };
export type BondStatus = {
  link: LinkView | null; access: boolean; isPro: boolean; today: string;
  match?: MatchFull; match_text?: MatchText | null; match_progress?: Progress | null;
  couple_today?: { date: string; type: DayType; action_key: string; best: { start: string; end: string } | null } | null;
  streak?: Streak | null;
};
export type MonthDay = { date: string; weekday: number; type: DayType; a_rank: number; b_rank: number };
export type MonthFactsView = {
  month: string; a_name: string; b_name: string; counts: Record<DayType, number>; days: MonthDay[];
  key_days: { date: string; type: DayType }[]; weeks: { week_key: string; from: string; to: string }[];
  notes: { who: "a" | "b"; code: "short_fuse" | "romance_lift"; from: string; to: string }[];
};
export type MonthText = {
  headline: string; body: string; do: string[]; dont: string[]; weeks: { week_key: string; line: string }[];
  key_days: { date: string; action: string }[]; share_line: string;
};
export type CalDay = {
  date: string; weekday: number; tone: "supportive" | "mixed" | "rest"; favours: AreaId[]; avoid: AreaId | null;
  chandrashtama: boolean; peak: number; scores: Record<AreaId, number>; best: { start: string; end: string } | null;
  rahu: { start: string; end: string } | null; tithi: string; nakshatra: string;
  tara?: string | null; birth_star?: boolean; why?: string; best_kind?: "go" | "calm"; natal_star?: string | null;
};
export type YearMonth = {
  month: string; theme: string; ad_lord: string | null; ad_change: boolean; supportive_days: number; rest_days: number;
  /** v2: transit-driven theme + the dasha backdrop and the month's sky notes. */
  sun_theme?: string; backdrop?: string; chandrashtama_days?: number; mercury_rx_days?: number;
  notes?: ("eclipse_solar" | "eclipse_lunar" | "merc_rx" | "jup_shift" | "sat_shift" | "rahu_moon")[];
  best_dates: { date: string; area: AreaId }[]; slow: "sade_sati" | "ashtama_shani" | null; jupiter_lift: boolean;
};

export class EngineError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
  }
}

export async function bondPost<T = Record<string, unknown>>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.error) {
    throw new EngineError(String(json.error ?? `http_${res.status}`), String(json.error_code ?? `http_${res.status}`), res.status);
  }
  return json as T;
}

export const PENDING_INVITE_KEY = "muhurta.pendingInvite";

export const DAY_STYLE: Record<DayType, { dot: string; chip: string }> = {
  warm: { dot: "bg-[#d9825b]", chip: "bg-[#fbe3d6] text-[#8a3f1f]" },
  talk: { dot: "bg-[#5b8fd9]", chip: "bg-[#e1ebfb] text-[#244a80]" },
  soft: { dot: "bg-[#9a8fc4]", chip: "bg-[#ece8f7] text-[#4b3f80]" },
  support_a: { dot: "bg-[#c4a24f]", chip: "bg-gold-wash text-gold-text" },
  support_b: { dot: "bg-[#c4a24f]", chip: "bg-gold-wash text-gold-text" },
  ordinary: { dot: "bg-line", chip: "bg-canvas text-ink-tertiary" },
};

export const BAND_STYLE: Record<Band, { ring: string; text: string; wash: string }> = {
  very_easy: { ring: "#2f7d5a", text: "text-success-ink", wash: "bg-success-wash" },
  good: { ring: "#c59b4f", text: "text-gold-text", wash: "bg-gold-wash" },
  needs_care: { ring: "#b4774a", text: "text-warning-ink", wash: "bg-warning-wash" },
};

export function shortDate(iso: string, locale: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return fixSept(d.toLocaleDateString(locale === "te" ? "te-IN" : locale === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short" }));
}

export function monthLabel(ym: string, locale: string, withYear = true): string {
  const d = new Date(`${ym}-15T12:00:00`);
  return d.toLocaleDateString(locale === "te" ? "te-IN" : locale === "hi" ? "hi-IN" : "en-IN", withYear ? { month: "long", year: "numeric" } : { month: "long" });
}

export function clock(hhmm: string | undefined | null): string {
  const m = /(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
}

// ------------------------------------------------------------------ bond_status cache + prefetch
/**
 * Bond opens instantly from the last status (memory, then sessionStorage) while a fresh one
 * loads; the shell prefetches it once the app is idle. Per signed-in user; read-only action.
 */
const BOND_TTL_MS = 10 * 60_000;
const bondMem = new Map<string, { at: number; v: BondStatus }>();
let bondInflight: { key: string; p: Promise<BondStatus> } | null = null;
const bondKey = (uid: string | null | undefined) => `muhurta.bondStatus:${uid ?? "anon"}`;

export function cachedBondStatus(uid: string | null | undefined): BondStatus | null {
  const k = bondKey(uid);
  const mem = bondMem.get(k);
  if (mem && Date.now() - mem.at < BOND_TTL_MS) return mem.v;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(k);
    if (!raw) return null;
    const j = JSON.parse(raw) as { at: number; v: BondStatus };
    if (Date.now() - j.at > BOND_TTL_MS) return null;
    bondMem.set(k, j);
    return j.v;
  } catch {
    return null;
  }
}

function storeBondStatus(uid: string | null | undefined, v: BondStatus) {
  const k = bondKey(uid);
  const entry = { at: Date.now(), v };
  bondMem.set(k, entry);
  try {
    window.sessionStorage.setItem(k, JSON.stringify(entry));
  } catch {
    /* storage full or private mode */
  }
}

export function clearBondStatus(uid: string | null | undefined) {
  const k = bondKey(uid);
  bondMem.delete(k);
  try {
    window.sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** Fetch bond_status once (shared by the prefetch and the page) and cache it. */
export function fetchBondStatus(uid: string | null | undefined): Promise<BondStatus> {
  const k = bondKey(uid);
  if (bondInflight?.key === k) return bondInflight.p;
  const p = bondPost<BondStatus>("bond_status")
    .then((v) => {
      storeBondStatus(uid, v);
      return v;
    })
    .finally(() => {
      if (bondInflight?.p === p) bondInflight = null;
    });
  bondInflight = { key: k, p };
  return p;
}

export function prefetchBondStatus(uid: string | null | undefined) {
  if (!uid || cachedBondStatus(uid)) return;
  void fetchBondStatus(uid).catch(() => {});
}
