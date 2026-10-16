# Muhūrta: 10× Code, Data, Content and Screen Audit

**Review date:** 16 October 2026 (IST)  
**Repository:** `prasanthkuna/muhurtha` @ `436660c44a86f6e6f382b1a67363a540975ed62b` (2026-10-16 15:04:38 UTC)  
**Live project:** Supabase `muhurtha`, reference `kdngizqrybkrckvphyin`, active Edge Function `muhurtha-api` v121.  
**Method:** Read-only GitHub source and live Supabase metadata, aggregates, and limited redacted/generated content inspection. No production mutation. Actual screenshots and compiled-device UI were not visually validated in this review. One pack and one test-like user cannot establish population-level effectiveness.

## Executive decision

**Do not build more generic cards or immediately regenerate the entire pack.** Treat the current product as a strong data foundation with weak projection, editorial differentiation, and journey continuity. Implement a screen-ownership/content-eligibility layer and restore meaningful progression: **Decode = identity, Life Map = chronological story, Today = today's relevant reading, Timing = specific purpose/date, Ask = contextual follow-up.** Use deep links between them; do not render the same explanation in multiple tabs.

Golden Editorial (warm ivory, ink, antique gold) is already in source. The next gains require removing low-contrast legacy aliases, simplifying duplication, deriving real evidence drawers, displaying existing detailed fields, and improving the generated narrative. Avoid introducing more animations to disguise thin content.

## Verified live data snapshot

| Item | Live evidence | Product implication |
|---|---|---|
| Birth pack | 1, status `ready`, generated date 2026-10-16, locale `en`, model `gpt-5.4-mini` | Only one candidate for editorial inspection; no generalization to Indian audience |
| Daily cards | **16** dates, 2026-10-16 to 2026-10-31 | The LLM schema requests **30**; explicit quality log: `today_cards expected 30, got 16` |
| Weekly / monthly | **8 / 12** cards | Plenty of content but duplicated themes; treat as outlook, not purpose-specific Muhurtha |
| Journey | **25** phases and **25** phase facts | Strong backbone for a chapter explorer |
| Current life map | **8 past, 1 current, 16 future** | Lead with current and significant past, not first chronological row |
| Future access | **15** journey phases marked `proLocked` | Show authentic preview of near future and clear entitlement boundaries |
| Journey richness | 25 `evidenceLine`, 25 `shareHook`, 25 `phasePulse`; **0 populated `subPhases`** | Render evidence and chapter action; do not promise subphase drill-down yet |
| Category reports | **6** (career, money, business, relationships, family, health routine) | Underused source for Decode's optional domain explorations |
| Possible life events | **5** inferred themes | Optional past-reflection questions only, not assertions of what happened |
| Generated share concepts | **4**; one persisted share card (journey phase) | Share infrastructure exists, but no evidence of product-market-fit or a good gallery |
| Ask | 4 prewritten prompts; **0** chat messages and **0** chat sessions | Do not claim demonstrated chat-memory engagement |
| Remedies | 3 remedy cards, 3 remedy pack entries, `remedy_catalog` has 0 rows | Secondary optional practice; don't lead the daily screen with weakly contextualized ritual |
| Chart run | One `full_chart`, `complete`, `confidence_label` and `confidence_score` null | Never invent an accuracy percentage |
| Notifications | 21 generated schedule rows | Permission needs to be user-initiated and contextual |
| Activity | Single-user/small sample: 19 `today_opened`, 12 `life_map_opened`, 7 `chapter_opened`, 1 `share_completed` (Oct 16) | Instrumentation test evidence, NOT retention or share-rate evidence |

### Significant correctness issue

`birth_pack_multiturn.ts` instructs generation of 30 daily entries and `validateBirthPackContent` checks exact daily count. On 16 Oct the backend logged `birth_pack_quality_failed` with `today_cards expected 30, got 16`; later the live record was marked `ready` and all five screens were marked ready. This may reflect deliberate relaxed serving, but **readiness != completeness**. Introduce separate fields `available_screens`, `completed_components`, `date_coverage`, `quality_warnings`, `full_pack_complete`, `generated_at`, `model_version`, and `facts_version`. Make display resilient to partial coverage without silently marking a 16/30 calendar complete. Reconcile generation locking, retries and versioning. Show only actual available dates; never fill missing days with recycled prose.

