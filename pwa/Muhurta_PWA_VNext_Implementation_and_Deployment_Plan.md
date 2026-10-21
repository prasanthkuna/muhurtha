# MUHŪRTA — PWA VNext Implementation & Deployment Blueprint

**Plan status:** FINAL PLANNING / READ ONLY — no application code, database, configuration or deployment was changed by this plan.

**Verified baseline (20 October 2026):** `prasanthkuna/muhurtha` at `7342fdb375ca5b4c1c76f012bdc4c0e7cca026f1`; Vercel PWA production READY at the same commit; Supabase `kdngizqrybkrckvphyin`: `muhurtha-api` v126 ACTIVE, `muhurtha-api-vnext` v2 ACTIVE. Stage v2 is not automatically newer/better than production v126. Production access via Vercel was not visually authenticated in this audit. Relevant official PWA reference: https://nextjs.org/docs/app/guides/progressive-web-apps.

## A. Product decision and release boundaries

1. **One onboarding-generation lifecycle per free canonical personal dossier**, stored and reused. Multiple small LLM phase calls in a single controlled, resumable job are acceptable; no additional LLM generation on ordinary opens. Lock against concurrent starts and usage abuse. Do not imply that a 6-phase LLM process is literally one model call.
2. **No feedback, journaling, progress streaks, or event-truth inference in this release**. Move explicit 'matches / doesn't match', saved memoirs, longitudinal preference learning, outcomes, and adherence-tracking to V2.
3. **Preserve existing content**: identity summary, traits, strengths, watchouts, 6 life domains, full 25-phase Life Map, good/caution windows, full daily readings, better-for/careful, lucky days/numbers/colors, remedies, week/month/year horizons where grounded, purpose options, date compare, Ask, friend/partner charts, saved timings, notifications, sharing, subscriptions and legal information.
4. **Differentiate data types**: deterministic chart/Panchanga factors, traditional interpretation, editorial prose, user-entered plans, and observed notification status. Do not fabricate times or personal experiences. Astrology is a traditional belief/interpretive system, not validated outcome prediction.
5. **Visual direction**: 'Claude-like editorial calm + warm gold': `#F8F5EE` canvas, `#FFFCF6` paper, `#242019` ink, `#77541F` primary dark gold, `#A67B35` accent, `#C59B4F` action, Fraunces headline, Instrument Sans UI, appropriate Telugu and Devanagari script fonts. Minimal cards, strong narrative hierarchy, visible provenance, readable regional text, gentle purposeful motion, reduced-motion support. Do not make a generic fintech dashboard.
6. **Five tabs preserved**: Decode | Life Map | Today | Timing | Ask. First completed onboarding -> Decode; returning user -> Today only on neutral landing, not by forcibly replacing deep links. Secondary routes under Settings / Plans / Traditions / Share / Comparison; no sixth bottom tab.
7. **Business objective**: increase *meaningful* revisits with accurate time-specific utility and saved decisions. Never optimize by fake content novelty, push spam, guaranteed fortunes, or unnecessary regeneration.

## B. Exactly how AI spend must work

| Path or trigger | Free tier LLM after generation | Paid behavior | Required control |
|---|---:|---|---|
| Initial onboarding | Fixed one controlled dossier job | Same or richer dossier by entitlement | Atomic generation claim per user and input signature; phase resume and spend log |
| Decode, Life Map, Today, Week, Month | 0 | Stored content; no automatic regeneration | Separate read-only APIs |
| Panchanga, weekday/date comparisons, times | 0 | Same deterministic engine, potentially expanded comparison range | Calculation and location integrity |
| Free Ask predefined questions | 0 | Optional intelligent answer route | Explicit template intent matching and unsupported-question handling |
| Paid free-form Ask | N/A | Actual metered grounded LLM route | Daily/monthly token and currency budget, server gate, concurrency, idempotency |
| Notification and share composer | 0 | Same or rich templates | Deterministic rendering and privacy |
| Friend chart / compatibility preview | 0 by default | Premium full dossier only by explicit entitlement | Avoid free generation per added profile |
| Change city/timezone | 0 | 0 | Recalculate local facts; invalidate time-dependent caches only |
| Change content language | 0 automatic | Optional one-time translated/second-language dossier with explicit budget | No silently recurring generation across locales |
| Change birth details | No unbounded implicit regeneration | Controlled corrective generation | Fact signature, version history, correction allowance and abuse guard |
| Pack reaches 30-day narrative boundary | 0 | Optional explicitly purchased/entitled refresh | Deterministic date-correct content for free users |

