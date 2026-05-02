import type { SupabaseClient, User } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { phaseCardCopy, plainPeriodLabel, antardashaFallbackCopy } from "./copy.ts";
import {
  goodAndCautionWindows,
  sunriseSunset,
  divideDaylight,
} from "./solar.ts";
import {
  allAntardashasFromMahadashas,
  nakshatraIndex,
  recentAntardashasClipped,
  recentMahadashas,
  segmentAt,
  vimshottariLordsAt,
  vimshottariMahadashas,
  type MdSegment,
} from "./vimshottari.ts";
import {
  moonSiderealLongitudeDeg,
  nakshatraPadaFromSiderealLon,
  siderealMetaFromNameOrMoon,
} from "./ephemeris.ts";
import { generateJourneyLlmCards } from "./journey_llm.ts";
import {
  generatePurposeCopy,
  generateRemedyCopy,
  generateTodayCopy,
} from "./content_llm.ts";
import {
  normalizeLocale,
  rashiDisplay,
  rashiKeyFromSiderealLon,
  type AppLocale,
} from "./vedic_labels.ts";

const ENGINE_V = "v1";
const JOURNEY_LOOKBACK_YEARS = 15;
const DEFAULT_LAT = 19.076;
const DEFAULT_LNG = 72.8777;

type BioRow = {
  id: string;
  profile_id: string;
  date_of_birth: string;
  birth_input_mode: string;
  exact_birth_time: string | null;
  time_bucket: string | null;
  janma_nakshatra: string | null;
  nakshatra_pada: number | null;
  birth_timezone: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
};

type ProfRow = {
  id: string;
  current_city: string | null;
  current_timezone: string | null;
  current_lat: number | null;
  current_lng: number | null;
  display_name: string | null;
  language_code: string | null;
};

function requestLocale(body: Record<string, unknown>, prof: ProfRow): AppLocale {
  return normalizeLocale(String(body.locale ?? prof.language_code ?? "en"));
}

/** Small deterministic spread so different purposes rarely tie on the same day. */
const PURPOSE_SCORE_BIAS: Record<string, number> = {
  career_interview: 4,
  business_launch: 2,
  money_talk: -2,
  property_vehicle: 1,
  relationship_marriage_talk: 3,
  family_discussion: 0,
  travel: 5,
  study_exam: 1,
  health_routine: -4,
  legal_dispute: -3,
  spiritual_puja: 2,
  creative_public: 3,
};

export function resolveEngineMode(bi: BioRow): string {
  const hasExact = bi.exact_birth_time != null;
  const hasBucket = bi.time_bucket != null;
  const hasNak = bi.janma_nakshatra != null && bi.janma_nakshatra.length > 0;
  if (hasExact) return "full_chart";
  if (hasBucket && hasNak) return "strong_phase";
  if (hasBucket && !hasNak) return "window_chart";
  if (!hasBucket && hasNak) return "nakshatra_dasha";
  return "general_panchanga";
}

export function todayInTimezone(tz: string): string {
  return DateTime.now().setZone(tz).toISODate()!;
}

/** JS Sunday=0 .. Saturday=6 from calendar date in zone. */
function jsWeekday(dateStr: string, tz: string): number {
  const wd = DateTime.fromISO(dateStr, { zone: tz }).weekday; // 1 Mon .. 7 Sun
  return wd % 7;
}

function zonedNoonJsDate(dateStr: string, tz: string): Date {
  return DateTime.fromISO(dateStr, { zone: tz })
    .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
    .toJSDate();
}

async function getProfileForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<ProfRow> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, current_city, current_timezone, current_lat, current_lng, display_name, language_code",
    )
    .eq("user_id", user.id)
    .single();
  if (error || !data) throw new Error("Profile not found");
  return data as ProfRow;
}