## Redundancy audit (direct code evidence)

| Severity | Location | Current pattern | Remedy |
|---|---|---|---|
| **P0** | `_TodayFocusTab` in `home_shell.dart` | `MuhTimingSplit` renders both window types, followed by `TimeWindowRail` for good and caution, then separate `betterFor` and `carefulWith` sections | Hero = one insight; one compact next usable window; a single expandable window timeline and action/caution note; no duplicate rails |
| **P0** | `_TimingTab` | Displays week/month prose sourced from `horizons`/`timing_plan`, not an evaluated selected purpose | Redesign Timing as purpose/date/location → engine evaluation → candidate windows/rules → save/plan; move week/month overview to Today or an Outlook drill-down |
| **P0** | Today purpose selection | `_selectedPurpose` is local; CTA routes to `/home?tab=timing` without forwarding purpose | Pass typed purpose through route/provider and launch a relevant timing analysis; persist purpose and planned date only with consent |
| **P0** | `DecodeEditorialTab` | `MuhWhyDrawer.show(plain: identitySummary, traditional: views.identitySummary)` sends the exact same string twice | Only show a traditional evidence section when actual chart factors/evidence are available; attach fact IDs, source method and input limitations |
| **P0** | Light theme vs legacy components | `MuhColors.goldSoft` now equals pale `goldWash`; old `celestial_components`, `lucky_strip` and `share_story_card` still use it as foreground | Replace legacy aliases with semantic surface/foreground tokens; audit actual contrast, especially sharing/export flows |
| **P0** | Pack readiness | `BirthPackPayloadReadiness.isScreenReady` accepts `isGenerating` after any LLM body; live pack marked `ready` with 16/30 days | Separate usable partial content from final pack completeness; distinguish visible states and report generation warnings |
| **P1** | `LifeAtlasTab` | Defaults selection to the **first** chronological chapter, not current; only renders title + highlight/sentences | Default current chapter; show years rail/chapters grouped Past, Now, Ahead; support evidence, domain lenses, transitions and share |
| **P1** | `LifeAtlasTab` | On selecting another chapter, analytics sends `chapterPhase: tense` captured from previous selection | Derive event phase from the newly selected item; add safe stable chapter ID; never log full personal text |
| **P1** | `BirthPackViews` | `journey_phases` takes precedence and only projects `highlight` + `sentences`, dropping rich period facts; `life_map` acts as fallback | Build one canonical `ChapterPresentation` merging keyed data and deduping by factual period ID; preserve distinction between narration and evidence |
| **P1** | `DecodeEditorialTab` | Identity summary appears in subtitle and potentially in the "Why" drawer; domain reports never become a dedicated exploration | One short portrait hero, one reflected trait, a chart snapshot, domain-exploration entry points, proper Why trace |
| **P1** | `BirthPackViews` | `user_identity`, `me_profile`, `free_preview` duplicate roles, `horizons`, `timing_plan`, range cards duplicate time scopes | Normalize all into canonical schemas after generation; mark one canonical owner + references, not competing fallback copies |
| **P1** | `UserEngagementStore` | Local `SharedPreferences` maps keyed only by content/date/period; not profile-specific, not consent-synced to AI context | Namespace by user/chart/fact version; protect sensitive reflections; optional server sync with consent; stop cross-profile bleed |
| **P1** | `HomeShell` | Query-driven tab selection + `AnimatedSwitcher` and keyed subtree can lose local scroll/chat state | Persistent tab navigator/IndexedStack with appropriate lazy retention and restoration; deep-link state always authoritative |
| **P1** | `_AskTab` | Renders one answer, no visible history; local `_sessionId` can be lost on tab rebuild; output forces timing fields for broad questions | Session list + answer threads, intent-specific response layouts and evidence deep links; persist session ID safely |
| **P1** | Timing plan save | Hardcoded key `timing-plan-${pack.date}`, purpose `timing_plan`, no selected date/window | Persist actual purpose, evaluated window, location, version, note and optional reminder; make edit/cancel visible |
| **P1** | First-insight events | `firstInsightViewed` logged when widget's data builds; not necessarily meaningfully viewed; session flag global on device | Track actual visibility and time-to-insight, per profile; avoid counting rebuilt widgets repeatedly |
| **P1** | Current pack narrative | Daily/weekly/monthly bodies reuse `practical`, `finish`, `cleanup`, `work` motifs | Generation and post-generation semantic-dedupe across horizons, with evidence-aware variation |
| **P2** | LuckyStrip and ritual | Peripheral elements compete with the personal reading; limited explanatory grounding | Move to optional "Traditions & practice" drawer with origin/why; never imply guaranteed effects |
| **P2** | Ask suggested prompts | Four repeated career/money/relationship/family prompts regardless of app journey | Suggestions from current phase, selected chapter, saved intention and last unanswered question; no facts invented |
| **P2** | ShareCard | Prewritten `share_hook` slogans weak; 4 pack concepts not surfaced as visual gallery | Curate specific consented chapter/identity/timing artifacts and render 3 sizes with a story/context link |