**Hidden generation paths to eliminate:** `birth_pack_get` currently initiates pack generation; make reading separate from explicitly authorized `chart_generate`. `weekly_get` and `monthly_get` currently may call `ensureBirthPack` / `generateNarrativeCopy` on cache misses. Remove such behavior for free readers. `today_get` does not need a per-day LLM. Current Ask is pack-template based even for subscribed users; paid dynamic answers need a distinct gated implementation, not cosmetic unlock.

**30-day policy:** initial dossier includes ~30 complete dated daily cards, 8 weekly cards, 12 monthly cards, all 25 periods, and stable evergreen assets. Once dated cards expire, render new *deterministic* daily Panchanga, date-specific windows and short verified template explanations, optionally alongside correctly labeled evergreen period context. Never replay the first date's editorial card as today's. Never pretend a dynamically computed sentence came from an ungenerated LLM daily reading. For paid accounts, renewal must be explicit, metered and idempotent.

**Language-cost choice to implement:** select one primary content language at onboarding. UI translations and deterministic labels available in English/Telugu/Hindi through static translation resources. A user switching language should not silently generate six more LLM phases. Full dossier translation is an explicitly budgeted, cached operation (paid or limited entitlement), or original dossier language stays visibly labeled until translation is available. Evaluate generating bilingual pack in a single job only if verified per-person token cost is better; do not assume.

**Economics release tests:** all endpoints produce instrumentation of LLM invocations, prompt/completion tokens (or provider accounting), job/source ID, spend and reason. Repeated daily opens, language toggles, new device logins, date comparisons and notifications must cause **zero new LLM calls**. Concurrent onboarding retries produce exactly one successful paid job per fact signature. Load tests enforce provider-cost budgets; fill actual prices from current provider billing, not assumptions.

## C. Data ownership and deduplication map

| User-facing concept | Authoritative source | Secondary use | Eliminate / guard |
|---|---|---|---|
| Stable identity | `me_profile`, natal deterministic facts | `user_identity` only as structured fallback, not an additional duplicate section | Do not render two generic identities |
| Six life domains | `category_reports` | tiny contextual excerpts elsewhere | No full repeated prose in Today/Timing |
| Life chapters | `journey_phases` keyed by stable phase/fact identity; `journey_phase_facts` for timing/classification | `life_map` group context; `current_phase` brief summary | Do not duplicate chapter body 3x; don't invent absent `subPhases` |
| Today's editorial | `today_cards` keyed by **current local date** | `today_get` deterministic data and `panchanga` | No card from a different date; distinguish missing editorial vs missing engine facts |
| Daily windows | deterministic sunrise/Panchanga + location; `today_get.goodWindows` / cautions | `good_window_notes` for wording only if it demonstrably maps to same verified window | No hardcoded exact times or naive array[0] as "next" |
| Weekly/monthly | `weekly_cards`, `monthly_cards` keyed to current local week/month | `timing_plan` as strategic layer only | Don't default to cards[0] or treat string `horizons` as object |
| Time-specific decisions | `purpose_check` / `purpose_compare` with date, city, input accuracy | Saved plan record only | No astrology guarantees or unsupported purpose |
| Remedies | `remedy_cards` (traditional), `remedy_pack` (practical), catalog if relevant | One daily optional selection | Don't merge different remedies as duplicate copies; no cure claims |
| Personal traditions | `natal_luck` lucky colors/days/numbers | Teaser on Today, full in Traditions | Don't imply today's objectively beneficial luck |
| Ask | `ask_templates`, `ask_knowledge` and persisted `chat_sessions`/`chat_messages` | Contextual questions from other screens | No irrelevant boilerplate for arbitrary Ask query; no LLM on free route |
| Share | `share_cards`, `share_hook` + stored `share_cards` rows | User-visible composer | Never silently expose DOB, coordinates, name, personal concerns |
| Related people | `chart_profiles` and separate birth inputs | Chart switch and consented comparison | Don't mix their pack with owner's or treat a single-person reading as compatibility |

