# MUHŪRTA
## Retention, Engagement & Screen-by-Screen Product Specification

**Version:** 1.0  
**Date:** 16 October 2026  
**Companion document:** `Muhurta_Golden_Editorial_Design_System_v1.md`  
**Audience:** Product design, Flutter, Supabase, AI content, growth, and QA  
**Scope:** First session → personal recognition → recurring usefulness → deliberate sharing → recipient onboarding → paid value  
**Implementation state:** Proposed; this file does **not** mean the redesign is implemented.

> **North star:** Muhūrta becomes the place a person returns to understand *their own life chapters* and examine traditional Jyotish timing when a real decision is approaching. Retention must come from genuine usefulness, not manufactured anxiety, false precision, compulsory daily check-ins, or artificial streaks.

---

# 0. One-page executive decision

## 0.1 What we must change

**Old product tendency:** Horoscope feed + disconnected advice cards + technical timings + frequent share icons.  
**New product:** **A personal Jyotish life journal with three recurring jobs:**

1. **Understand myself** — Decode and past-life recognition.
2. **Understand my journey** — Life Atlas and current/coming chapters.
3. **Decide when and how to act** — Today, Timing, and Ask.

Sharing is a *fourth loop*, earned after a user finds an insight personally valuable.

**Design language:** Follow the companion Golden Editorial system: warm ivory canvas, antique gold used sparingly, editorial serif for readings, clean sans for interactions, restrained native motion. Do not reintroduce blue dashboard panels, five equal-weight tiles, 92%-style personality metrics, life-success curves, fake certainty, or blinking mystical effects.

## 0.2 The loops we are designing

| Loop | Trigger | Key screen | User receives | Return mechanism | Healthy success signal |
|---|---|---|---|---|---|
| **Recognition** | First use or meaningful personal question | Quick Proof → Decode | One specific, evidence-bounded interpretation | Explore next chapter; save reflection | Reading completed and voluntary chapter exploration |
| **Life exploration** | Curiosity about past/present/future | Life Map | A navigable story across genuine period boundaries | Saved chapter, upcoming transition, revisit an older reflection | Distinct chapters explored on separate occasions |
| **Planning** | Upcoming interview, travel, conversation, event | Today → Timing | Purpose-specific traditional timing and explanation | Saved intention and optional event reminder | Planned action reviewed/completed, not app minutes |
| **Consultation** | Question important to the user | Ask | A contextual answer based on available evidence | Saved question and useful follow-up | User marks the answer useful / acts on next step |
| **Social discovery** | User wants to share an insight | Story Gallery → Public preview | Beautiful redacted artifact | Recipient explores their own reading | Intentional shares and recipient-generated first insight |

**Do not build a social network inside Muhūrta.** Private personal reflection plus deliberate sharing is enough for V1.

## 0.3 Three product outcomes (primary KPIs)

1. **First-Session Meaningful Activation (FSMA):** Among newly registered users whose setup has begun, percentage who view at least one completed, eligible personal reading **and** voluntarily deepen it (open its basis, record a reflection, or explore a second chapter) within 24 hours. Track the simpler `first_insight_viewed` separately for diagnosis. Do not require positive feedback to count activation.
2. **D7 Meaningful Retention:** Among first-activated users, percentage who return on local day 7 (or in a separately reported day-7 window) **and** complete at least one real value action, such as reading a *different* chapter, evaluating a new purpose, revisiting a saved question, or reading a genuinely updated day/week. Distinguish plain session retention from meaningful retention.
3. **Qualified Shared Discovery:** The rate of intentional share-preview exports leading to an attributed recipient who views the actual public artifact and then generates an initial reading or opens the fictional demo. Count forwarding/recipient views separately; never equate tapping Share with successfully sharing.

**Guardrails:** content claim error/complaint rate; percent of users choosing 'doesn't match'; push opt-out/uninstall rate; latency/error rates; personal-data incidents; LLM cost per completed reading. Baselines and statistically useful targets are **unknown**; do not invent 30/40/70% targets.

---

# 1. Evidence, current code and critical blockers