### The most underused fields

1. **`journey_phases[*].evidenceLine`** for factual Why drawers. Must validate whether it genuinely refers to supported chart factors; it is generated text and not itself independent astronomical proof.
2. **`journey_phases[*].phasePulse`, `transitionNote`, `focusAreas`, `pressureThemes`, `domainLenses`** for an interactive chapter, not seven separate cards.
3. **`category_reports.{career,money,business,relationship,family,health_routine}`** for optional Decode lenses and direct Ask handoff. Avoid repeating full reports inside Today and Life Map.
4. **`life_map` + `journey_phase_facts`** to identify past/current/future order and calculation-derived boundary labels; do not convert qualitative phases to a fake happiness graph.
5. **`likely_life_events`** as *questions for validation*, never known facts; record both matches and mismatches while preserving original claims.
6. **`share_cards`, `shareHook`** as candidate captions, not automatically approved assertions. Quality filter first.
7. **`today_cards[*].good_window_notes` / `caution_window_notes`** only where linkable to actual computed local timing windows. Do not mistake an LLM-authored timing note for a calculated time.

## Canonical screen architecture and proposed first viewport

### 1. Welcome & onboarding

**User question:** "Why should I spend time here?"  
**First viewport:** an understated Golden Editorial title; one example of a life chapter, explicitly marked sample; a single "Explore my story" CTA.  
**Input flow:** date/place/current city, optional exact/approximate/unknown time and nakshatra; chosen question/purpose late in onboarding; clear precision mode but no discouraging error wall.  
**Activation:** display the first **grounded** identity snippet immediately while phase generation continues. A subsequent past-chapter reflection is an optional trust check, not an event claim.  
**Avoid:** full-screen spinner dependency, exaggerated personal claims, long role surveys.  
**Outcome:** first usable insight viewed, elapsed time, onboarding completion, rationale expansion.

### 2. Decode = personal identity

**First viewport:** editorial hero with one insightful yet carefully grounded sentence; a one-line chart marker row; "Does this resonate?" interaction; "What shaped this?" link.  
**Below:** two contrasting aspects (strength and counter-pattern), six *optional* topic lenses powered by `category_reports`; avoid duplicating career and relationship prose in multiple parts of Decode.  
**Evidence drawer:** plain explanation / traditional chart factors / calculations and uncertainty where available. Never display the same summary in all sections.  
**Primary next step:** "See when this changed" deep-links to Life Map's current chapter.  
**Retention:** saved reading, updated interpretation if inputs change, user-invoked compare across previous chapters.  
**Data:** `me_profile`, `user_identity`, chart input/engine mode, `category_reports`, natal identifiers, optional `free_preview` only as fallback.  
**Important:** interpretation is based on a tradition, not an established personality test; no pseudoscientific percentage.

### 3. Life Map = chronology and meaning