async function getBirthInput(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
): Promise<BioRow> {
  const { data, error } = await supabase
    .from("birth_inputs")
    .select(
      "id, profile_id, date_of_birth, birth_input_mode, exact_birth_time, time_bucket, janma_nakshatra, nakshatra_pada, birth_timezone, birth_lat, birth_lng",
    )
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("Birth input not found");
  if (data.profile_id !== profileId) throw new Error("Forbidden");
  return data as BioRow;
}

async function getLatestBirthInput(
  supabase: SupabaseClient,
  profileId: string,
): Promise<BioRow | null> {
  const { data, error } = await supabase
    .from("birth_inputs")
    .select(
      "id, profile_id, date_of_birth, birth_input_mode, exact_birth_time, time_bucket, janma_nakshatra, nakshatra_pada, birth_timezone, birth_lat, birth_lng",
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as BioRow | null;
}

function parseBirthDate(isoDate: string): Date {
  const d = String(isoDate).slice(0, 10);
  return new Date(`${d}T12:00:00.000Z`);
}

function resolveBirthZone(bi: BioRow, profileTimezone: string): string {
  return bi.birth_timezone ?? profileTimezone ?? "Asia/Kolkata";
}

/** Wall-clock birth in [zone] → UTC. Requires exact_birth_time + date_of_birth. */
function birthInstantUtc(bi: BioRow, zone: string): Date | null {
  if (!bi.exact_birth_time) return null;
  const dateStr = String(bi.date_of_birth).slice(0, 10);
  let timeStr = String(bi.exact_birth_time).trim();
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) timeStr += ":00";
  const isoLocal = `${dateStr}T${timeStr}`;
  const dt = DateTime.fromISO(isoLocal, { zone });
  if (!dt.isValid) return null;
  return dt.toUTC().toJSDate();
}

function vimshottariEpochUtc(bi: BioRow, zone: string): Date {
  const exact = birthInstantUtc(bi, zone);
  if (exact && resolveEngineMode(bi) === "full_chart") return exact;
  return parseBirthDate(String(bi.date_of_birth).slice(0, 10));
}

function computeTimeline(
  bi: BioRow,
  profileTimezone: string,
): { segments: MdSegment[]; nk: number | null } {
  const zone = resolveBirthZone(bi, profileTimezone);
  const epoch = vimshottariEpochUtc(bi, zone);
  const moonUtc = birthInstantUtc(bi, zone);
  const moonLon = moonUtc != null ? moonSiderealLongitudeDeg(moonUtc) : null;
  const meta = siderealMetaFromNameOrMoon(
    bi.janma_nakshatra,
    bi.nakshatra_pada,
    moonLon,
  );
  if (!meta) return { segments: [], nk: null };
  return {
    segments: vimshottariMahadashas(epoch, meta.idx, meta.pada),
    nk: meta.idx,
  };
}

const purposeRules: Record<string, { favor: string[]; caution: string[] }> = {
  career_interview: { favor: ["Mercury", "Jupiter"], caution: ["Rahu", "Mars"] },
  business_launch: {
    favor: ["Mercury", "Jupiter", "Venus"],
    caution: ["Rahu", "Saturn"],
  },
  money_talk: { favor: ["Jupiter", "Venus", "Mercury"], caution: ["Rahu"] },
  property_vehicle: { favor: ["Mars", "Saturn"], caution: ["Rahu"] },
  relationship_marriage_talk: {
    favor: ["Venus", "Jupiter", "Moon"],
    caution: ["Mars", "Rahu"],
  },
  family_discussion: { favor: ["Moon", "Jupiter"], caution: ["Mars"] },
  travel: { favor: ["Moon", "Jupiter"], caution: ["Rahu"] },
  study_exam: { favor: ["Mercury", "Jupiter"], caution: ["Rahu"] },
  health_routine: { favor: ["Saturn", "Sun"], caution: ["Rahu"] },
  legal_dispute: { favor: ["Saturn", "Mars", "Mercury"], caution: ["Rahu"] },
  spiritual_puja: { favor: ["Jupiter", "Moon"], caution: ["Rahu"] },
  creative_public: { favor: ["Venus", "Mercury", "Moon"], caution: ["Rahu"] },
};