This appendix uses **source inspection from 16 October 2026**. Re-check `main` and the live deployment before implementing. Source: [`prasanthkuna/muhurtha`](https://github.com/prasanthkuna/muhurtha) and the connected Supabase project `muhurtha`.

| Observed source | Current behavior | Why it harms long-term value | Priority |
|---|---|---|---|
| `app/lib/app/router.dart` | `/home` without a tab query defaults to Decode; explicit decode=0, today=1, life_map=2 | Returning daily users encounter an identity reading they already saw | **P0** |
| `app/lib/features/onboarding/quick_proof_screen.dart` | Full-screen loader for `.quickProofGenerate()` with a 60-second timeout | A user may abandon before seeing a single personal result | **P0** |
| `app/lib/features/home/home_shell.dart` | Decode begins with `_TestFriendInviteCard` when share copy exists; other sections also have share buttons | Asking for social distribution before delivering insight feels promotional | **P0** |
| `app/lib/core/notifications/muhurtha_notification_service.dart` | `syncNextWeek()` invokes a permission request and `cancelAll()`; home triggers synchronization when pack completes | Surprise notification requests and broad cancellation create friction | **P0** |
| `app/lib/core/analytics/app_analytics.dart` | `app_open`, onboarding steps, share taps/results, paywall view; no detailed reading-utility funnel | Cannot identify why someone engages, returns, or leaves | **P0** |
| `supabase/functions/muhurtha-api/birth_pack_multiturn.ts` | Three generation phases, concise WhatsApp-friend tone, many separate time-horizon cards | Personal prose can become compressed and repetitive | **P0/P1** |
| `supabase/functions/muhurtha-api/ask_pack.ts` | Pack-first Ask and generic fallback wording | Can answer fluently without the user's actual question being resolved | **P1** |
| Current pack record | Generation phases marked complete while pack status was `generating`; `today` not in ready list | Users may see indefinite loaders or missing screens despite available sections | **P0** |
| Current pack content | 25 journey phases; 16 daily, 8 weekly, 12 monthly cards; 6 category reports; 4 share candidates | Abundant material exists, but needs strong selection and differentiation | Opportunity |
| Connected tables | One birth pack, one share record, zero chat messages in observed sample | No empirical retention or social-conversion baseline yet | Measurement gap |

**Important:** The current code has infrastructure for chart profiles, referrals, local notifications, sharing, RevenueCat and personal narratives. Reuse it. Do **not** rebuild backend functionality simply to deliver the new design. Do not claim an interaction is already live merely because a source file exists.

---

# 2. Navigation and cross-screen experience model

## 2.1 First-session versus returning-session routing

### First session

`Welcome → very short birth basics → optional birth-time / Nakshatra → one relevance question → Quick Proof OR Decode first reveal → Life Atlas invitation → Today.`

- **No compulsory first share, notification grant, rating request, or paywall.**
- A first insight should be shown as soon as an eligible calculated/qualified result exists. If longer content is still generating, reveal the ready portion; don't fake a personal insight.
- Directly after the first insight, offer **Explore the chapter**, **Does this fit?**, or **Why this reading?** as the natural action.
- If personal calculation is unavailable, present a transparent but useful general Panchanga experience and let the user continue.

### Returning session

Default to **Today** with either (a) an actual new daily/weekly reading, (b) a recently saved intention, or (c) a prominent link to the current Life Map chapter. If no new content exists, acknowledge that rather than rewrapping the same statement in different words.

### Navigation order recommendation

**Today | Life Map | Decode | Timing | Ask**

- First session can *deep-link* directly into Decode regardless of the tab order.
- The selected bottom tab should persist. Returning from a share sheet or app background must restore scroll position, text input, chosen date, and chapter selection.
- Test whether five tabs are overwhelming on small Android devices. If an observational study shows misunderstanding, evaluate a four-tab variant where Timing is entered contextually from Today. Do not change the architecture merely on theory.

## 2.2 The three-second hierarchy rule

Every first viewport should answer:

1. **Why am I here?** One large sentence.
2. **What new thing is useful?** One meaningful result.
3. **What can I do next?** One obvious CTA.

Everything else belongs in secondary text, disclosure drawers, or below the fold. Promotional shares and paywalls never compete with the first insight.

## 2.3 Universal user state

Carry these lightweight user-approved fields across screens: `active_chart_profile`, `birth_input_mode`, `selected_language`, `primary_concern` if explicitly chosen, `selected_purpose`, `saved_intentions`, `past_reflections`, `content_last_seen`, `notification_preferences`, and `onboarding_stage`.

Distinguish **user-reported facts**, **computed Jyotish factors**, **interpreted possibilities**, and **editorial presentation** in the data model. Never silently convert interpretation into known biography.

---

# 3. Screen-by-screen retention specification

Each section states the *job*, *current pain*, *new layout*, *interactions*, *reason to return*, *sharing behavior*, *data contract*, *metrics* and *release gate*.

## 3.1 Welcome / first opening

**User's job:** Decide whether this is worth the effort and whether it understands Indian Jyotish without fear tactics.

**Today:** Standard welcome heading, paragraph, CTA and a static/orbital brand backdrop; not enough product-specific proof.

### Proposed first viewport

- Top: Muhūrta logotype; discreet `EN · తెలుగు · हिंदी` selector.
- Hero: **“First, explore the life you've already lived.”** Supporting: “A personal reading through traditional Indian Jyotish, using the birth details you know.”
- Simple editorial visualization: three chapter stamps connected by a hairline, not a continuously spinning zodiac ring.
- Main CTA: **Explore my story**.
- Trust line: **Exact birth time isn't required to begin.**
- One short preview of the next screen using **fictional** sample data, clearly labeled.

### Interaction and retention design

- Don't force sign-in before showing a credible fictional preview if technically feasible; reserve saving personal details for authenticated profiles.
- Show the *output* before asking users to provide multiple fields. Avoid “unlock your destiny,” manufactured urgency, testimonials without permission, or false “millions served” counters.
- Store selected language and session stage so interruption doesn't restart everything.

**Data:** Static marketing copy + real localization catalog; no personal reading before inputs.  
**Metrics:** `welcome_view`, `sample_explored`, `setup_started`, `welcome_exit` (derived).  
**Release gate:** On a midrange Android device, main CTA and explanation are visible without scrolling in primary locale and at 1.3× text scale; the sample is explicitly fictional.

## 3.2 Login / OTP

**User's job:** Save a private experience without surrendering too much information.

**Today:** OTP/SMS auth exists. Smooth routing matters more than decorative motion.

### Change

- Explain *why* sign-in is needed: to save readings, reflections and selected family profiles. Do not imply phone access is required to calculate Jyotish.
- Keep the chosen language and birth draft through an auth interruption, including a foreground/background transition.
- Use reliable inline resend timing and a visibly editable phone number. Never falsely claim an OTP was sent if the provider failed.
- Mask displayed numbers; do not place them into analytics, public URLs, debug screenshots or share metadata.
- On sign-in success, return to the exact next unfinished onboarding step.

**Retention driver:** Prevents losing a partially completed journey.  
**Metrics:** `auth_started`, `otp_requested`, `otp_verified`, `auth_error_class`, `auth_resume_success`.  
**Gate:** Complete auth works after app backgrounding; retry states are usable and accessible.

## 3.3 Birth basics, birth time and Nakshatra onboarding

**User's job:** Provide only what they know, feel confident that the reading won't pretend to know more.

### New screen sequence

1. **About your birth** — name/display name, date, birthplace, optional city; minimal fields and visible progress.
2. **What do you know about the time?** — exact / approximate range / don't know, using warm-choice rows.
3. **Janma Nakshatra** — I know / I don't know, with a simple definition and optional pada.
4. **What brings you here?** — career, relationship, money, business, family, life direction, or just curiosity. *Skip* must be allowed.

### High-impact changes

- Replace long `MuhChoiceCard` lists with a small number of clear selection cards; scroll only when necessary.
- Prevent misinterpretation of date order (DD/MM/YYYY), midnight day rollover, ambiguous birthplace names, and time zones.
- Show input-quality explanation *once*: `Detailed birth chart`, `Birth-time estimate`, `Moon/Nakshatra-oriented`, or `General Panchanga`. No bogus numeric “accuracy %”.
- “I don't know” is a valid answer, never a blocked or shameful state.
- For `mainConcern`, do **not** silently reinterpret a skipped choice as the user's genuine personal concern. In current code, missing concern is populated with `good_bad_timing`; treat it as an explicit default/general mode, not a claimed preference.
- Support regional-script entry and familiar local place names.

**Retention driver:** Lower onboarding abandonment while preserving trustworthy personalization.  
**Data:** `birth_inputs`, optional concern/life role and birth mode, chart mode.  
**Events:** `birth_basics_saved`, `time_mode_selected`, `nakshatra_selected_or_skipped`, `concern_selected_or_skipped`, `onboarding_completed`.  
**Gate:** All supported input modes lead to a truthful useful screen; back navigation preserves values and never silently erases a mode.

## 3.4 Quick Proof / past recognition

**User's job:** See whether this traditional interpretation connects to an identifiable period of their life and decide whether to explore further.

**Current blocker:** The implementation can wait on a full-screen generation request with a 60-second timeout; output is a vertically stacked list of proof cards. This is the most fragile part of first-session activation.

### New first screen (one chapter, not a list)

```
[Janma Story]               01 / 03
[small phase period, if available]

THE YEARS THAT SHAPED A DECISION
[clear, personal, qualified 2–3 sentence interpretation]

Why this period?                ▾

Does any of this fit your experience?
[Matches] [Partly] [Not for me] [Timing differs]

[Explore the next chapter →]  [Skip reflection]
```

**Critical:** “Quick Proof” is a product nickname, not proof that astrology predicts life outcomes. Do not show “99% accurate”, “we knew this happened”, or cherry-pick only predicted matches.

### Behavior

- Present the **first ready eligible chapter** while later chapters generate. If nothing is ready, show meaningful progress text and an honest retry/continue option, not an endless moon animation.
- Choose the first chapter for variety and comprehensibility, not just the one algorithmically most likely to be flattering.
- Ask about a period rather than declaring a life event really occurred.
- Preserve negative and mismatched feedback; no retraining user-facing history to always show matches.
- After feedback, reveal a new genuinely distinct chapter; never auto-send multiple prompts.
- Keep reflection optional; two chapters explored is a better outcome than forcing five responses.
- Delay sharing until after a user explicitly chooses to save or share a selected chapter.

**Data:** `quickProofGenerate()` result, phase IDs, fact/engine version, optional `validationSubmit()`; sensitive feedback stored privately.  
**Retention bridge:** “Return to your saved past chapters” after later profile updates.  
**Events:** `proof_ready_ms`, `proof_timeout`, `proof_card_viewed`, `proof_basis_opened`, `proof_feedback_submitted` (label only), `proof_next_chapter`, `proof_exit`.  
**Gate:** No blocking full-screen generation on ordinary return; graceful fallback, proper disagreement path, feedback stored only upon successful acknowledgement.

## 3.5 Decode / your Janma reading

**User's job:** Feel personally understood and gain a structured but readable interpretation.

**Current pain:** Promotional “test a friend” before the story; multiple similar cards (moon sign, work, relationships, strengths, watchouts), each competing for attention and share taps.

### The first viewport

```
[Decode]                       [Bookmark]
YOUR JANMA READING

The way you see the world.
[one high-quality, grounded personal interpretation]

[Why this reading? ▾]

[Does this feel familiar?]
[Yes] [Partly] [No]
```

### Below fold, recommended order

1. **Your central tendency** — personal interpretation, with calculated versus inferred context distinguished.
2. **What helps you thrive** — 2–3 specific, non-redundant strengths from available data.
3. **What creates tension** — nuance instead of stigmatizing weaknesses.
4. **Work, money and relationships** — thematic entry cards only for actual populated sections.
5. **Janma factors** — Rashi, Nakshatra, chart, precise factors if calculable, hidden under *Why* and chart details.
6. **Your signature story** — optional hand-picked share preview, **only after the user has seen the full reading**.

### Key changes

- One editorial hero, not five equally sized cards.
- No psychometric percentages or fabricated personality scores.
- Replace constant inline share icons with **Save this interpretation** and a later curated share entry.
- In “Why?”, show simple reason → traditional factors → calculations/limitations in progressive disclosure.
- Allow “This doesn't sound like me”, store correction privately, and never claim the user must be wrong.
- Do not claim an uncertain birth time supports an exact Lagna/divisional chart.
- After the user engages: offer **“See when this pattern was strongest” → Life Map**. This is the main deepening CTA.

**Data:** `me_profile`, `user_identity`, `free_preview`, calculated natal markers, optional `category_reports`.  
**Retention bridge:** Bookmark a meaningful identity reading; link it to life phases and review later.  
**Events:** `decode_first_read_completed`, `decode_basis_opened`, `decode_feedback`, `decode_saved`, `decode_to_lifemap`.  
**Gate:** At least one distinctive interpretation is fully readable in initial viewport on common devices, even with long localized text; no premature share solicitation.

## 3.6 Life Map / Life Atlas — signature deep-engagement screen

**User's job:** Explore a personalized sequence of periods, compare interpretations with lived experience, and understand the current chapter.

**Existing opportunity:** The observed pack had 25 `journey_phases` plus `journey_phase_facts`, `current_phase` and subphase entries. That is enough data for a rich navigation prototype; it does not mean all phase interpretations are factually validated.

### Structural layout

- Editorial headline: **“The chapters of your life.”**
- Compact timeline with **Past / Now / Ahead** filters and an explicit date orientation.
- Current chapter visible by default; past chapters available by timeline or year; future chapters distinguished visually.
- A **single selected chapter reading sheet** fills the lower area. Never dump 25 cards as a giant feed.
- Tap a chapter to expand into title, evidence-bounded story, themes, transition note, and “Why this period?”
- Past periods offer **Matched / Partly / Didn't match / Wrong timing** and an optional *user-reported* memory note.
- Future periods describe traditional themes and uncertainties, not guaranteed jobs, marriage, health outcomes, or market returns.

### High-value interactions

**Chapter continuity:** Selecting a period keeps context when leaving for Ask and coming back.  
**Related question:** “Why did this phase feel difficult?” pre-fills Ask with the selected period ID, not just arbitrary date text.  
**Saved reflection:** A user can voluntarily record a private one-line event and edit/delete it.  
**Transition awareness:** If a new calculated period boundary genuinely approaches, invite exploring it; never manufacture an imminent shift every week.  
**Share chapter:** Only after explicit review, with exact privacy redaction and no public life-event note by default.

### Avoid

- Arbitrary up/down life-success curves, emotional intensity scores, invented phase precision, a progress ring showing “life 72% complete”.
- Claiming “confirmed past” unless a user has actually confirmed the corresponding statement, while clearly identifying it as self-report.
- Infinite scroll whose only novelty is rephrased period copy.

**Data:** `journey_phases`, `journey_phase_facts`, `life_map`, `current_phase`, stored user feedback and consented notes; derive navigable periods from canonical dates.  
**Retention bridge:** Saved chapter, genuine upcoming phase transition, or an intentionally revisited personal note.  
**Events:** `lifemap_open`, `chapter_opened` (period key + past/present/future, **not content text**), `chapter_dwell_threshold`, `chapter_reflection`, `chapter_saved`, `chapter_shared`, `chapter_to_ask`.  
**Gate:** 25 periods remain navigable with screen reader and small screen; phase date accuracy tested; scroll/state preserved; past feedback is immutable in original generated reading.

## 3.7 Today — recurring usefulness, not daily guilt

**User's job:** Quickly learn whether there is a *genuinely new relevant theme* today and what is useful to explore or plan.

**Current pain:** A separate Today tab still depends on pack/payload readiness; duplicated timing cards and often general “finish your pending work” advice can feel stale.

### First viewport proposal

```
Friday, 16 October                       [Current city]
GOOD EVENING [appropriate local salutation]

One clear theme for today.
[1–2 useful paragraphs, distinct from this week's generic copy]

What are you planning?
[Interview] [Travel] [Money discussion] [Family] [+]

[See your timing →]
```

Below: a compact timeline (only if verified), **Your ongoing chapter** (one-sentence bridge), optionally **Your saved plan** and **This week's distinct theme**.

### Daily content strategy

- **Real change first:** surface a changed computed timing factor, a new relevant plan, or a genuinely different theme. If nothing changed, explicitly say **“Your current life chapter continues”** instead of inventing novelty.
- Time-of-day changes the interface state only if backed by clock/location calculation. Don't change user personality stories just to appear adaptive.
- Allow the user to set **one practical intention**; store a simple non-sensitive label and optional user date; user can mark completed, postponed or cancelled.
- The first CTA should be **select a purpose** or **review saved plan**, not share today’s generic quote.
- After user reads Today, offer a weekly summary only if it adds distinct information.
- No swipe-to-refresh rerolling interpretations to chase better fortunes.

**Data:** `today_guidance`, `today_cards` keyed by date, actual `todayPayload`, current phase, verified timing, saved intention.  
**Retention bridge:** Opening for an actual new day, revisiting a saved plan, a clearly relevant calendar/event occurrence.  
**Metrics:** `today_open`, `today_unique_read`, `today_no_new_content`, `purpose_selected`, `plan_saved`, `plan_revisited`, `plan_outcome_recorded`.  
**Gate:** Date and timezone correct; status visible in stale/offline states; no fake recalibration; dynamic timing never uses an LLM-generated timestamp.

## 3.8 Timing — convert useful consultation into planned return

**User's job:** Find and understand a traditional timing evaluation for one specific action.

### Proposed layout

- At top: **“What are you planning?”** and a selected-purpose label.
- Next: Date picker, place/timezone, evaluated input mode, and a neutral one-sentence summary.
- Main visual: compact, accurate timeline of **eligible / caution / neutral / unevaluated**, with exact timestamps only when supported.
- “Why this window?” exposes applicable traditional rules, exclusions, overlaps and method/version.
- **Save this plan** lets user store a date, purpose and optional reminder preference. Default reminder state is OFF.
- Important-purpose cards can be shared as a private planning card after the user approves exactly what will appear.

### Loops

**Plan → evaluate → save → return near event → reflect**. This is a meaningful repeat-usage loop. It does *not* require opening the app every day.

### Non-negotiable calculation gates

- Detect Rahu Kalam overlaps and any selected-method conflicts; explain why a range cannot be promoted.
- Respect natal input uncertainty, date/place and local timezone.
- Distinguish **traditional evaluation** from real-world likelihood of success.
- Avoid “Guaranteed success”, “100% safe”, and warnings encouraging high-stakes delay without context.

**Data:** `timing_plan`, date/purpose-specific deterministic engine, computed windows and rule trace; proposed private `saved_intentions`.  
**Events:** `timing_purpose_selected`, `timing_date_changed`, `timing_assessment_shown`, `timing_reason_expanded`, `timing_plan_saved`, `timing_plan_revisited`, `timing_no_result`.  
**Gate:** A result can be reproduced from same input/version; saved plans reopen correctly; reminders are optional and cancellable.

## 3.9 Ask — make one answer lead naturally to a better question

**User's job:** Ask a personal life-timing question, receive a clear answer, and know what evidence/limitations it relies on.

**Current risk:** Pack-first templates are affordable but can be generic. A response that sounds fluent without resolving the actual intent will not build retention.

### First viewport

- Heading: **“What's on your mind?”**
- Composer with a few context-relevant suggestions, e.g. **“What does my current phase mean for work?”**, **“Explain the chapter I saved”**, **“Find a traditional date for travel”**. Suggestions must be conditional on actual available data.
- A discreet note: **Answers use your available chart context and traditional Jyotish interpretations.**

### Answer layout

1. **Direct interpretation** in readable prose, adjusted to the question type.
2. **Why** (available calculated/approved inputs, limitations).
3. **Practical next step** or *choose a purpose*, where useful.
4. **One suggested follow-up** grounded in this question, not an endless carousel.
5. Optional **Save to my journal** / **Ask a related question**.

### Conversation quality changes

- Route templated questions through pack-first data only when the template answers the actual intent. Escalate genuinely complex or novel questions to the configured live model within budget/entitlement.
- Display if personal exact timing **cannot** be inferred from available birth input.
- Reuse consented summaries and user's selected chapter; never insert fabricated memories or infer a private event as fact.
- Feedback control: `Useful`, `Partly`, `Didn't answer` with optional quick category. Use it to improve service quality, not to force optimism.
- Save completed questions for continuity; drafts persist between tabs. Give users delete/export controls.

**Data:** `ask_knowledge`, `ask_templates`, `category_reports`, selected chapter/timing input, private chat only after consent.  
**Retention bridge:** Saved inquiry, user-initiated follow-up, new genuine phase/timing insight related to an existing question.  
**Events:** `ask_question_sent` (**topic classification only**, no raw question), `ask_answer_rendered`, `ask_answer_useful`, `ask_answer_missing_context`, `ask_followup`, `ask_saved`, `ask_error`.  
**Gate:** Ask can truthfully decline an unsupported exact answer, stays readable in long Telugu/Hindi, and no actual question text goes into product analytics.

## 3.10 Remedies / optional practices

**Product choice:** In the current 5-tab experience, do **not** create a separate mandatory Remedies tab. Make an optional section within Today, a drawer from relevant interpretations, or a profile-level collection.

### Change

- Label traditional practices as optional, not required risk avoidance.
- Present one cultural/traditional suggestion with a clear source/category where available; don't offer fake medical efficacy or expensive upsells.
- Offer **Save / Not interested / Hide this category**, but no compulsory checklist or daily guilt.
- Where a non-ritual practical habit is suggested, clearly separate it from traditional religious practice.

**Data:** `remedy_pack`/`remedy_cards`; review factual appropriateness by language/culture.  
**Metric:** voluntary remedies explored/saved; hidden rate as negative feedback.  
**Gate:** No coercion, dangerous action or time-sensitive fear messaging.

## 3.11 Story Gallery / share flow

**User's job:** Share one personally interesting, tasteful idea without exposing private birth data or unintentionally publishing an entire chart.

### Entry points

- After finishing a Decode reading: **“Make a story card”** secondary action.
- From a selected Life Map chapter: **Share this chapter**, after approving the text.
- From a saved Timing plan: **Share this plan**, with redacted date/place as necessary.
- A small **Saved & Shareable** library accessible in Profile or within the relevant screens. Do not add a sixth bottom tab without evidence.

### Flow

`Choose insight → art-directed preview → edit/redact fields → choose 9:16 / 4:5 / WhatsApp → explicit Share → recipient preview`.

Four formats from the design system: Identity Portrait; Life Chapter; Purpose Timing; Consented Two-Person Reflection. Implement the first three before optional comparison.

### High-impact changes

- Replace indiscriminate section-level WhatsApp icons with one share composer.
- Visual asset must be beautiful **and** factually equivalent to the preview.
- Default to no full name, no DOB, no precise birthplace, no private event notes, no user's phone, and no full birth chart on a public card.
- Distinguish native share-sheet invocation from confirmed dispatch; clients may not report actual delivery.
- Use clearly separate metrics for generated/exported/copied/shared/recipient-opened assets.
- A recipient must see the specific shared artifact on web before a download CTA, not a generic advert.
- “Find your chapter” can link to a fictional sample or self-onboarding, never expose the sender's personal account.

**Data:** `share_cards` pack candidates, `share_cards` table, current `share-preview` Edge Function, `MarketingUrls.shareCardLanding`, `ShareStoryCard` replacement.  
**Retention bridge:** Saved personal gallery with editable private collection; deliberate social conversations may create new questions.  
**Metrics:** `gallery_opened`, `share_candidate_previewed`, `share_redaction_changed`, `share_asset_rendered`, `native_share_sheet_opened`, `share_link_opened_by_recipient`, `recipient_demo_started`, `recipient_first_insight_viewed`.  
**Gate:** Redaction default tested; OG/WhatsApp preview matches; revoke public card; report/delete; metadata leakage test passed.

## 3.12 Website / mobile-to-web recipient experience

**User's job:** Understand what the shared artifact means, trust the product and experience something before installing.

### Public home `/`

- Gold/ivory editorial hero: **“Your life has chapters. Explore what they mean.”**
- One interactive, **fictional** chapter preview visible without registration.
- Three concise sections: *Recognize a past phase*, *Explore your Life Atlas*, *Examine traditionally favorable timing*.
- Real mobile app frames, not generic astrology stock images or fake testimonials.
- Trust, method and privacy explanations within one tap.
- A clear primary CTA and no intrusive email capture wall.

### Public share `/c/{id}`

1. Render the *approved* share image and exact private-safe text (with strong cache/privacy design).
2. Caption: “A chapter shared with Muhūrta” and clear scope (“Traditional Jyotish interpretation”, not proven prediction).
3. CTA: **“Explore your own story”**; use deferred deep link where reliable, otherwise a web demo or Play listing.
4. No full chart, undisclosed identity, referrer profile ID, or hidden PII in page source, open graph or URL.
5. A `revoke`/deleted share route returns a graceful unavailable page, not stale cached content.

### App store/download page

- Show the **actual** first read experience with accurate screenshots and no claims of guaranteed outcomes.
- Use deep-link attribution without embedding raw personal identifiers publicly.
- Localize landing CTA and examples. Test WhatsApp preview on Android, not just browser.

**Metrics:** `share_landing_viewed`, `share_landing_engaged`, `web_demo_started`, `app_store_click`, `attributed_first_insight`.  
**Gate:** Core Web Vitals tested on Indian mobile-network profiles, real meta preview verified, zero personal-content leakage.

## 3.13 Notifications / the respectful return engine

**User's job:** Hear from Muhūrta when *they* requested a reminder or genuinely relevant new information exists.

### Change permission strategy immediately

`syncNextWeek()` currently calls `_ensureNotificationPermission()` during synchronization. Move permission requests to an explicit action such as **“Remind me about this saved date”** or a notification-preference screen. The app should remain useful if the user declines.

### Allowed notification types, with user control

| Type | Trigger | Copy direction | Frequency |
|---|---|---|---|
| Saved plan reminder | User opted into a saved intention | “You saved a travel timing plan for tomorrow. Review it?” | Per user-chosen plan |
| Weekly chapter briefing | User opted into periodic digest and actual new distinct content exists | “Your week-ahead reading is ready.” | At most user's selected weekly cadence |
| Significant phase transition | Supported calculated boundary; user specifically opted in | “Your Life Map has a new chapter to explore.” | Only when genuinely changing |
| Unanswered Ask revisit | User requested follow-up on a saved topic and there is new relevant information | “Your saved question has a new relevant update.” | Condition-driven, not generic |

### Prohibited patterns

- “Bad planetary influence today, open immediately.”
- Daily spam built from repeated copy.
- Countdown pressure unrelated to a real event.
- Claiming a life event will occur.
- Automatically upgrading push frequency for paid users.

Add quiet hours, locale/timezone awareness, grouped preferences, per-type disable, one-tap opt-out and sensible caps. Avoid `cancelAll()` when it would delete unrelated notifications; manage only own app's relevant scheduled IDs and reschedule idempotently.

**Events:** `notification_pref_enabled`, `notification_scheduled`, `notification_delivered` if verifiable, `notification_opened`, `notification_disabled`, `notification_opt_out`.  
**Gate:** No OS permission prompt during ordinary home loading; no duplicate alerts, no deleted unrelated reminders, and transparent opt-out.

## 3.14 Profile, languages and multiple charts

**User's job:** Know what the app knows, switch charts if intentionally set up, and control privacy.

### Change

- Present current input mode and a clear *Improve details* action, not “upgrade accuracy to 98%”.
- Expose a readable list of saved facts, reflections and chat summaries **only if these are actually stored**.
- Allow edit/delete/export with clear effects; show how edited birth data affects previous interpretations and saved shares.
- Chart profiles should be clearly labeled, and readings must never mix a friend's chart with the user's own.
- For chart details belonging to another person, require suitable authorization/consent and keep sharing private by default.
- Language choice available at any time. Telugu script / Hindi / English copy requires native editorial quality, not direct mechanical translation.
- Keep privacy and notification settings easy to reach.

**Retention driver:** Trust and continuity.  
**Metrics:** `profile_details_updated`, `chart_switched`, `language_changed`, `privacy_settings_opened`; never log the entered personal values.  
**Gate:** Correct data isolation per chart, RLS verified, no cross-profile cached content leaks.

## 3.15 Paywall / subscriptions

**User's job:** Decide if deeper functionality is worth paying for without being forced before understanding the basic product.

### Placement

- **Never** gate the initial honest personal insight or a basic past-validation interaction behind a payment prompt.
- Place value-based opportunities after a completed and useful task: opening the fourth detailed Life Map chapter, requesting deeper report layers, or choosing a paid weekly digest **only if those are genuinely premium features**.
- Show exactly what was viewed free and what additional specific value is unlocked; no vague “unlock your destiny”.
- Keep pricing, purchase/restore/entitlement consistent with actual current Play + RevenueCat configuration; don't invent offers or change pricing as part of design work.
- No timed countdown discount, fake scarcity, concealed terms or guilt prompts.

### Value ladder hypothesis

**Free:** first strong interpretation, partial journey, meaningful Today's theme, one real purpose timing assessment where supported, basic share.  
**Paid candidate:** richer multi-domain reports, full chapter details, advanced question depth, personally selected digest; validate willingness and API cost before changing entitlements.

**Events:** `paywall_exposed_with_source`, `paywall_dismissed`, `paid_feature_previewed`, `purchase_started`, `purchase_confirmed`, `restore_completed`, `refund_or_cancel` where reliably available.  
**Gate:** Paywall triggered after value, never broken navigation; user can always return to readable free content.

## 3.16 Error, loading, stale and offline states are product screens

**Problem:** A beautiful ideal screen is meaningless if live users mostly experience spinners or generic fallback advice.

- **Generating:** Show which section is ready and which is being prepared; don't block everything while a full birth pack is generated.
- **Today stale:** Keep last valid, dated guidance visible with “Last updated …”; disable actions that require fresh timing.
- **No accurate birth time:** Provide a useful limited reading with simple explanation; no numeric accuracy badge.
- **Timing data missing:** “We can't assess this interval with the available information,” plus edit city/date or open general Panchanga.
- **AI failure:** Show cached eligible content or a graceful retry; don't render generic fallback as personalized certainty.
- **No internet:** Saved history and shared content can be reviewed offline if downloaded and consented; clearly label what cannot be refreshed.
- **Unverified claim:** Suppress unsupported content; substitute a neutral explanation, not a fabricated optimistic card.
- **Share revoked:** Dedicated respectful 404/state.
- **Payment unavailable:** Free product remains usable; no broken 'unlock' CTA.

**Gate:** Every screen has content/loading/empty/error/offline/partial-data variants in the component gallery and golden tests.

---

# 4. Editorial content redesign for retention

Good content is the strongest retention feature. The observed Supabase sample repeats “clear pending work,” “make systems cleaner,” and “be practical” across identity, today, week and month. A new coat of gold won't fix this.

## 4.1 Stop generating every output as a similar “advice card”

| Content type | User question | Composition | What makes it distinct |
|---|---|---|---|
| Identity | “What am I like?” | Name the pattern → nuance → context → basis | Stable personal portrait, **not** daily instruction |
| Past phase | “What was this period about?” | Time boundary → traditional factors → possible themes → user validation | Historical period, no invented biographical event |
| Current chapter | “What phase am I in?” | Core theme → what changed → relevant domains → next transition | Phase-specific, not a generic slogan |
| Daily | “What merits attention today?” | Fresh, concise theme → relevant current plan → timing link | Truly day/purpose-specific |
| Weekly | “What matters this week?” | Two to three distinct arcs, upcoming relevant dates | Not seven paraphrased daily cards |
| Monthly | “Where is my longer focus?” | Meaningful period overview, change from prior month, caution and opportunity | New horizon, not enlarged weekly copy |
| Purpose | “When should I do this?” | Evaluated times with traceable reasons and conflicts | Deterministic rule grounding |
| Ask | “Answer my actual question” | Direct answer → explicit evidence/limits → useful follow-up | Intent-specific, not template overuse |
| Share | “What about this reflects me?” | One specific, grounded sentence + useful context | Clear enough to send but not exaggerated |

## 4.2 Candidate selection and rejection criteria

Every generated sentence or card should carry internal fields:

```json
{
  "content_id": "opaque_generated_id",
  "locale": "en",
  "surface": "lifemap",
  "period_key": "opaque_period_key",
  "evidence_refs": ["computed_factor_or_user_report_ref"],
  "claim_scope": "traditional_interpretation",
  "input_mode": "time_bucket_plus_nakshatra",
  "novelty_source": "genuine_period_change_or_unique_domain",
  "safe_for_share": false,
  "render_status": "approved"
}
```

This is a **proposed internal contract**, not the existing DB schema. All proposed fields must be derived from actual valid data, and claims need validation. `content_id` must never contain DOB/identity info.

Reject or revise content when:

- It asserts a private event the user never provided.
- A planet/house/dasha claim lacks an eligible calculation.
- The same generic advice appears in multiple horizons or domains.
- Timing claims conflict with evaluated rules.
- Copy implies a guaranteed medical, marriage, employment or financial result.
- It sounds like a universal motivational quote with no distinctive user value.
- It uses fake “confidence %”, “calibration” or psychometric numbers.
- Localization changes the meaning of a caution into a guarantee.

Score editorial candidates internally if helpful, **but never display that score as a predictive accuracy percentage**. For testing, human reviewers should see examples with all user identities redacted.

## 4.3 Create truly new return content, not manufactured novelty

The pack has `today_cards`, `weekly_cards`, `monthly_cards`, and `journey_phases`, but showing a “new” card is not the same as giving users something new.

Maintain a private, lightweight exposure ledger containing content ID, screen and viewed timestamp. Compare candidates on semantic content/horizon and meaningful change before promoting a banner or notification. This is a proposed feature, not already implemented.

A “new insight” may be shown only for a genuinely changed dated period, newly available eligible interpretation, user-modified context, or new relevant action. Otherwise continue the current chapter clearly.

## 4.4 Prompts and model routing

- `birth_pack_multiturn.ts`: split output guidance by **editorial role**. The current shared “sharp Indian friend on WhatsApp” tone is suitable for casual Ask, not for every Life Map chapter. Make past-phase writing narrative and nuanced; make Today brief; make share copy self-contained.
- `personalization_kernel.ts`: label archetype descriptions as broad traditional associations. Do not turn archetype defaults into asserted personal history.
- `birth_intelligence_pack.ts`: expand quality checks beyond cardinality, banned phrases and distinct bodies to evidence coverage, overlapping statements, unsupported claims, and repeated themes.
- `ask_pack.ts`: return “not enough information” for unavailable personalized timing rather than a friendly but ungrounded yes.
- `fallback_pack_copy.ts`: placeholders should be visibly general, never masquerade as a confirmed personal reading.
- Preserve model-cost controls; make precomputed content good, and call an LLM when there is a real personalization payoff.

**Quality acceptance:** The same user should not receive three near-identical “finish pending work” messages across Decode, Today and Weekly. Review 20+ synthetic personas across exact/uncertain/unknown birth modes and all locales before rollout; never use those synthetic reviews to claim real predictive accuracy.

---

# 5. Full end-to-end journeys to implement and test

## Journey A — skeptical first user

1. Sees honest welcome and a fictional example.
2. Starts onboarding; can skip exact birth time and Nakshatra.
3. Sees **one** first meaningful interpretation or a clearly labeled limited/general result.
4. Opens Why or records Match/Partly/No response.
5. Explores second Life Map chapter.
6. Optional choice to save or share **after value**.
7. Next visit opens Today, not duplicate Decode.

**Break condition:** The user never gets an eligible first read; do not claim activation.

## Journey B — user with a real decision

1. Opens Today and chooses `Interview`.
2. Selects date and location.
3. Timing shows validated traditional windows, conflicts, and limitations.
4. Saves the plan, optionally requests a reminder.
5. Opens Ask to understand reasons.
6. Returns near event; reviews plan; optionally records how it went.

**Break condition:** No supported precision, show an honest limited assessment and practical next options.

## Journey C — emotionally meaningful Life Atlas reading

1. User opens a past chapter and reads its interpretation.
2. Marks Partly / Not matched, or adds a private note.
3. Opens the corresponding traditional explanation.
4. Bookmarks the chapter.
5. Later returns to review it; can remove/edit their own note.
6. If they want to share, previews a redacted chapter card before publishing.

**Break condition:** Personal note is included in public share without explicit opt-in.

## Journey D — friend opens a shared reading

1. Receives visually striking approved image and link.
2. Opens public preview matching the shared content.
3. Sees clearly scoped invitation to discover their own reading.
4. Explores fictional sample or installs app.
5. Completes first insight; attribution recorded without leaking the sender's raw account identifiers.

**Break condition:** Recipient sees login/download wall without first seeing the promised artifact.

## Journey E — paid-value decision

1. User has already completed a meaningful first reading and optionally explored a chapter.
2. They explicitly request a locked deeper detail.
3. Paywall previews **which specific content** unlocks and costs.
4. Purchase and restore work, and a failed transaction never strands the user.
5. Paid member can clearly find the unlocked value on a subsequent visit.

**Break condition:** Paywall appears before any useful reading or paid data is merely longer generic prose.

---

# 6. Instrumentation, metrics, and privacy-respecting experiments

## 6.1 Minimal event envelope

Extend the existing `AppAnalytics` abstraction rather than adding arbitrary SDKs. Use an analytics-specific table or append-only logging path only after validating the present Supabase product-event architecture, RLS, retention policy and access permissions.

```json
{
  "event_name": "chapter_opened",
  "event_version": 1,
  "occurred_at_utc": "ISO-8601 UTC",
  "anonymous_or_pseudonymous_user_key": "opaque",
  "session_key": "opaque",
  "screen": "life_map",
  "content_key": "nonreversible_opaque_key",
  "input_mode": "known_time_bucket",
  "locale": "te",
  "properties": {"chapter_phase": "past", "entry_point": "decode"}
}
```

**Never log:** name, DOB, birth time/place, phone, raw chat text, specific user-reported life events, full reading body, public share token or private notes. Constrain `properties` to an explicit allowlist. Obtain appropriate consent, honor deletion, and impose retention limits.

## 6.2 Recommended funnel definitions

| Metric | Numerator | Denominator | Interpretation |
|---|---|---|---|
| Onboarding completion | Users reaching eligible onboarding completed state | Users starting setup | Product/setup friction |
| First insight viewed | Users viewing one eligible complete reading | New users starting setup | Time-to-value success |
| Meaningful activation | Users who read and deepen a valid reading within 24h | New users starting setup | First-session value realization |
| Proof participation | Users submitting at least one reflection (all answer types count) | Users exposed to eligible past-chapter card | Engagement, not proof of truth |
| D7 meaningful retention | Activated users with a qualifying action on day 7 | Activated users eligible for D7 observation | Repeat useful use; local-day based |
| Weekly engaged users | Unique users with qualifying value action in calendar week | Eligible active users as separate denominator | Broader meaningful use |
| Intention return rate | Saved plans revisited near event | Plans with a future date and sufficient elapsed time | Planning utility |
| Share export rate | Approved share exports | Previewed share artifacts | Willingness to share, not delivered count |
| Recipient first-value conversion | Attributed recipients with first insight | Unique recipient sessions that saw approved preview | Referral experience quality |
| Reading dispute rate | Negative/wrong-timing responses | Submitted feedback responses | Content trust diagnostic, not accuracy proof |

Report **plain D1/D7/D30 session retention separately** because return behavior and value behavior are not identical. For low early volumes, use raw counts, funnel interviews and uncertainty intervals; avoid claiming statistical wins after 10 users.

## 6.3 Diagnostic events by screen

| Screen | Most actionable funnel |
|---|---|
| Welcome | viewed → CTA → setup started |
| Birth | step viewed → selected/skipped → saved → next |
| Quick Proof | request → ready → card viewed → why/feedback → next |
| Decode | first reading → basis or save → Life Map |
| Life Map | opened → chapter selected → read → saved/reflected → returned |
| Today | opened → genuinely new content shown → purpose selected |
| Timing | purpose/date → evaluated → reason → saved/revisited |
| Ask | question sent → resolved answer → useful/followup |
| Share | preview → redaction → asset → native share → recipient viewed |
| Web | shared preview → demo/download → first completed read |
| Paywall | paid feature requested → paywall → transaction → feature used |

## 6.4 Experiments worth running (one change at a time)

| Experiment | A | B | Primary metric | Guardrail |
|---|---|---|---|---|
| First insight | Multiple Quick Proof cards | Single sequential chapter | First meaningful activation | Dropoffs, negative-feedback accessibility |
| Decode CTA | Share early | Explore Life Atlas after reading | Chapter exploration | No reduction in informed sharing |
| Returning home | Decode default | Today default with saved intent | D7 meaningful retention | Unnecessary repeated visits |
| Daily hero | General advice | Purpose-aware compact theme | Purpose evaluation completion | Unsupported timing claims |
| Story asset | Text card | Art-directed chapter card | Intentional export rate | Privacy/redaction errors |
| Notification | Immediate permission ask | Contextual opt-in after saved plan | Opt-in + useful notification open | Opt-out/uninstall rate |

Before declaring winners, predefine the exposure rule and minimum observation period. Do not run overlapping experiments that confound first-session activation unless traffic supports proper randomization and analysis.

## 6.5 How to collect qualitative evidence

Recruit at least three behavioral segments: (1) Jyotish-familiar users who know their Janma Nakshatra, (2) casual astrology consumers with uncertain birth time, and (3) skeptical users evaluating trust. Include Telugu/Hindi/English reading preferences, different ages, midrange Android devices, and varying network quality.

Ask participants to *show* what they remember, what they believed was generic, what they would choose to share, and why they would return. Never infer user agreement from a polite yes.

---

# 7. Proposed data and technical change map

**These are design proposals, not a migration to apply blindly.** Inspect existing schemas, index needs, RLS and historical data before creating or altering any table. Avoid collecting more personal information than the feature requires.

| Proposed persistence | Required fields | Safety/retention concerns |
|---|---|---|
| `user_reading_exposures` | user/opaque profile key, content key, screen, last viewed time, completed flag | No text content; needed for novelty and read continuity |
| `user_saved_chapters` | owner, chapter key, saved timestamp | Private; preserve original version even if regenerated |
| `user_reflections` | owner, original content key/version, feedback enum, optional separate encrypted/private note | Explicit consent for notes, deletion/export support, RLS |
| `saved_intentions` | owner, purpose, chosen date/timezone, optional associated window, reminder preference, outcome | No sensitive life-event text by default |
| `notification_preferences` | owner, opt-in by category, cadence, quiet hours, timezone | Default disabled; unsubscribable |
| `share_artifacts` enhancement | artifact key, canonical approved copy, privacy settings, renderer version, revoked timestamp | Public access by limited token; redacted source only |
| `content_quality_audits` (internal) | content key, generation version, checks and rejection codes | Avoid storing redundant private user profiles |
| `product_events` (only if needed) | opaque actor, event, approved structured props, timestamp | Retention policy, RLS/least privilege, privacy controls |

**Avoid duplicated state:** Before migrations inspect `birth_intelligence_packs`, `chart_runs`, `birth_inputs`, `chart_profiles`, `share_cards`, `app_logs`, `notification_schedule`, and existing validation storage/functions. Add columns or reuse existing tables where appropriate rather than creating parallel sources of truth.

## 7.1 Immediate repo file worklist

**P0 — unblock value and consent**

- `app/lib/app/router.dart`: first-session versus returning-session entry logic; Today home default when appropriate.
- `app/lib/features/onboarding/quick_proof_screen.dart`: progressive first eligible chapter; resilient timeout/fallback; non-coercive feedback.
- `app/lib/features/home/home_shell.dart`: Decode hero first, eliminate early `_TestFriendInviteCard`, preserve tabs, state and content continuity; meaningful Today first viewport.
- `app/lib/core/notifications/muhurtha_notification_service.dart`: separate explicit opt-in from sync; avoid surprise permission prompt; idempotent schedule updates.
- `app/lib/core/analytics/app_analytics.dart`: implement approved low-PII event dictionary and screen funnels.
- `supabase/functions/muhurtha-api/birth_intelligence_pack.ts`: reconcile pack completion/readiness state and UI behavior.

**P1 — create reasons to explore and return**

- `app/lib/shared/widgets/celestial_components.dart`: new Golden Editorial reading sheet, Life Atlas chapter view, Why drawer.
- `app/lib/core/data/birth_pack_views.dart`: provide semantic selectors for new journeys, instead of dumping all generated cards.
- `supabase/functions/muhurtha-api/birth_pack_multiturn.ts`: differentiated narrative styles for identity/past/current/daily/weekly/monthly.
- `supabase/functions/muhurtha-api/personalization_kernel.ts`: preserve scope and evidence provenance for claims.
- `supabase/functions/muhurtha-api/ask_pack.ts`: answer actual intent and distinguish inability to infer precise timing.
- New saved chapter/reflection/intention models and repositories, based on real schema review.

**P2 — social product and monetization**

- `app/lib/shared/widgets/share_story_card.dart`: four-format rendering, user-controlled redaction and preview.
- `app/lib/core/share/share_card_service.dart`, `app/lib/core/growth/referral_service.dart`: preserve accurate source IDs and safe attribution.
- Supabase `share-preview` and public `/c/{id}` web surface: truthful, revoked/redacted artifact landing.
- `app/lib/shared/widgets/paywall_sheet.dart`: value-contingent premium preview and clear restore.
- Golden Editorial design tokens and shared UI primitives should be applied throughout all new screens.

## 7.2 Sequenced delivery without big-bang rewrite

1. **Repair correctness/readiness + analytics/notification consent**. The redesign must not mask underlying failures.
2. **Ship first-session value:** Welcome, onboarding, Quick Proof and Decode, real-content prototype and performance validation.
3. **Ship Life Atlas navigation and save/reflection**. This is the deepest content-engagement improvement.
4. **Ship Today → Timing → saved intention loop**. This is recurring practical value.
5. **Improve Ask usefulness and continuity**. Avoid building elaborate memory infrastructure before there is consent and actual chat use.
6. **Ship Story Gallery and web preview**. Use existing share infrastructure and proper redaction.
7. **Evaluate paid-value tiers** after free activation and deeper content usage are understood.

Release each slice behind a reversible feature flag if needed; compare against existing behavior before making it default.

---

# 8. Acceptance scorecard (product + engineering + UX)

## First-session experience

- [ ] A user with unknown birth time completes onboarding and gets a truthful useful experience.
- [ ] A user sees the first eligible personal reading without waiting for the *entire* pack to finish.
- [ ] If generation times out, the experience offers recoverable next steps and never invents personal facts.
- [ ] A user can disagree with Quick Proof/Decode and still continue normally.
- [ ] The first personal insight visibly precedes a share request or paywall.

## Repeat usefulness

- [ ] Returning app opens the relevant Today/saved-plan state, without losing previous tab state.
- [ ] Daily/weekly/monthly copy is meaningfully differentiated, not three versions of identical advice.
- [ ] Today reports stale and unchanged content honestly.
- [ ] Life Atlas can navigate dense periods without arbitrary success scores.
- [ ] Timing detects rule conflicts and handles uncertainty correctly.
- [ ] Saved intention can be revisited and removed.

## Social trust

- [ ] Sharing is preview-first and user-authorized.
- [ ] A public preview does not reveal private birth or life-event data by default.
- [ ] Share preview equals exported content and leads to the actual artifact landing.
- [ ] A revoked share becomes unavailable across caching/OG where feasible.
- [ ] Referral conversion is measured with safe, pseudonymous attribution.

## Push and personalization

- [ ] Notification permission is requested only after explicit user action.
- [ ] Reminders are relevant, limited, adjustable and cancellable.
- [ ] Profile switching never mixes people's readings.
- [ ] Chat memory is consented, inspectable and deletable.
- [ ] No “accuracy %”, unsupported house claim, fabricated event or guaranteed outcome appears.

## Measurement and QA

- [ ] First value, D7 meaningful retention, and qualified social discovery can be calculated from events.
- [ ] Events use an allowlist and contain no raw question/reading/birth data.
- [ ] Screen golden tests include long copy, partial input, native-language text, small Android viewport, loading, offline and error states.
- [ ] Real midrange Android testing confirms responsive interaction and no conspicuous dropped frames.
- [ ] Supabase RLS/access-control checks protect any newly persisted user-owned data.
- [ ] Analytics cannot be mistaken for a verified astrology prediction accuracy study.

---

# 9. Cursor / Codex master execution instruction

> Read `Muhurta_Golden_Editorial_Design_System_v1.md` and `Muhurta_Retention_Engagement_Screenwise_Plan_v1.md` together. These are companion specifications: the first owns visual identity, typography and motion; the second owns value loops, user journeys, UX interactions, safe sharing, notifications and product metrics. Inspect the **latest** `prasanthkuna/muhurtha` codebase and actual Supabase schema before implementation. Do not implement new state models where the repo already has equivalent structures. Do not replace real computed chart or timing evidence with example mock data. Fix P0 readiness/consent issues before cosmetic rollout. Build first-session Quick Proof + Decode first, then Life Atlas, Today/Timing saved plan, Ask and Story Gallery; preserve Play/RevenueCat integration. Create gold/ivory prototypes with actual structured fixture content and render real Flutter screenshots before broad implementation. Add accessible semantics, full locale handling, complete states, approved low-PII analytics, privacy-safe share previews, and measurable retention funnels. Produce a changed-file report, verified tests, unresolved dependencies and side-by-side old/new screenshots. Distinguish shipped features from proposals. Avoid deceptive gamification, unsupported predictions and fabricated success metrics.

## Completion definition

The redesign is successful only when a user can honestly say:

1. “I understood something interesting about my own life.”
2. “I found it easy to explore why that interpretation was shown.”
3. “I can return when I have an actual question or event to plan.”
4. “I feel safe saving and sharing only the parts I choose.”
5. “The app isn't repeating the same horoscope in different words.”

**Final product principle:** *Make Muhūrta useful enough to revisit, personal enough to remember, and beautiful enough to share — without making the user anxious enough to keep checking.*