**First viewport:** current chapter first, dated; three affordances "Past / Now / Ahead" and one legible rail.  
**Interaction:** tap a period → a full chapter using `title`, `highlight`, `sentences`, `focusAreas`, `transitionNote`, `phasePulse`, supported `evidenceLine`; rich content layered progressively, not presented as seven stacked cards.  
**Past:** optional feedback "Matches / Partly / Does not match / Timing differs" with preserved original statement. A user can privately add the actual event.  
**Current:** clear themes and transitions plus link to Today for concrete action.  
**Future:** transparent uncertainty and pro-entitlement, only a near-future preview before any upgrade ask. No unsupported exact claims.  
**Sharing:** one selected period, user preview and redaction controls.  
**Data:** 25 `journey_phases`, 25 `journey_phase_facts`, `life_map`, `current_phase`. `subPhases` currently empty; do not mock these.  
**Quality gate:** one phase ID from deterministic boundaries; guard against duplicate current and past records; do not default to earliest period.

### 4. Today = compact, worthwhile return

**First viewport:** daily one-line insight based on TODAY's card when present and eligible, the relevant current-period context summarized in one compact line, one selected-purposed CTA.  
**Secondary:** next evaluated local time slot + single disclosure for complete timeline, not two presentations of good/caution windows.  
**Optional accordion:** "This week" or "This month", using the already-precomputed range cards, **not** a near-identical second forecast at top of Timing.  
**Exclude by default:** LuckyStrip, full ritual card, duplicated `betterFor` lists and multiple window rails.  
**Return hook:** changed daily content with local date and next saved intention; show "No new interpretation" if deterministic context has not changed materially rather than manufacturing novelty.  
**Data:** deterministic `TodayPayload` + dated `today_cards`, `current_phase` and saved purpose. If the date is outside the 16 provided cards, show valid calculated windows and an honest limited narrative state.

### 5. Timing = real decision instrument

**First viewport:** "What are you planning?" + concrete purpose/date/location and any birth-input limitations.  
**After submit:** candidate time windows sorted by clearly specified Jyotish method, conflicting factors, what was checked, alternate dates where available, "Why?", save and share.  
**No result:** show unassessed / conflicting / no suitable result, not fake green.  
**Feedback:** a saved intention holds purpose, date, selected window, timezone, applied rule version, user note, and optional user-authorized reminder.  
**Data:** new purpose-evaluation request through deterministic engine. Weekly/monthly prose is optional supporting context, not the main screen.  
**Bug to fix:** Today currently selects a purpose then navigates to Timing without passing the purpose.

### 6. Ask = follow-up and context

**First viewport:** concise composer + 2–3 suggestions personalized from user-selected goals and currently selected chapter.  
**Answer types:** use distinct templates for `life_pattern`, `why_phase`, `purpose_timing`, `past_validation`, and general exploratory queries; never force "best time" on every question.  
**Context:** preserve active session across tab switches; show conversation threads and history. Use only user-authorized stored facts and validated deterministic factors.  
**Cross navigation:** a chapter response opens the chapter; a time response opens Timing with purpose and date; a personal-pattern response deep-links to Decode.  
**Quality:** visible provenance and limitations; user can mark helpful/not helpful without granting permission for covert prediction rewrites.  
**Data:** `ask_templates`, `ask_knowledge`, current pack, selected chapter, conversation session. Live DB has zero chat messages; test experience before claiming memory success.

### 7. Profile, settings, subscription

Allow birth precision improvement, language settings, active chart switching, reading/reflection review, sharing defaults, notification consent, export/delete. Profiles must scope local saved chapters, reflections and first-insight state. Subscription request should occur only at a demonstrated premium-value boundary, with an honest preview and functional purchase/restore flow. Don't block the first personalized insight with paywall.

### 8. Web/share destination

The share endpoint should show the exact user-approved excerpt in the matching golden editorial design, a "See your own story" CTA, proper mobile page and OG crop, and explicit privacy-safe metadata. Separate product landing `/` and legal pages from `/c/{id}`. The existing marketing URL defaults to the legal-site origin; validate where real `/c/{id}` routes resolve before rollout. Never expose birth time, precise place, hidden report or private questions in public OG tags. Add deep-link fallback and share revocation.