**Observed source quality (1 test profile, 2 packs):** English 16 daily, 8 weekly, 12 monthly; Telugu 25 daily, 0 weekly, 12 monthly; both 25 life chapters; all currently tagged `ready`. Missing coverage must not be mislabeled as complete. Bodies are text-unique, yet daily subject matter repeats practical work/closure themes. Generated Telugu copy regularly includes exact times; enforce mapping against calculated time windows. Existing life chapter `focusAreas`, `pressureThemes`, `domainLenses` and `transitionNote` appear in 25/25 chapters per language but are not adequately surfaced. `subPhases` arrays are empty; do not fabricate.

**Migration/backfill:** retain all old content with provenance/version. Existing partial packs can receive deterministic missing-date explanations; keep original LLM cards untouched, tagged with original date and validity. Any fresh LLM correction requires explicit authorization/budget, never an automatic sweeping regen for the only active profile. Version and validity must separate *canonical natal dossier* (long-lived) from *30-day editorial calendar coverage*. `expires_on` for editorial card coverage cannot cause automatic loss or wholesale regeneration of the evergreen dossier.

## D. Screen-by-screen implementation map (PWA, not Flutter)

1. **Welcome / Auth:** compelling 'Your life has a story' hook; actual *illustrative* sample, clear India-first Jyotish positioning, privacy; Google OAuth retained. Assess whether supported phone OTP parity is a requirement before adding it (currently Google first). Error paths, redirect safety, no personal details leaked on public screens, legal pages.
2. **Onboarding / Profile:** separate birthplace versus current city; exact/approx/unknown birth time, nakshatra override only when known, confidence disclosure; city selection + permission optional, no forced geolocation. Birth-details edit flow with explicit invalidation/controlled generation. First insight available as soon as its generation phase is verified.
3. **Generation:** honest phase-specific progress and coverage; no frontend 'ready' if 16/30, or 0/8. Resume idempotently after tab closure, no duplicate concurrent jobs. New accounts land on Decode; return users land on Today.
4. **Decode:** source-backed memorable portrait; personal differences, strengths, watchouts and all six domain reports in structured reading; work-money, relationship and stress patterns; natal details and confidence in 'why' expansion; lucky traditions accessible but not redundant; chart-specific share composer and CTA to current Life Map. No fabricated user events.
5. **Life Map index:** Past / Now / Ahead rail with 25 chapters and clear active period; current hero and future transition; accessible chapter selection with chronological integrity, no fictitious dates, preview/pro gate without leaking masked reading text.
6. **Life chapter detail:** keep full `sentences`, `highlight`, `evidenceLine`, lords; reveal `focusAreas`, `pressureThemes`, `domainLenses`, `transitionNote`, phase stage; branch links to Today/Ask; optionally word potential events as unverified interpretations. No journal/feedback fields in VNext.
7. **Today:** correctly localized date/city, one genuine dated insight, important deterministic factors and their changes, concise current-chapter excerpt, nearest **future** verified good/caution interval, better-for/careful, all detailed windows, traditional basis (Tithi, Nakshatra, Yoga, Karana, Vara, Tarabala/Chandrabala only when supportable), optional remedies, lucky details, 7-day outlook/this month, contextual Timing/Ask CTA. Distinguish editorial vs deterministic fallback; preserve full content in expanders, not cut. Handle past/end-of-day windows honestly.
8. **Timing:** 'Check a date' and 'Find a date'; 12 existing purpose IDs and human-readable localized labels; selected current city/timezone, date picker, compare 7/14/30 and staged 90-day mode with bounded deterministic computation; matching/cautions/limitations based on purpose rule factors; candidate dates, exact windows, factor details, compare view, appropriate `limited_assessment` where comprehensive Muhurta not implemented, save/share/remind CTA; no false score or guaranteed outcome. Compare must not silently use another chart.
9. **Ask:** free tier = existing four precomputed domain templates + only supported fact-based rules, clear unsupported-query state, no vague response pretending to answer arbitrary free text. Paid = genuinely dynamic, context-bounded question answer using permitted chart/period/timing facts, no factual claims about the user's actual life without input, quotas and billing. Restore prior persisted chats from 8 existing DB sessions; support delete and return, timezone and language; handle errors and keyboard on mobile.
10. **Friend / Partner:** accessible entry beyond Settings, separate chart management, no unconsented sharing. Deterministic compatibility preview from actual valid birth details; full report with explanation only when supported by calculations and entitlement; compare rule confidence for missing exact birth times. Never re-label a partner's solo Decode as a compatibility assessment. Switching user/chart clears all private caches and pending requests.
11. **Traditions & Practices:** lucky colors/numbers/days; traditional optional remedies and practical reset habits visibly distinguished, source/meaning and safe caveats. No streaks, guilt, fabricated outcomes or adherence tracking.
12. **Saved Plans:** minimal plan saved from Timing with purpose, event date, city, chosen calculated window, rule method and optional reminder. Allow edit/delete, future and archived views. This is utility storage, **not user feedback/journaling**. If plans are deferred, do not present a non-functional Save button.
13. **Share Composer:** render existing approved template fields; gold editorial imagery, per-language share copy, redacted preview, Web Share API with copy fallback, link/OG deep-link rules; hide private data by default and never regenerate LLM for sharing.
14. **Settings / Billing / Legal:** account birth details and corrections, locale, current city, chart profiles, notification consent, data export/deletion flow, subscription state from server, full legal/disclaimer. The PWA must have a verified web payment/access flow before claiming Pro purchasing works; retain existing entitlement integration where supported rather than porting mobile RevenueCat assumptions blindly.
15. **Notifications:** user opt-in, per-type controls, timezone-safe schedule, actual push subscription and service-worker handling, and meaningful event triggers only. Existing local `setTimeout` alerts are foreground best-effort, not dependable background push. Implement Web Push only after permission and verified dispatch; record sent/failed results; dedupe notifications across locale and recalculation; do not imply that all 129 rows were delivered.
16. **PWA lifecycle:** manifest/standalone/install UX, offline *safe shell* (never public-cache private dossier), update handling, app launch performance, safe-area/keyboard interactions, optional A2HS, permission/state fallbacks, mobile accessibility. Protect authenticated routes, prevent cached user-data cross-contamination, secure browser storage and logout.
17. **Language/UI polish:** complete English/Telugu/Hindi chrome; current code has English-only Decode/Life and purpose labels. Respect font rendering, glyph fallback, word breaks, 320/360/390px mobile, and dynamic text size. Same dates and factual claims across languages, translated wording only changes expression, not facts.