export async function handleRequest(
  supabase: SupabaseClient,
  user: User,
  body: Record<string, unknown>,
): Promise<unknown> {
  const action = body.action as string;
  if (!action) throw new Error("Missing action");

  const prof = await getProfileForUser(supabase, user);

  if (action === "chart_initialize") {
    const birthInputId = body.birth_input_id as string;
    if (!birthInputId) throw new Error("birth_input_id required");
    const bi = await getBirthInput(supabase, birthInputId, prof.id);
    const engineMode = resolveEngineMode(bi);
    const tz = resolveBirthZone(bi, prof.current_timezone ?? "Asia/Kolkata");
    const moonUtc = birthInstantUtc(bi, tz);
    const moonLon = moonUtc != null ? moonSiderealLongitudeDeg(moonUtc) : null;
    const meta = siderealMetaFromNameOrMoon(
      bi.janma_nakshatra,
      bi.nakshatra_pada,
      moonLon,
    );
    const janmaOut = meta?.name ?? bi.janma_nakshatra;
    const padaOut = meta?.pada ?? bi.nakshatra_pada;

    if (meta && !bi.janma_nakshatra) {
      await supabase.from("birth_inputs").update({
        janma_nakshatra: meta.name,
        nakshatra_pada: meta.pada,
        updated_at: new Date().toISOString(),
      }).eq("id", bi.id);
    }

    const raw = {
      birth_input_id: bi.id,
      birth_input_mode: bi.birth_input_mode,
      resolved_engine_mode: engineMode,
      derived_from_ephemeris: !bi.janma_nakshatra && meta != null,
    };
    const { data: chart, error } = await supabase
      .from("chart_runs")
      .insert({
        profile_id: prof.id,
        birth_input_id: bi.id,
        engine_mode: engineMode,
        engine_version: ENGINE_V,
        janma_nakshatra: janmaOut,
        nakshatra_pada: padaOut,
        raw_context: raw,
        calculation_status: "complete",
      })
      .select("id")
      .single();
    if (error) throw error;
    const nk = meta?.idx ?? null;
    const canQuick = nk != null &&
      engineMode !== "general_panchanga" &&
      engineMode !== "window_chart";
    return {
      chartRunId: chart.id,
      engineMode,
      confidenceLabel: canQuick ? "structured" : "general_day",
      canShowQuickProof: canQuick,
      canShowPurposeTiming: true,
      canShowPersonalJourney: canQuick,
    };
  }

  if (action === "quick_proof_generate") {
    const bi = await getLatestBirthInput(supabase, prof.id);
    if (!bi) throw new Error("No birth input");

    const { data: chart } = await supabase
      .from("chart_runs")
      .select("*")
      .eq("profile_id", prof.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!chart) throw new Error("Chart not initialized");

    await supabase
      .from("phase_runs")
      .delete()
      .eq("profile_id", prof.id)
      .eq("run_type", "quick_proof");

    const engineMode = chart.engine_mode as string;
    const { segments, nk } = computeTimeline(bi, prof.current_timezone ?? "Asia/Kolkata");
    let cards: unknown[] = [];

    if (nk != null && segments.length > 0 && engineMode !== "window_chart" &&
      engineMode !== "general_panchanga") {
      const now = new Date();
      const recent = recentMahadashas(segments, now, 22, 5);
      const { data: prun, error: e2 } = await supabase
        .from("phase_runs")
        .insert({
          profile_id: prof.id,
          chart_run_id: chart.id,
          engine_version: ENGINE_V,
          run_type: "quick_proof",
          status: "complete",
        })
        .select("id")
        .single();
      if (e2) throw e2;

      let sort = 0;
      const rows: Record<string, unknown>[] = [];
      for (const seg of recent) {
        const cp = phaseCardCopy(seg.lord, seg.start, seg.end, sort);
        const endInclusive = DateTime.fromJSDate(seg.end)
          .minus({ days: 1 })
          .toISODate()!;
        rows.push({
          phase_run_id: prun.id,
          profile_id: prof.id,
          start_date: seg.start.toISOString().slice(0, 10),
          end_date: endInclusive,
          mahadasha_lord: seg.lord,
          active_life_areas: cp.lifeAreas,
          main_themes: cp.themes,
          caution_themes: [],
          confidence_label: engineMode === "full_chart" ? "high" : "medium",
          sort_order: sort++,
          deterministic_context: {
            sentences: cp.sentences,
            card_title: cp.title,
            period_label: plainPeriodLabel(seg.start, seg.end),
            internal_lord: seg.lord,
          },
        });
      }

      const { data: inserted, error: e3 } = await supabase
        .from("phase_segments")
        .insert(rows)
        .select("id, deterministic_context, start_date, end_date");
      if (e3) throw e3;

      cards = (inserted ?? []).map((r) => {
        const ctx = r.deterministic_context as Record<string, unknown>;
        return {
          phaseSegmentId: r.id,
          periodLabel: ctx.period_label,
          title: ctx.card_title,
          sentences: ctx.sentences,
          confidenceLabel: engineMode === "full_chart" ? "high" : "medium",
          validationOptions: [
            "exactly_this",
            "partly_true",
            "wrong_timing",
            "didnt_happen",
          ],
        };
      });
    }

    return { cards, engineMode };
  }

  if (action === "validation_submit") {
    const phaseSegmentId = body.phase_segment_id as string;
    const feedbackValue = body.feedback_value as string;
    if (!phaseSegmentId || !feedbackValue) throw new Error("Missing fields");
    const { data: pseg } = await supabase
      .from("phase_segments")
      .select("profile_id")
      .eq("id", phaseSegmentId)
      .maybeSingle();
    if (!pseg || pseg.profile_id !== prof.id) throw new Error("Invalid segment");

    const { error } = await supabase.from("validation_feedback").insert({
      profile_id: prof.id,
      phase_segment_id: phaseSegmentId,
      feedback_value: feedbackValue,
      optional_note: (body.optional_note as string) ?? null,
    });
    if (error) throw error;
    return {
      saved: true,
      nextAction: feedbackValue === "wrong_timing" || feedbackValue === "didnt_happen"
        ? "show_more_phases"
        : "go_to_today",
    };
  }

  if (action === "today_get") {
    const locale = requestLocale(body, prof);
    const tz = prof.current_timezone ?? "Asia/Kolkata";
    const dateStr = (body.date as string) ?? todayInTimezone(tz);
    const lat = prof.current_lat != null ? Number(prof.current_lat) : DEFAULT_LAT;
    const lng = prof.current_lng != null ? Number(prof.current_lng) : DEFAULT_LNG;
    const day = zonedNoonJsDate(dateStr, tz);
    const sun = sunriseSunset(day, lat, lng);
    const slices = divideDaylight(sun, jsWeekday(dateStr, tz));
    const { good, caution } = goodAndCautionWindows(slices, tz);

    const refInstant = zonedNoonJsDate(dateStr, tz);
    const moonLon = moonSiderealLongitudeDeg(refInstant);
    const rk = rashiKeyFromSiderealLon(moonLon);
    const moonSign = rashiDisplay(rk, locale);
    const moonNak = nakshatraPadaFromSiderealLon(moonLon);

    const bi = await getLatestBirthInput(supabase, prof.id);
    const { data: chart } = await supabase
      .from("chart_runs")
      .select("engine_mode")
      .eq("profile_id", prof.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const engineMode = (chart?.engine_mode as string) ?? "general_panchanga";

    await supabase
      .from("daily_windows")
      .delete()
      .eq("profile_id", prof.id)
      .eq("target_date", dateStr);

    const inserts: Record<string, unknown>[] = [];
    let gi = 0;
    for (const g of good) {
      inserts.push({
        profile_id: prof.id,
        target_date: dateStr,
        location_city: prof.current_city,
        timezone: tz,
        engine_mode: engineMode,
        window_type: "good",
        start_time: g.start,
        end_time: g.end,
        label: `Favorable window ${++gi}`,
        reason: "Outside Rahu Kalam (solar day model)",
        source_factors: ["solar_segment"],
      });
    }
    for (const c of caution) {
      inserts.push({
        profile_id: prof.id,
        target_date: dateStr,
        location_city: prof.current_city,
        timezone: tz,
        engine_mode: engineMode,
        window_type: "caution",
        start_time: c.start,
        end_time: c.end,
        label: "Rahu Kalam",
        reason: "Traditional inauspicious segment for beginnings",
        source_factors: ["rahu_kalam"],
      });
    }
    if (inserts.length) {
      const { error } = await supabase.from("daily_windows").insert(inserts);
      if (error) throw error;
    }

    let betterFor = [
      "Steady conversations with clear asks",
      "Paperwork you have been postponing",
    ];
    let beCareful = [
      "Starting brand-new commitments in Rahu Kalam",
      "Emotional decisions on an empty stomach",
    ];

    let currentLifePeriod: { label: string; summary: string } | undefined;
    let mdLordFact = "";
    let adLordFact = "";
    const nowZoned = DateTime.now().setZone(tz).toJSDate();
    if (bi) {
      const { segments, nk } = computeTimeline(bi, prof.current_timezone ?? "Asia/Kolkata");
      if (nk != null && segments.length) {
        const lords = vimshottariLordsAt(segments, refInstant);
        if (lords) {
          mdLordFact = lords.mdLord;
          adLordFact = lords.adLord;
        }
        const cur = segmentAt(segments, nowZoned);
        if (cur) {
          const cp = phaseCardCopy(
            cur.lord,
            cur.start,
            cur.end,
            cur.lord.length * 17 + cur.start.getUTCFullYear(),
          );
          currentLifePeriod = {
            label: cp.title,
            summary: cp.sentences[0] as string,
          };
          betterFor = [
            `Rhythm favoring ${cp.lifeAreas[0]} and ${cp.lifeAreas[1]}`,
            "Concrete next steps written in one line",
          ];
          beCareful = [
            "Starting brand-new commitments in Rahu Kalam",
            `Rushing decisions tied to ${cp.lifeAreas[0]}`,
          ];
        }
      }
    }

    const tcopy = await generateTodayCopy(locale, {
      date: dateStr,
      moon_rashi: moonSign.label,
      moon_nakshatra: moonNak.name,
      mahadasha_lord: mdLordFact || undefined,
      antardasha_lord: adLordFact || undefined,
      good_windows: good.length,
      caution_windows: caution.length,
      engine_mode: engineMode,
    });
    if (
      tcopy &&
      tcopy.better_for.length >= 2 &&
      tcopy.be_careful.length >= 2
    ) {
      betterFor = tcopy.better_for.slice(0, 2);
      beCareful = tcopy.be_careful.slice(0, 2);
      if (tcopy.rhythm_title?.trim() && tcopy.rhythm_body?.trim()) {
        currentLifePeriod = {
          label: tcopy.rhythm_title.trim(),
          summary: tcopy.rhythm_body.trim(),
        };
      }
    }

    return {
      locale,
      displayName: prof.display_name,
      date: dateStr,
      locationLabel: prof.current_city ?? "India reference",
      engineMode,
      moonSign: {
        key: moonSign.key,
        label: moonSign.label,
        symbol: moonSign.symbol,
      },
      moonNakshatra: moonNak.name,
      betterFor,
      beCarefulWith: beCareful,
      goodWindows: good.map((w) => ({
        start: w.start,
        end: w.end,
        label: w.label,
      })),
      cautionWindows: caution.map((w) => ({
        start: w.start,
        end: w.end,
        label: w.label,
      })),
      currentLifePeriod,
    };
  }

  if (action === "purpose_check") {
    const locale = requestLocale(body, prof);
    const purposeType = body.purpose_type as string;
    if (!purposeType) throw new Error("purpose_type required");
    const rules = purposeRules[purposeType] ??
      { favor: ["Jupiter", "Mercury"], caution: ["Rahu"] };
    const tz = prof.current_timezone ?? "Asia/Kolkata";
    const targetDate = (body.target_date as string) ?? todayInTimezone(tz);
    const bi = await getLatestBirthInput(supabase, prof.id);
    let score = 48 + (PURPOSE_SCORE_BIAS[purposeType] ?? 0);
    let lord = "";
    let adLordCtx = "";
    if (bi) {
      const { segments, nk } = computeTimeline(bi, prof.current_timezone ?? "Asia/Kolkata");
      if (nk != null && segments.length) {
        const at = zonedNoonJsDate(targetDate, tz);
        const vl = vimshottariLordsAt(segments, at);
        if (vl) {
          lord = vl.mdLord;
          adLordCtx = vl.adLord;
          if (rules.favor.includes(vl.mdLord)) score += 26;
          if (rules.favor.includes(vl.adLord)) score += 20;
          if (rules.caution.includes(vl.mdLord)) score -= 20;
          if (rules.caution.includes(vl.adLord)) score -= 16;
        }
      }
    }
    if (score > 100) score = 100;
    if (score < 0) score = 0;
    const status = score >= 75
      ? "matched"
      : score >= 45
      ? "partly_matched"
      : "not_matched";

    const day = zonedNoonJsDate(targetDate, tz);
    const lat = prof.current_lat != null ? Number(prof.current_lat) : DEFAULT_LAT;
    const lng = prof.current_lng != null ? Number(prof.current_lng) : DEFAULT_LNG;
    const sun = sunriseSunset(day, lat, lng);
    const slices = divideDaylight(sun, jsWeekday(targetDate, tz));
    const { good, caution } = goodAndCautionWindows(slices, tz);

    const best_windows = good.slice(0, 3).map((w) => ({
      start: w.start,
      end: w.end,
      label: "Preferred daylight segment",
    }));
    const caution_windows = caution.slice(0, 2).map((w) => ({
      start: w.start,
      end: w.end,
      label: w.label,
    }));

    let better_options = status === "not_matched"
      ? [{
        label: "Tomorrow morning",
        detail:
          "Retry after sunrise, avoiding the first Rahu segment—keep the task small and concrete.",
      }]
      : [];

    let summary = status === "matched"
      ? "The current life-period rhythm leans supportive for this purpose—still use common sense."
      : status === "partly_matched"
      ? "Mixed support: workable if you keep logistics clean and tone gentle."
      : "Not the strongest match for this purpose today—shift timing rather than forcing the moment.";

    let action_line = status === "not_matched"
      ? "Pick the next clear morning window or shorten the ask."
      : "Proceed with a written note of what success means.";

    const pcopy = await generatePurposeCopy(locale, {
      purpose_type: purposeType,
      status,
      score,
      md_lord: lord,
      ad_lord: adLordCtx,
      target_date: targetDate,
      suggest_alternatives: status === "not_matched",
    });
    if (pcopy?.summary) summary = pcopy.summary;
    if (pcopy?.action_line) action_line = pcopy.action_line;
    if (Array.isArray(pcopy?.better_options) && pcopy.better_options.length > 0) {
      better_options = pcopy.better_options.map((b) => ({
        label: String(b.label),
        detail: String(b.detail),
      }));
    }

    const ctx = { score, purposeType, lord, ad_lord: adLordCtx, rules };

    const { data: saved, error } = await supabase
      .from("purpose_checks")
      .insert({
        profile_id: prof.id,
        purpose_type: purposeType,
        target_date: targetDate,
        location_city: prof.current_city,
        timezone: tz,
        status,
        summary,
        action_line,
        best_windows,
        caution_windows,
        better_options,
        deterministic_context: ctx,
      })
      .select("id")
      .single();
    if (error) throw error;

    return {
      id: saved.id,
      status,
      summary,
      action_line,
      best_windows,
      caution_windows,
      better_options,
      locale,
    };
  }

  if (action === "journey_get") {
    const locale = requestLocale(body, prof);
    const bi = await getLatestBirthInput(supabase, prof.id);
    if (!bi) return { phases: [] };
    const { segments, nk } = computeTimeline(bi, prof.current_timezone ?? "Asia/Kolkata");
    if (nk === null || !segments.length) return { phases: [] };
    const now = new Date();
    const ads = allAntardashasFromMahadashas(segments);
    const clipped = recentAntardashasClipped(ads, now, JOURNEY_LOOKBACK_YEARS);
    if (!clipped.length) return { phases: [] };

    const llmMap = await generateJourneyLlmCards(clipped, locale);
    const phases = clipped.map((seg, idx) => {
      const fromLlm = llmMap?.get(idx);
      if (fromLlm && fromLlm.sentences.length >= 2) {
        return {
          sortOrder: idx,
          periodLabel: plainPeriodLabel(seg.start, seg.end),
          title: fromLlm.title,
          sentences: fromLlm.sentences.slice(0, 3),
        };
      }
      const fb = antardashaFallbackCopy(
        seg.mdLord,
        seg.adLord,
        seg.start,
        seg.end,
        idx,
      );
      return {
        sortOrder: idx,
        periodLabel: plainPeriodLabel(seg.start, seg.end),
        title: fb.title,
        sentences: fb.sentences,
      };
    });
    return { phases, locale };
  }

  if (action === "remedy_today") {
    const locale = requestLocale(body, prof);
    const bi = await getLatestBirthInput(supabase, prof.id);
    const { data: catalog } = await supabase
      .from("remedy_catalog")
      .select("id, remedy_key, remedy_type, title, simple_line, applicable_planets")
      .eq("is_active", true);
    let lord = "";
    if (bi) {
      const { segments, nk } = computeTimeline(bi, prof.current_timezone ?? "Asia/Kolkata");
      if (nk != null && segments.length) {
        const cur = segmentAt(segments, new Date());
        if (cur) lord = cur.lord;
      }
    }
    const rows = (catalog ?? []).filter((r) => {
      const p = r.applicable_planets as string[] | null;
      if (!p || p.length === 0) return true;
      return lord && p.includes(lord);
    }).slice(0, 5);

    const base = rows.map((r) => ({
      id: r.id as string,
      title: r.title as string,
      simple_line: r.simple_line as string,
      remedyType: r.remedy_type as string,
    }));

    let remedies = base.map((b) => ({
      id: b.id,
      title: b.title,
      simpleLine: b.simple_line,
      remedyType: b.remedyType,
    }));
    const rcopy = await generateRemedyCopy(locale, {
      active_lord: lord || undefined,
      items: base.map((b) => ({
        id: b.id,
        title: b.title,
        simple_line: b.simple_line,
      })),
    });
    if (rcopy && rcopy.length === base.length) {
      remedies = base.map((b, i) => {
        const rc = rcopy[i]!;
        return {
          id: (rc.id || b.id) as string,
          title: (rc.title || b.title) as string,
          simpleLine: (rc.simple_line || b.simple_line) as string,
          remedyType: b.remedyType,
        };
      });
    }

    return { remedies, locale };
  }

  throw new Error(`Unknown action: ${action}`);
}