## LLM prompt change: create distinct assets, not generic prose volume

### Problem in current prompt

`birth_pack_multiturn.ts` sets a shared voice of **"a sharp Indian friend on WhatsApp: punchy, direct, scene-based"** across **identity, life history and day/weekly/monthly** material. Life chapters are constrained to two very short sentences; core prompts generate overlapping `user_identity`, `me_profile`, `free_preview`, and `category_reports`, while the playbook also generates `today_guidance`, `today_cards`, `timing_plan`, `horizons`, `weekly_cards`, `monthly_cards`, `ask_templates`, `share_cards`, and notifications. These structures reward output volume and make repeated pragmatic themes more likely.

In the one live pack all 36 daily+weekly+monthly bodies are textually distinct, but many repeat the same motifs. A direct keyword audit found:

| Horizon | Items | Contains "practical" | Contains clean/clear/cleanup | Contains work | Contains finish |
|---|---:|---:|---:|---:|---:|
| Daily | 16 | 5 | 2 | 5 | 3 |
| Weekly | 8 | 3 | 4 | 5 | 2 |
| Monthly | 12 | 3 | 4 | 8 | 1 |

These are overlapping word counts, not unique-item shares or semantic-similarity statistics, and cannot by themselves prove all writing is repetitive. However inspected examples show real thematic sameness across horizons.

### Proposed generation contracts

**A. Identity / Decode: one canonical portrait.** Generate one `identity_anchor` tied to known natal factors; `strength`, `counter_pattern`, `limit`, and 6 distinct optional domain interpretations. Each claim must have `source_fact_ids`, `confidence_kind` such as calculated/interpretive/user-reported, `birth_input_mode`, and `explanation`. Never infer events as facts. Style: calm, humane, personally coherent, no flattering universal statements.

**B. Life phases: evidence-backed chapter objects.** From deterministic `journey_phase_facts`, generate `headline`, `one_line`, `narrative` (70–130 words maximum on demand, not all in the initial viewport), `transition_from_previous`, `domain_focus`, `traditional_explanation`, and `share_candidate`. The chronology and phase dates are immutable engine inputs. Allow meaningful long-form interpretations instead of always two sentences. Never generate populated `subPhases` without genuine subphase facts.

**C. Daily: short editorial read, deterministic timing separate.** Generate a 10–18 word daily takeaway and at most 40 words of interpretive support **only if materially differentiated by day-specific underlying facts**. Timing values and rule conflicts always come from the evaluator, never the LLM. Generate 7-day chunks (or another validated batch size), track precise coverage and model costs. Do not substitute other days when generation misses a date.

**D. Weekly/monthly: changes across horizons.** Week should answer "What theme is developing over the next several days?" Month should answer "What longer chapter transition deserves attention?" Both use distinct source factors and time scale. Do not repeat daily advice in different words. If there is no new factor, say so.

**E. Ask: intent-based responder.** The result schema depends on question: `question_intent`, `direct_answer`, `factors`, `interpretation`, `limitation`, `optional_next_step`, `deep_link`. `best_time` appears only after a valid purpose/time evaluation. Inference based on user-report must be clearly labeled.

**F. Share: editorial candidate, not an oracle quote.** Input includes an approved grounded claim, meaningful context/date, sensitivity flag, preview copy, optional name visibility and a destination link. Rewrites cannot add new factual claims. Automatically exclude sensitive questions/private birth data unless the user explicitly authorizes publishing.

### Post-generation gate

For each asset check: JSON shape; date coverage; immutable fact match; chart precision; prohibited exact claims; locale/script; unsupported confidence percentages; semantic duplicates **across** daily, weekly, month and identity; tone specificity; share privacy; source trace and model version. Store rejection reason and optional safe replacement. Do not prompt regenerate the whole 43KB+ pack for a single weak section; regenerate the rejected segment with a stable fact set and hash. Expose `usable`, `complete`, `quality_warning` separately.

## Data architecture

Establish a thin canonical presentation layer in Flutter plus backend generated-asset metadata, without migrating all old JSON at once:

```text
BirthFact / PanchangaFact / PeriodFact / PurposeTimingFact / UserReportedFact
            ↓ immutable, method/version/input source
InterpretationCandidate {id, type, time_scope, topic, source_fact_ids, text,
  language, limitations, model_version, generation_status, quality_flags}
            ↓ deterministic eligibility + deduplication + screen ownership
PresentationAsset {screen, hero, secondary, why, related_deep_link, can_share}
            ↓
  Today | Life Map | Decode | Timing | Ask | Share
```

Define one primary home per content category. Keep older JSON projection adapters temporarily, but mark generated duplicates and remove them from the new UI instead of presenting all variants.

`UserEngagementStore` is currently local SharedPreferences and not keyed by account/chart. Implement namespaced `profileId + chartId + contentId + factsVersion` keys, appropriate privacy controls, and optional consent-based server sync; no sensitive data in analytics. Consent to store reflections is not consent to make them public.

## Golden Editorial design corrections

- Replace legacy aliases in visible widgets instead of pointing `goldSoft` to a pale background token and using it as foreground. In current code `celestial_components.dart`, `lucky_strip.dart` and `share_story_card.dart` still use `goldSoft` for text/symbols. Audit color contrast and screenshot exports across English/Telugu/Hindi.
- `MuhTheme.light()` computes `serifDisplay` and then calls `GoogleFonts.instrumentSansTextTheme(serifDisplay)`. Verify headline family in the resolved `ThemeData` and explicitly reapply display/headline serif roles after body typography to avoid accidental override.
- Limit one dominant headline per viewport and 1–2 actions. Keep hairline borders, light paper surfaces, 16–17 px body copy, consistent spacing and 44+ px touch targets.
- Avoid heavy motion on every scroll child. `HomeEditorialScroll` currently calls `.muhEnter` across its children; limit entrance motion to a few primary elements, preserve scroll positions, respect reduced motion, and profile on a mid-range Android device.
- Make a chapter's evidence drawer a functional trust tool, not another prose panel.
- Share art gets dark ink/gold as an intentionally separate export skin; the private reading stays ivory.

## Prioritized release plan and acceptance gates

### P0 — Product correctness and trust
1. Add independently tracked calendar completeness and provenance status. Test 16/30 partial vs 30/30 complete and actual coverage.
2. Remove duplicate Today rails and repeated action/caution blocks; keep one precise expandable timeline.
3. Fix purpose context transfer Today → Timing; make Timing do a real purpose/date evaluation, or label it "Outlook" until built.
4. Repair Why drawer: no duplicated paragraph represented as traditional factors. Render an actual trace or an honest limitation.
5. Fix low-contrast old gold text on ivory in screens, loading and share exports; verify by rendered screenshots.
6. Namespace reflections/exposures/saved plans by signed-in account and active chart; verify profile switching doesn't leak local history.

**Gate:** no contradictory time recommendation, no unverified explanation, no UI claim of 30-day coverage from 16 days; high contrast and readable locale samples.

### P1 — Showcase data we already own
1. Life Map current-first with period rail, dates, 25 phase selection, phase explanations, compact domain focus and user-controlled sharing. No fictitious subphases.
2. Decode uses six category reports as optional domain drill-down rather than reproducing headline and identity summaries.
3. Add optional five-item past-validation deck from `likely_life_events`; preserve original candidate wording and record mismatch.
4. Replace broad week/month prose in Timing with purpose engine; provide weekly/monthly digest only in an Outlook surface.
5. Add share gallery with 3 format templates for exact, approved insights, and a privacy-safe live share webpage.
6. Preserve tab state, Ask session, selected chapter and scroll after navigation.

**Gate:** 100% of important stored fields have a deliberate owner, no same prose displayed across tabs without meaningful framing, every share has a preview and a working destination.