## E. Retention in VNext — with ZERO recurring free AI

Primary recurring loop: **Today** changes through daily calculated factors + prewritten or rule-based explanations; **Timing** serves a live choice of a future date; **My Plans** retains event/date and future reminder; **Week Ahead** previews upcoming factors and saved plans; **Ask** draws on a finite answered template library for free users; **Partner** offers a useful deterministic comparison. Decode / Life Map stay high-quality evergreen references, surfaced contextually rather than misleadingly rewritten.

Do **not** add longitudinal feedback, 'is this me' surveys, journal memories, user-goal coaching, engagement scores or emotionally manipulative streaks until V2. Basic event instrumentation is allowed to determine quality and return-use patterns, without unnecessarily tracking private personal content.

## F. Backend and data engineering work packages

**BE-01 Contracts and truth labels.** Versioned API for complete dossier, day, week, month, purpose compare, Ask, chart comparison, plan and push. One typed truth source for date, locale, location, chart profile, provenance. No untyped parallel camelCase/snake_case drift. Partial-data flags returned honestly.

**BE-02 Generation budget and job lifecycle.** Initial generation guarded by unique user+birth input+fact signature+language+pack schema, concurrency lock and cost budget; phased resumes; separate read path; no provider calls inside `today_get`, `weekly_get`, `monthly_get`, deterministic purpose, free Ask, chart list, locale switch, share, push schedule. Keep audit-friendly token/currency/latency logs.

**BE-03 Verify and repair existing pack.** Coverage validation (`30/8/12/25` for fresh full packs); JSON schema; semantic novelty; language consistency; evidence/fact signature per card; exact time check; lock down faulty first-card fallback. Keep partial packs usable but truthfully labeled.

**BE-04 Calculation quality.** Verify sunrise, date/timezone, sidereal method, five Panchanga factors, transition times, Rahu/other windows and user-specific factors against trusted documented reference samples across cities/dates/DST boundaries. Purpose-specific grades have explicit rule tables, avoid claiming comprehensive wedding/property Muhurta when only general criteria exist. Precompute/call deterministic JS without LLM.

**BE-05 Data model.** Idempotent `saved_plans`, optional `push_subscriptions` and push-attempt records (RLS/ownership, token handling, revocation); no `user_feedback` migration. Clear old expired schedules. Data-minimizing event instrumentation and job spend logs. Snapshot schema and backfill safely with migrations; never wipe/rewrite existing packs by default.

**BE-06 Geocoding.** Production logged 20 coordinate-resolution failures October 19–20. Validate lat/lng and derive timezone without requiring successful reverse-city-label lookup; use explicit city selection as alternative. Cache geocoding appropriately, handle Nominatim quotas/errors and international coordinate/timezone rules. Never fake GPS or fallback to unrelated city for individual times.

**BE-07 Security/entitlements.** Auth checked on every sensitive API; RLS for all new tables; chart ownership and IDOR tests; free and paid checks on backend, no client-only paywall; refund/revoke handling; API input validation; abuse limits and secret privacy. Per-user data isolated by auth ID in all frontend caches, not just locale+chart profile.

**BE-08 Content masking.** Explicit free previews and locked metadata without leaking underlying paid full body in client JSON. Avoid pretending masked/partial text is a complete reading. Paid Ask usage separately measured and billed against entitlement.

## G. Frontend work packages

- PWA-01: end-to-end design token/typography/components/safe-area polish; consistent editorial hierarchy, correct empty/loading/error states, responsive mobile.
- PWA-02: complete pack view model and date-scoped selectors; dedupe/merge authority; validate types and render every useful structured field.
- PWA-03: full Decode, Life Map, Today, Timing and Ask flows described above, including navigational cross-links.
- PWA-04: Traditions, Plan board, Partner comparison, Share Composer, premium CTA and Settings complete.
- PWA-05: correct local dates and window selection. Note existing `new Date().toISOString().slice(0,10)` is UTC, not the profile timezone. Correct month/week display and locale-specific rendering.
- PWA-06: auth and cache correctness; abort stale loads after chart/locale/profile switch; store private data only within user-scoped storage policy and wipe on sign-out.
- PWA-07: PWA install, offline shell, service worker, Web Push subscription, version-update UX; progressive enhancement for unsupported platforms.
- PWA-08: PWA release CI: remove `typescript.ignoreBuildErrors`, enable `tsc --noEmit`, ESLint, unit tests, backend contract tests, mobile Playwright signed-in flows, build and Lighthouse/axe budgets.

## H. Mandatory end-to-end acceptance tests

1. **Zero free revisit LLM cost:** 100 repeated visits to each tab plus free Ask template, date checks and location updates produce zero provider generation calls after initial pack.
2. **One generation job:** 5 simultaneous onboarding attempts and browser resumes produce at most one completed generation for the same user+fact signature+language; all retries read or resume it.
3. **No fabricated dated copy:** absent date -> accurate deterministic fallback, never another date's `today_cards`/`weekly_cards`/`monthly_cards` body or clock times. Test pack coverage exhaustion on day 31 and month transitions.
4. **Facts and time:** timestamps/dates correct across IST midnight, cities across timezones, DST dates, leap days and large time offsets; good/caution window status is based on clock and timezone and never labels elapsed slots as next.
5. **Pack quality:** fresh pack needs all expected keys and distinct meaningful messages; incomplete existing packs are labeled partial; special source contradictions trigger graceful fallback. Same raw celestial facts across en/te/hi.
6. **All fields showcased:** no unused high-value `me_profile`, journey phase, remedy, domain, life event, sharing and horizon section without deliberate placement or explicitly documented exclusion.
7. **Paywall/security:** no unauthorized paid body/API, no unauthorized chart reads, no cross-account local cache leak, no unexpected LLM invocation from unpaid/anonymous users. Paid Ask budgets and rate limits enforced server-side.
8. **Reliability:** geocoder external outage, browser no GPS permission, no Web Push, offline/reconnect, old service worker and saved plan migration do not break core screens.
9. **Mobile design:** Pixel and smaller 320/360/390 widths, Android Chrome, iOS Safari installed mode, soft keyboard / TalkBack or VoiceOver / 200% text sizing where practical, dark system preference, reduced motion. Golden Editorial styles maintain contrast.
10. **Product regressions:** all 12 purpose types work, all original details remain available, 25 Life Map chapters navigable, free Ask answers only when relevant, saved plans persist, real notifications status is observable, share previews are private-safe.
11. **Release gates:** typecheck+lint+unit+backend Deno tests+schema/RLS+authenticated Playwright+cross-locale smoke+cost instrumentation clean before deploying. No release based only on Vercel `READY`.

## I. Deploy both FE and BE safely — implementation order