### P2 — Tune the LLM and retention
1. Separate prompt voice by screen and enforce evidence grounding; reduce deterministic calendar prose generation burden.
2. Semantic duplicate scoring across generated horizons; targeted retry, versioned migrations for old packs.
3. Saved intention lifecycle: schedule, contextual notification opt-in, reflection, and return to same intent.
4. Ask follow-ups can resolve to target sections and preserve session state.
5. Run privacy-aware moderated usability sessions across varied birth-time knowledge and Indian languages. Test skeptics too.
6. Capture funnel events: content **visible**, first meaningful insight, phase explored, genuine timing evaluation, intention saved and revisited, share preview/open/completion, recipient opt-in, answer helpful. Report at cohort/user level only after enough users.

**Gate:** confirmed improvement in first meaningful-insight completion, 7-day meaningful-return cohort rate, and recipient activation, with qualitative trust and app performance guardrails. Do not set speculative percentage lifts as facts.

## Six experiments worth running

1. Current chapter first vs old earliest chapter on first Life Map visit.
2. Decode hero + three next-step links vs linear strengths/watchouts sections.
3. Today one window preview vs dual rails + long lists.
4. Real chapter image share vs generic share-hook aphorism.
5. Purpose evaluator vs week/month prose at Timing entry.
6. Reflection shown after reading a full past chapter vs immediately after identity headline.

Primary measurable outcomes: **first grounded interpretation consumed**, **meaningful-return D7** (a return with real engagement, not app-open only), and **share-recipient activation**. Guardrails: prompt and inference errors, report consent complaints, trust survey response, p95 time to usable insight, model cost per usable asset, unintended private-data exposure. Use A/B or matched comparison only with enough sample sizes to avoid overinterpreting one user's usage.

## Cursor/Codex implementation instruction

> Read this audit, `Muhurta_Golden_Editorial_Design_System_v1.md`, the repo's current `MUHURTA_DESIGN.md`, and `Muhurta_Retention_Engagement_Screenwise_Plan_v1.md`. Inspect the actual files and current deployment; do not assume old screens still exist. Perform P0 before P1; implement a canonical screen-to-content map and contract tests. Preserve deterministic Jyotish calculations, subscription infrastructure and RLS. Use real redacted test fixtures from the current pack (including 16/30 partial coverage). For every changed screen produce dark/light where applicable plus English/Telugu/Hindi golden screenshots, run `flutter analyze`, widget tests and app integration tests. Test real-device scroll and share-preview/export. Keep existing systems when correct, do not replace them with paid APIs. Report each verified fix, outstanding claims, tests, and any source-data quality flags. Do not deploy, migrate production data, overwrite a pack or change billing without explicit approval.

## Evidence links and limitations

- [Current GitHub commit](https://github.com/prasanthkuna/muhurtha/commit/436660c44a86f6e6f382b1a67363a540975ed62b)
- [Current home shell](https://github.com/prasanthkuna/muhurtha/blob/main/app/lib/features/home/home_shell.dart)
- [Decode editorial tab](https://github.com/prasanthkuna/muhurtha/blob/main/app/lib/features/home/tabs/decode_editorial_tab.dart)
- [Life Atlas tab](https://github.com/prasanthkuna/muhurtha/blob/main/app/lib/features/home/tabs/life_atlas_tab.dart)
- [BirthPackViews projection](https://github.com/prasanthkuna/muhurtha/blob/main/app/lib/core/data/birth_pack_views.dart)
- [BirthPackReadiness](https://github.com/prasanthkuna/muhurtha/blob/main/app/lib/core/data/birth_pack_readiness.dart)
- [Birth-pack prompt](https://github.com/prasanthkuna/muhurtha/blob/main/supabase/functions/muhurtha-api/birth_pack_multiturn.ts)
- [Birth-pack validation](https://github.com/prasanthkuna/muhurtha/blob/main/supabase/functions/muhurtha-api/birth_intelligence_pack.ts)
- [Golden Editorial palette](https://github.com/prasanthkuna/muhurtha/blob/main/app/lib/design_system/muhurta_colors.dart)

The repository includes `app/test/audit/flows/*.png` captures, but this review could not retrieve and visually inspect binary screenshots; color/visual findings reflect source styles and code-level contrast risk, not a verified rendered-device audit. Live dataset is one generated pack and limited developer-like usage. We did not change code, production rows, Edge Functions or subscriptions.