1. Freeze `main` baseline and capture existing production Edge Function v126 bundle and DB schema. Back up data and record old Vercel deployment, current function versions and relevant policies. Feature flags default OFF for behavioral changes.
2. Create dedicated Git branch and PR for backwards-compatible backend contracts, deterministic selectors, budget guard and data migrations. **Do not use staging `muhurtha-api-vnext` v2 as a replacement for production v126**: verify all changed module hashes/dependency import graph and rebase onto current production behavior.
3. Run read-only tests first, then migrations with least privileges and verified RLS; backfill old content preserving original text; deploy new staging Edge function; authenticated test account with precise-date fixtures.
4. Implement and validate PWA against staging API via environment configuration. Ship main screens, secondary screens, gating and i18n with no removed content. Add release CI and visual snapshots. Confirm zero LLM calls for free repeat use.
5. Run staging sign-in/onboarding, pack generation/restart, Today by date, 7/14/30/90 Timing, Ask free+paid, friend chart, save/share, push subscription and subscription gating. Monitor cost and errors.
6. Deploy **backwards-compatible BE first** to production, feature flags OFF; verify function version, existing Flutter/API consumers and user data are unaffected. Then deploy PWA via Vercel canary/preview, validate signed-in flows; gradually enable flags. Use promotion/rollback capability and compare production telemetry to baseline.
7. Set launch thresholds: successful onboarding, complete controlled generation, zero unexpected free provider calls, correct daily dates/times, no known P0 security/privacy failure, no unhandled location/Purpose ID errors, no broken locale or web push claims. Confirm privacy/legal, public domain reachability and masked paid content. Record final function and Vercel SHA and smoke logs.
8. Rollback: keep previous Edge Function artifact and deployed Vercel build, disable new behaviors independently, use additive schema changes so rollback does not need destructive migration. Do not delete saved charts, birth dossiers or messages.

## J. Explicitly deferred to V2 (per user decision)

- Personal feedback like 'that fits/doesn't fit', collecting real-life event confirmations, reinterpretations from feedback, diaries, journaling, progress/streak trackers, automatic goals learned from chats, user-validated predictions.
- Dynamic AI updates to free daily readings, unmetered partner dossiers, automatic translation generations on every language switch, 30-day dossier re-creation and notifications driven by speculative claims.
- Optional premium features not supported by verified chart rules; do not ship new false-precision interpretations merely to fill space.

## K. Final success definition

- Every core tab is clearly different and **all existing user-valued content remains findable**.
- A user's first free dossier generation is the only default LLM work. A 30-day expired calendar never triggers silent new free model spend.
- Readings use actual chart/period facts, dates and chosen local city, with traceable traditional interpretation vs verified calculation distinctions.
- Every dated recommendation has a valid source, a relevant date, a meaningful action (view, compare, save, share or ask), and honest limitations.
- Frontend and backend are version compatible, QA tested and visibly reachable for invited users; no developer can confuse a green deploy with a proven functional release.

**Source paths:** `pwa/src/app/(app)/...`, `pwa/src/context/app-data-context.tsx`, `pwa/src/lib/birth-pack-views.ts`, `pwa/src/lib/engine-cache.ts`, `pwa/src/lib/timing-notifications.ts`, `supabase/functions/muhurtha-api/{engine.ts,birth_pack_multiturn.ts,birth_intelligence_pack.ts,panchanga.ts}`, and current Supabase schema/aggregated records.

## L. NEW VNext requirement — ELI15 Jyotish Explanations (required, not V2)

### L1. Product objective, boundaries, zero-AI rule

Every visible Jyotish symbol, planet, planetary period, Nakshatra, Rashi and timing factor must make sense to a first-time Indian user. Do this in-context in the existing five tabs; do not add a compulsory learning course, large separate tab or extra LLM calls. Explanations are authored, translated, versioned, reviewed template content plus deterministic calculation values and the first generated birth dossier. Target: a user can answer 'what does that mean, why is it on my screen, and what information did we use?' without opening Ask.

**Critical epistemic split:** (1) Calculated calendar/birth-chart facts; (2) traditional symbolic associations; (3) conditional personal interpretation. Never present symbolic associations as scientifically demonstrated planet-caused outcomes. Do not claim rules the engine never computed. Disclaimers should be brief, accessible at the point of claim, and serious for health/legal/finance/marriage.

### L2. The universal three-level explainer

- **Level 0: Default human interpretation (12–22 words):** one clear thought, no unexplained jargon. Example: `Your larger Guru period is associated with guidance and growth; the smaller Budha phase highlights analysis and communication.` Use conditional wording.
- **Level 1: Tap 'Why this?' (50–110 words):** expandable bottom sheet showing 'What is it?', 'Why does it apply here?', 'What is calculated?', 'What is traditional?', 'How could this matter?', and 'What we did not assess.' Show a link to relevant chart/period/date; no duplicate hero paragraph.
- **Level 2: 'See calculation' (only for interested users):** verified input source, date/time/location, rule IDs, exact birth precision, Moon longitude or Nakshatra where available, calculated period boundaries, sunrise-based day facts, factor status, next transition, limits, engine/knowledge version. Do not expose secrets or precision if source precision is insufficient.

Keep stable copy in the user-selected English/Telugu/Hindi locale. Preserve source-language Sanskrit/Telugu planet name plus plain-language label. Use keyed glossary definitions, semantic-role examples and transparent fallback 'Not assessed'; no invented detail.

### L3. Knowledge model — authored and reviewed once

A single versioned explanation catalog with IDs, locale translations, concise meaning, illustrative analogy, what-we-can-calculate, positive/negative nuance, common misconception, 'not a guarantee' caveat, and deep links:
- Nine grahas (Sun/Surya, Moon/Chandra, Mars/Kuja, Mercury/Budha, Jupiter/Guru, Venus/Shukra, Saturn/Shani, Rahu, Ketu). Rahu/Ketu are nodes, not physical planets.
- 12 rashis; 27 Nakshatras (including local spelling aliases); 12 house labels only when actual evaluated house data exists.
- Dasha, Mahadasha (major life period), Antardasha (period within it), timeline transitions, Nakshatra pada, birth-time precision.
- Panchanga five factors: Tithi (Sun/Moon angular separation), Nakshatra (Moon's sidereal segment), Yoga (Sun/Moon longitude sum), Karana (half-Tithi), Vara (weekday), sunrise-based local reckoning.
- Derived factors: Tarabala, Chandrabala, and general daylight/caution windows including Rahu Kalam, Yamagandam, Gulika; clarify they are not guaranteed event-success ratings or full specialized Muhurtas.
- Make one canonical role glossary and re-use across Decode, Life Map, Today, Timing, Ask, partner chart, share cards and notifications. Avoid building 25 slightly different 'Guru means growth' definitions.

### L4. Fact-to-explanation contract (zero generated-on-open prose)

The backend must provide an inspectable typed `ExplanationTrace` for each presented interpretation:
- `claim_id`, `scope`, `locale`, `method`, `rule_ids`, `inputs` (non-sensitive display-safe), `calculated_facts` with dates/timezones/units, `traditional_rule_links`, `summary_template_id`, `renderable_args`, `limitations`, `precision`, `is_personalized`, `provenance` and versions.
- Canonical planet and zodiac keys, not free-text aliases. Server never invents computed facts via LLM.
- Frontend uses deterministic locale templates to render the explanation. Each important headline has a source trace, otherwise mark it a **general traditional description** and do not pretend it is individualized.
- No LLM needed to explain a computed `mahadashaLord`/`antardashaLord`, `panchanga` factor, sunrise window, `tarabala` or `chandrabala`. Optional initial onboarding LLM can help word unique interpretations from a checked whitelist of traceable facts, but display must not depend on more AI.
- Critical: Current personalization kernel primarily maps Nakshatra archetypes + period lords to themes, not a comprehensive house/aspect/dignity/strength judgment. Don't claim house lordship, conjunctions, aspects, exaltation, yogas/doshas or planetary 'strength' unless the engine actually computes and validates that exact rule. `engine_mode=full_chart` is not proof each factor was computed.
- Distinguish a user's **birth Moon / birth Nakshatra** from **today's Moon / today's Nakshatra** and period rulers; they are different things.

### L5. Screen-by-screen placement

- **Welcome/Onboarding:** optional two-sentence 'How Muhurta works': chart from provided birth facts, Jyotish tradition reads patterns/periods, date+location give Panchanga; precise birth time affects detail. No blocking tutorial.
- **Decode:** show 'Your birth Moon' and 'What that symbolizes'; `What we calculated / what we interpret` sheet, with specific birth source precision. Give the first-time user a mini key to Graha/Rashi/Nakshatra and source facts; not a long horoscope appendix.
- **Life Map:** beneath major-period and sub-period names show human-readable `Big chapter` / `Current subchapter` and a combined meaning. Include why dates are based on the Moon's birth Nakshatra, and transparent actual start/end. 'What changed from previous phase' uses stored `transitionNote` where grounded. Existing `evidenceLine` becomes 'Traditional reasoning' only after validation and repair. Keep all 25 chapters.
- **Today:** display five Panchanga factors as compact, human-labeled expandable items. One default 'What changed vs yesterday' only if checked deterministic differences exist; show real transition times. Show difference between 30-day pre-generated editorial card and live calculated local Panchanga. Distinguish generic favorable daylight vs individual activity-specific recommendation.
- **Timing:** every factor row has `what it means`, `how it was calculated`, `how it affected the rule`, and caveats; never show unexplained green/red matching scores. Explain Rahu Kalam as a traditional interval avoided for certain new beginnings, not a disaster window, and label generic vs specialist Muhurta.
- **Ask:** free follow-up `Explain this to me` resolves specific verified claim ID from catalog and templates, not another quota-consuming AI prompt. Existing open-ended free Ask cap is preserved; optional paid Ask can go deeper with model metering.
- **Friend/Partner:** explain which person's birth profile and which comparison rules were actually used; no compatibility percentage or joint effect without separately reviewed rules. Respect consent and privacy.
- **Notifications/Share:** simple benefit first, then optional explanatory link; avoid ominous claims, unexplained planet abbreviations and exposing sensitive chart information.

### L6. Quality and localization acceptance gates

1. All 9 grahas, 27 Nakshatras, 12 Rashi aliases, all 5 Panchanga Angas, Dasha/Antardasha, Tarabala/Chandrabala, and timing-window labels have clean English, Telugu and Hindi human explanations; no transliterated English masquerading as translated natural-language copy.
2. Every shown personalized reason maps to one of the **actually computed** input facts and rule IDs. Test 'unknown birth time', unknown birth Nakshatra, GPS blocked, no current city, chart switched, timezone edge, phase boundary, missing stored card, specialist activity; no invented explanation.
3. Static/curated source text never changes on reload and never invokes provider APIs. FREE returning-user runtime LLM usage = 0.
4. Two different readers can see the same Guru glossary definition but their selected birth profile, running period and dates remain distinct; no cross-account leaks.
5. Talk-back/screen reader can read all symbols by localized human names (avoid presenting a bare decorative Unicode glyph as the accessible label). Motion/gradients do not obstruct readability. Every `Why this?` works on 360px phone with keyboard/back navigation.
6. Assert no claim such as 'Guru guarantees money', 'Rahu brings harm', 'good window ensures success', 'all planets positioned strongly' is produced from a generic symbol lookup.
7. Run expert review of calculation rules and localized copy. Cross-check Pune/Hyderabad/Delhi/reference fixtures with trusted location-specific Panchanga references; explicitly document any agreed methodological differences rather than quietly forcing a match.

### L7. Implementation placement and rollout

Add a small static/reviewed `jyotish-explainers` knowledge package and an explanation trace serializer in the backend. Reuse existing `pwa/src/design-system/graha.ts`, `lord-medallion.tsx`, `chapter-hero-card.tsx`, `birth-pack-views.ts`, `panchanga.ts`, `vimshottari.ts`, `vedic_labels.ts`, `personalization_kernel.ts` and the location-aware `today_get/purpose_check`. Avoid a new independent LLM pipeline or separate database of generated explanations. Add the universal tooltip/sheet component and integrate the five core screens; maintain backwards-compatible API fields. Promote with BE compatibility tests, FE accessible interactions and a feature-flag canary. The explanation system is required for VNext release, while user feedback and journaling remain deferred to V2.

### L8. Additional audit guardrail — generic lucky associations are not personalized calculations

`supabase/functions/muhurtha-api/vedic_labels.ts` defines `RASHI_STATS` values for lucky numbers, days and colors by Rashi as a static lookup, not as a person-specific full-chart calculation. Render these as **traditional sign associations** rather than individualized 'calculated lucky results'. The same file also carries Western zodiac date ranges and sign metadata; keep tropical Western Sun-sign conventions strictly separate from sidereal Jyotish Rashi/natal Moon calculations. The first-time user must know exactly which Rashi is being shown (Janma/Chandra, Lagna, or current transit). When Lagna/house/aspects or planetary strength are not computed, say 'not assessed' rather than generating a plausible story.
