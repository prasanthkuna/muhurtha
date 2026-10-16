# MUHŪRTA
## Golden Editorial — Product Design System & Experience Specification

**Version:** 1.0  
**Date:** 16 October 2026  
**Status:** Approved creative direction, proposed implementation; **not yet shipped**  
**Platforms:** Flutter Android (primary), Flutter iOS (future), responsive public website and share pages  
**Design inspiration:** The calm editorial clarity, reading comfort, and restrained interactions associated with Claude; **not** a literal reproduction of Claude's assets or interface.  
**Brand ambition:** A personal life journal informed by traditional Indian Jyotish. Distinctive Indian cultural credibility without temple-app clichés or high-gloss cosmic decoration.

> **North star:** “Your life has a story. Understand its chapters.”  
> **Brand expression:** **Quiet intelligence. Warm gold. Human stories.**  
> **First principle:** Make the interpretation worth reading **before** making it beautiful enough to share.

---

# 0. Executive design decision

We are **replacing** the current blue/graphite, dashboard-like appearance with a **warm ivory + antique gold editorial system**. We are **not** replacing the calculation engine, Supabase infrastructure, or app architecture merely to achieve a new look.

The app should feel like **a private, beautifully typeset publication**, with a conversational intelligence behind it. When a user reads a compelling personal interpretation, the page gives that story room. The technology supports it quietly.

**Signature experience order:**

1. **Decode / Janma Reading:** immediate personal recognition; a single memorable interpretation with the basis one tap away.
2. **Life Map / Life Atlas:** explore actual calculated or explicitly qualified chapters through time, not a long pile of repeating cards.
3. **Today:** return ritual; a personal daily theme and a clear path to purpose-based timing.
4. **Timing:** precise, traceable traditional Jyotish timing evaluation, appropriately scoped to user input quality.
5. **Ask:** clean, context-aware conversation with spacious, readable answers.
6. **Story Gallery:** optional, privacy-safe, editorially curated exports that motivate genuine sharing.
7. **Website:** the same quiet gold identity from shared preview → story → personal onboarding.

**Do not build:** personality trait percentages, fake success probabilities, mood-vibe charts, neon stars, glowing avatars, generic motivational quote factories, arbitrary life-success curves, religious-icon overload, gold borders on all cards, or an entire application that feels like a dashboard.

---

# 1. Source-informed baseline: what already exists

The following are **observed from the connected Muhūrta repository and Supabase inspection on 16 October 2026**, not proposed future capabilities. Re-check the working branch before implementing.

| Area | Observed state | Design implication |
|---|---|---|
| App | Flutter; Riverpod, GoRouter, Supabase; 5-tab shell | Keep native Flutter. Recompose, don't rewrite. |
| Navigation | Decode, Life Map, Today, Timing, Ask | First-session Decode; returning-session Today as the default. |
| UI | `muhurta_colors.dart` graphite/azure; `muh_theme.dart` Fraunces/Instrument Sans; `muhurta_motion.dart` | Consolidate warm-gold tokens. Fix semantic typography. |
| Motion | `flutter_animate`, `muh_enter.dart`, custom route transitions, orbital backgrounds | Reduce blanket staggering, use contextual motion, preserve state. |
| Hero and cards | `celestial_components.dart`, `muh_timeline_hero.dart`, `share_story_card.dart` | Replace repeated visual containers with a reading/surface hierarchy. |
| Birth intelligence | One observed generated pack; approximately 43 KB JSON | Existing content is enough for rich prototypes, not proof of broad production quality. |
| Journey | 25 observed `journey_phases`; `journey_phase_facts`, `life_map` | Build a true interactive Life Atlas. |
| Time content | 16 `today_cards`, 8 `weekly_cards`, 12 `monthly_cards` in observed pack | Use relevant subset; avoid turning app into a feed of all content. |
| Categories | Career, money, business, relationship, family, health routine | Make these explorations, not six homogeneous cards. |
| Shares | 4 pack share concepts; `share_cards` table; `share-preview` function | Build a curated export gallery and recipient experience. |
| AI | `birth_pack_multiturn.ts`, `personalization_kernel.ts`, `birth_intelligence_pack.ts`, pack-first Ask | Improve editorial prompt quality and evidence boundaries. |
| Readiness issue | Observed generation phases complete but pack `status='generating'`; Today absent from `screens_ready` | P0 verification before exposing completed readings. |
| Usage sample | One birth pack, one share record, zero chat messages in checked tables | Avoid claims of proven retention, sharing or personalized chat performance. |

**Source pointers**
- Repository: `https://github.com/prasanthkuna/muhurtha`
- Relevant design/code: `app/lib/design_system/*`, `app/lib/app/muh_theme.dart`, `app/lib/features/home/home_shell.dart`, `app/lib/shared/widgets/*`
- Generative engine: `supabase/functions/muhurtha-api/birth_pack_multiturn.ts`, `personalization_kernel.ts`, `birth_intelligence_pack.ts`, `ask_pack.ts`
- Production Supabase project identified during audit: **muhurtha**; avoid embedding its credentials or personal rows in source code, public previews, fixtures, or analytics.

**Audit limitation:** No live Flutter emulator/real-device screenshot comparison was completed during this documentation pass. Rendered quality must be validated before release. Current database samples are not a representative user study.

---

# 2. Creative direction: “Golden Editorial”

## 2.1 Three inspirations, one original identity

1. **Claude-like restraint** — warm surfaces, considerate spacing, uncluttered writing, minimal system chrome.
2. **A personal manuscript** — expressive editorial serif and chapter structure. A reading is a story, not a metric dashboard.
3. **Indian Jyotish provenance** — unmistakable but restrained cues: Janma Nakshatra, Rashi, Dasha periods where calculable, an actual chart only when computed, and respectful localized language.

We **borrow principles**, not Claude's proprietary logo, typography assets, identical composer layouts, color values, or recognizable UI trade dress. Muhūrta must be its own brand.

## 2.2 Visual hierarchy

**Page order:**

1. The answer that matters.
2. One supporting explanation.
3. One primary action.
4. Supporting facts, available on demand.
5. Secondary journeys below the fold.

A screen may contain numerous capabilities, but only one should dominate the first viewport.

## 2.3 The two-surface brand model

**Private reading: light mode first.** Warm ivory, editorial black text, antique gold links and marks. Optimized for daily comfortable reading on common Android devices in daylight.

**Special share edition: ink-and-gold.** Dark charcoal/brown, off-white text, warm gold details. Used for opted-in share artifacts, not forced on the full app. A coherent dark app mode can be implemented later for OS accessibility/preferences.

---

# 3. Color system — exact tokens

Use semantic names. **Never scatter hardcoded hex colors throughout screens.** Raw palette and functional semantic tokens must be centrally owned.

## 3.1 Primary light palette

| Token | Hex | Role |
|---|---|---|
| `canvas` | `#F8F5EE` | App background, full-page reading canvas |
| `paper` | `#FFFCF6` | Elevated reading sheets, inputs, bottom sheets |
| `ink` | `#242019` | Primary body text, large titles, icon emphasis |
| `inkSecondary` | `#5E574E` | Explanations, supporting body text |
| `inkTertiary` | `#6B6256` | Metadata, captions when contrast allows |
| `goldText` | `#77541F` | Small gold text, accessible links, eyebrow labels |
| `goldAccent` | `#A67B35` | Nonessential visual accents, illustration lines |
| `goldButton` | `#C59B4F` | Gold primary CTA background **with `ink` text** |
| `goldWash` | `#F3E8D2` | Selected chips, gentle emphasis, reflection areas |
| `line` | `#E8E0D3` | Subtle hairline dividers and card boundaries |
| `night` | `#201B16` | Share-only dark background and special reading |
| `white` | `#FFFFFF` | Utility only, not default app background |

## 3.2 Semantic feedback (quiet, not traffic lights everywhere)

| Token | Suggested color | Role |
|---|---|---|
| `successInk` | `#285D46` | Confirmed user action; **not predictive accuracy** |
| `successWash` | `#E4F0E7` | Success area background |
| `warningInk` | `#88551B` | Input limitation or time-rule caution |
| `warningWash` | `#FCEDD8` | Caution area background |
| `errorInk` | `#933E39` | Validation/form/API errors |
| `errorWash` | `#F9E9E6` | Error area background |
| `focusRing` | `#77541F` | Accessibility focus outline |

Final semantic state colors must pass accessible contrast in their actual text/background pairings. Favor **plain wording plus icon**, not color-only meaning.

## 3.3 Dark share palette

| Token | Hex |
|---|---|
| `shareCanvas` | `#201B16` |
| `shareSurface` | `#2C251D` |
| `shareTitle` | `#F7F0E3` |
| `shareBody` | `#D2C6B5` |
| `shareGold` | `#C59B4F` |
| `shareGoldLight` | `#DCC49B` |
| `shareLine` | `#675742` |

## 3.4 Contrast guidance (verified combinations)

Approximate WCAG contrast ratios:

- `ink` on `canvas`: **14.9:1**
- `inkSecondary` on `canvas`: **6.5:1**
- `goldText` on `canvas`: **6.3:1**
- `ink` on `goldButton`: **6.3:1**
- `shareGoldLight` on `shareCanvas`: **10.1:1**
- **Avoid** white on `goldAccent` for small CTA text: approximately **3.8:1**, below normal-text AA.

**Gold use budget:** about 5–10% of visual area on a normal screen. Use gold primarily for brand, primary CTA, active navigation, fine marks, and carefully chosen headings. Gold must *not* outline every card.

## 3.5 Background rules

- No all-screen warm gold gradient.
- No visible repeated starfields.
- No glossy blue/purple nebula wallpaper.
- No decorative blur behind body text.
- Use near-flat canvas. Optional extremely subtle paper grain at low opacity only if it survives low-end phone testing and does not create banding.
- Use a quiet top/bottom tonal shift only on onboarding hero or share artwork.

---

# 4. Typography system — exact roles

**Font strategy:** Serif for **what the user reads**; sans for **what the user operates**. Do not apply a single `GoogleFonts.instrumentSansTextTheme(...)` over every previously configured display style and accidentally replace the headings.

## 4.1 Candidate families

- **Editorial English headings:** `Newsreader` (preferred initial prototype), with existing `Fraunces` as A/B candidate. License and font availability must be checked before bundling.
- **English app UI and body:** `Instrument Sans` (existing, continue).
- **Dates, numeric calendar strips:** Instrument Sans with `FontFeature.tabularFigures()`; JetBrains Mono only for very specific dense diagnostics.
- **Telugu titles:** Noto Serif Telugu; **Telugu body:** Noto Sans Telugu.
- **Hindi titles:** Noto Serif Devanagari; **Hindi body:** Noto Sans Devanagari.

Font files belong inside the app's build assets; do not ship or expose proprietary fonts. Test font fallback, glyph coverage, punctuation, line-breaking, and platform rendering.

## 4.2 Mobile type ramp (logical pixels, baseline, not mandatory at every text scale)

| Token | Size | Weight | Line height multiplier | Example |
|---|---:|---:|---:|---|
| `displayHero` | 40 | 400 serif | 1.08 | “Your life has a story.” |
| `displayChapter` | 34 | 400 serif | 1.12 | Main Decode/Chapter reveal |
| `headline` | 28 | 500 serif | 1.16 | Section narrative title |
| `title` | 23 | 500 serif | 1.20 | Reading section heading |
| `titleUi` | 18 | 600 sans | 1.30 | Compact panel title |
| `bodyReading` | 17 | 400 sans | 1.57 | Multi-sentence interpretation |
| `bodyUi` | 15 | 400 sans | 1.46 | Controls/explanations |
| `bodySmall` | 14 | 400 sans | 1.44 | Secondary utility |
| `label` | 13 | 600 sans | 1.25 | Button/chip/tab |
| `eyebrow` | 11–12 | 600 sans | 1.30 | Chapter label; sparingly |

For long Telugu/Hindi paragraphs, use language-specific typography tests; increase line height where the script needs it. Preserve natural scaling. **Do not clip text, hard-truncate critical readings, or use `maxLines: 2` on paragraphs.**

## 4.3 Copy typography rules

- Sentence case; **no ALL CAPS** for full sentences.
- Eye-catching serif headlines should be short enough to wrap naturally into 2–4 lines.
- No overly small dense tags across a full screen.
- Reading measure: 36–58 characters per line when screen width permits; otherwise use 20–24 px margins.
- Never justify paragraph text on mobile.
- Avoid center-aligned long passages; center only short hero copy.
- Prefer **one paragraph + progressive disclosure** rather than six short boxes repeating it.

---

# 5. Layout and spacing grammar

## 5.1 Spacing tokens

Use a 4-pixel base: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

| Token | Value | Typical usage |
|---|---:|---|
| `pageHorizontal` | 20 | Default compact phone left/right margin |
| `pageHorizontalWide` | 24 | Large phones |
| `sectionGap` | 32 | Between distinct narrative chapters |
| `cardPadding` | 20 | Standard reading section |
| `heroPadding` | 24 | Main first-viewport feature |
| `controlHeight` | 52 | Main text/button fields |
| `tapTargetMin` | 48 | Important mobile interactions |
| `navHeight` | device-adaptive | Bottom navigation + safe area |

Do not apply a uniform 16px padding to every widget. That repetition is part of the current dashboard look.

## 5.2 Corner radii

| Surface | Radius |
|---|---:|
| Main reading sheet | 18–22 |
| Full-size hero editorial feature | 24 |
| Button | 14–16 |
| Input / selector | 14 |
| Chips | Full pill for concise filters only |
| Bottom sheet | 24 top corners |
| Share artifact | Card proportion-specific; 0–24 for editorial formats |

Use no heavy shadow by default. Boundaries should come from **background, spacing, and typography**; light borders only for selected or interactive surfaces.

## 5.3 Responsive behavior

- **360–399dp:** preserve body text readability and one-column story layout; no 3-column trait cards.
- **400–599dp:** slightly wider margins, comfortable editorial hero.
- **600–899dp:** max reading width 540–620; flexible navigation.
- **900dp+:** max reading measure 680 for text; explanatory secondary column optional.
- Support display cutouts, Android status/navigation bars, text-scale 200%, and keyboard insets.
- Avoid blindly using hardcoded screen height for onboarding because of small devices and keyboards.

---

# 6. Motion system: “invisible craft”

We want Claude-like calm: **responsive, not animated-for-animation's-sake**.

## 6.1 Motion tokens

| Token | Duration | Curve | Usage |
|---|---:|---|---|
| `instant` | 80–120ms | easeOut | Touch acknowledgement |
| `fast` | 150–180ms | easeOutCubic | Selection, small state change |
| `standard` | 220–280ms | easeOutCubic | Fade, content reveal |
| `chapter` | 320–420ms | easeInOutCubic/spring tuned | Card → detailed chapter |
| `sheet` | 280–360ms | easeOutCubic | Why drawer / bottom sheet |
| `stagger` | 35–55ms | n/a | At most first 3–4 visual groups |

## 6.2 Purposeful behaviors

- **Button press:** 0.99 scale, subtle opacity and built-in haptic where appropriate. Haptic fires once on completed action, not touch-down and touch-up.
- **Page entry:** fade and 8–12px translation, not 5% viewport travel. Avoid double-animation from router + per-widget entrance.
- **Card → Chapter:** preserve the originating object's spatial relationship; animate between actual positions where feasible; no aggressive zoom.
- **Life Atlas:** selected chapter moves/expands, other periods remain stable; never animate timeline as a fake forecast.
- **Why:** expand in place or a sheet that does not abruptly shift content.
- **Generating content:** keep the previous meaningful content visible; reveal newly ready sections gently.
- **Share confirmation:** small reversible confirmation, not confetti.
- **Loading:** static/skeleton reading shapes; no endless animated moon medallion for every API request.
- **Reduced motion:** disable/shorten nonessential movement when OS requests it.

## 6.3 Performance rules

- Profile Android in **profile/release** mode on a representative midrange device.
- Target smooth 60Hz, and test 90/120Hz devices when available. Avoid dropped frames on tab switching/scrolling.
- Repaint boundaries around custom painters; stop tickers on hidden tabs.
- Preserve scroll positions and forms across tab switches.
- Don't mount every expensive tab or start every request concurrently without need.
- No heavy 3D renderer, no video hero, no Rive dependency unless a proven single high-value motion calls for it.
- Built-in Flutter + existing `flutter_animate` is sufficient for most proposed motion.

---

# 7. Core components and states

Create primitives before rebuilding feature screens. A component is reusable by **behavior and information role**, not merely by appearance.

| Component | Visual behavior | Required states |
|---|---|---|
| `MuhPageScaffold` | Ivory canvas, safe area, consistent max-width | loading, normal, keyboard |
| `MuhAppTopBar` | Wordmark/context/profile without overcrowding | scroll, profile selected |
| `MuhEditorialHero` | Big serif title, 1 supporting sentence, one action | short/long/localized |
| `MuhReadingSection` | Text-led section; usually *without* border | preview/expanded/loading |
| `MuhChapterEyebrow` | GoldText small identifier | text scale and localization |
| `MuhFactRow` | One birth/calculated detail with trace | available/qualified/missing |
| `MuhWhyDrawer` | Plain-language rationale → traditional factors → raw calculation | full/partial/unavailable |
| `MuhChoiceTile` | Low-chrome choice, crisp selected goldWash | idle/selected/disabled/error |
| `MuhPrimaryButton` | goldButton + dark text | idle/pressed/loading/disabled |
| `MuhQuietButton` | transparent ink/gold text | focus/pressed/disabled |
| `MuhLifeChapterRow` | Year/period + title, subtle active mark | past/current/future/unknown |
| `MuhPeriodRail` | Accessible chronological navigation | zoom/selection/dense periods |
| `MuhTimingWindow` | Purpose label/time + evaluated status + why | good/caution/neutral/unassessed |
| `MuhPromptComposer` | Simple multiline input and send | empty/typing/sending/error |
| `MuhReflectionChoice` | Matched/partly/not matched + optional notes | saved/failed/undo |
| `MuhSharePreview` | True 9:16 and 4:5 preview | redact/edit/share/cancel |
| `MuhInlineStatus` | Calm factual empty/error progress message | offline/stale/retry |

**Component laws:** No card should exist solely to make the page look busy. No decorative progress bars without a computed quantity. Every action target must actually work, including keyboard/screen reader states.

---

# 8. Screens — detailed visual and interaction specs

## 8.1 Welcome — “An invitation, not a signup poster”

**User question:** “Why should I spend 60 seconds on this?”  
**Hero sentence:** “Your life has a story.”  
**Supporting sentence:** “Explore the chapters you've lived, understand traditional Jyotish themes, and discover your own reading.”  
**CTA:** “Explore my life story” or “Start my reading”.

**Composition from top:** small wordmark → exceptionally subtle custom celestial time mark (not generic space art) → giant headline → 2-line supporting text → one gold CTA → brief privacy/uncertainty note. Do not waste half the viewport on empty decorative wallpaper.

**Motion:** one short fade/scale of time mark and headline. Then rest. **Do not** animate every element with a 1.1s parent transition *and* staggered transitions, as in the inspected prior code.

**Success:** user can identify what the app offers and how to start within 5 seconds.

## 8.2 Authentication

One calm screen. Phone entry and OTP follow familiar India mobile patterns. Use platform SMS autofill where supported. On error, show a plain, useful message, without a giant modal. Never hide the keyboard CTA or make legal/privacy text inaccessible. No artificial visual excitement around OTP.

## 8.3 Onboarding — “Ask like a thoughtful guide”

Sequence (preserve existing data-entry capabilities, reduce friction):

1. **What matters to you now?** One concern; selection adjustable later.
2. **Your birth basics:** Name (optional for first interpretation if backend allows), date, birth place, current location, language.
3. **What do you know about your birth time?** Exact, approximate range, unknown. No forced rectification.
4. **Do you know your Janma Nakshatra?** Optional selector with “I don't know.”
5. **Review:** One concise line describing the *kind* of reading available; not a fabricated accuracy percentage.
6. **Begin:** Directly into an available preliminary result, progressive generation visible as needed.

One primary question per viewport. A step counter (`02 of 04`) may appear, but don't turn every question into a long form with 14 identical cards. For concern choices, show 2-column high-contrast simple tiles only if text remains readable; otherwise single-column.

**Privacy wording:** Birth data is personal; explain storage, use, export/delete access, and sharing control.

## 8.4 Quick Proof — “The first recognition moment”

**Purpose:** Build curiosity while allowing the user to assess *whether* an interpretation fits, rather than asserting personal history as fact.

Layout per one card/chapter:

```text
MUHŪRTA                           01 / 04

A CHAPTER FROM YOUR PAST

The years you began
to question direction.

2017 – 2020 (illustrative)

[2–4 lines about a traditional life-phase theme,
 strictly from available supported facts]

Why this reading?  →

Does this reflect your experience?
[Yes] [Partly] [No] [Wrong timing]

             Next chapter →
```

- One chapter per view; swipe only in this focused validation context.
- Preserve original wording before feedback; never silently rewrite past predictions to fit user feedback.
- Respect unknown birth-time uncertainty. Exact period boundaries must not be shown unless calculable.
- User validation is a subjective match indicator; never display it as scientific predictive accuracy.
- No auto-sharing of “matched” feedback or private events.

## 8.5 Decode — **the flagship first reveal**

**Job:** A beautifully presented, personally relevant *Janma reading*, not a Western personality test.

### First viewport

```text
muhūrta                          [Profile]

DECODE / YOUR JANMA READING

The way you make
sense of the world.

[2–4 lines of approved personal interpretation]

   [A quiet, genuinely meaningful small gold motif]

[Why this reading? ↗]

------------------------------------------------
YOUR JANMA MARKERS
Nakshatra • Rashi • Birth detail mode   [View]

[Continue reading ↓]
```

**Layout composition:**

- Wordmark/top contextual title uses 16–20px sans/serif appropriately.
- Eyebrow identifies the reading's nature. Do not call it “AI-powered personality insights.”
- First heading uses 34–40px expressive serif, `ink` on `canvas`.
- Summary = 17px readable sans, 1.55 line height, no more than 4–6 visible lines in the top section; expansion permitted.
- **Zero percentages**. No “92% openness”, no five concentric rings, no RGB trait chips.
- Birth information, if known: visible as a calm fact row, perhaps with a tiny computed Janma chart preview **only if a real chart exists**.

### Scroll sections (in order)

1. **Your inner nature:** one best supported, non-generic identity interpretation.
2. **What comes naturally:** two or three distinctive strengths (no identical copy across categories).
3. **Where it gets harder:** two or three watchouts, stated respectfully and specifically without mind-reading.
4. **How it shows up:** career, relationships, decisions; link out to relevant deep explorations.
5. **Why Muhūrta says this:** short explanation plus optional traditional details and calculated basis.
6. **Reflection:** “Does this fit your experience?” with saved state, undo, and privacy notice.
7. **Story Gallery:** optional, explicitly reviewed shareable version of the selected interpretation.

Avoid showing all categories above the fold. The share button must not compete with the first meaningful insight; put a compact share icon at top or a stable, contextual CTA after the reveal.

### Empty and uncertain modes

- Full chart: show supported terms and computed factors.
- Approximate birth: omit unstable claims, show “Some chart details depend on birth time.”
- Nakshatra-only: show nakshatra-based interpretation, never exact Lagna/dasha boundaries without required information.
- No natal details: show meaningful general Panchanga introduction and invitation to improve details; **do not fabricate a personal personality profile**.

### Experience quality

Use one useful scroll page with **editorial rhythm**. Alternate between open text sections, an occasional paper sheet, and dividers. No six giant bordered rectangles in a row.

## 8.6 Life Map / Life Atlas — **signature interaction**

**Job:** Make available life-period data personally explorable, not decorate a horoscope feed.

Main view:

```text
YOUR LIFE ATLAS

Chapters of becoming

[Past] — [Current] — [Coming]

2015       2019        2026        2030
 ●──────────●───────────◎───────────●

      CURRENT CHAPTER
      [Actual computed period date range, if reliable]

      A chapter of building.
      [Concise interpretation]

      [Open chapter] [Why?]
```

**Visualization rules:**

- A timeline means *sequence and duration*, not life success. Do not draw rising/falling performance graphs unless they map to an honestly defined quantity.
- Derive period positions from valid dates. For approximate dates, use bands and clear qualifiers.
- Each node can open a long-form narrative page with title, range, key themes, potential tension, practical reflection, evidence, and user feedback.
- Current position is unmistakable but not highlighted with an alarming glow.
- Nearby chapter transitions may preview when a swipe nears them.
- Allow an accessible **list view** for screen readers, reduced motion, older phones, and users who dislike timelines.
- If 25 periods exist, never dump 25 identical cards on one page; use period grouping and progressive reveal.
- Use actual time labels and mark “future interpretation” rather than asserting future facts.

**Past proof integration:** Past chapters include match/partial/not/wrong timing interaction; no invented past events. User-supplied events are clearly distinguished from generated themes.

## 8.7 Today — **the daily reading ritual**

**Job:** “What deserves my attention today?”

Order:

1. Date and location, quietly.
2. One current-day reading (max 2–4 lines); generated only from existing approved facts.
3. Compact current life-chapter tie-in when supported.
4. “What are you planning?” action chips (Interview, Business, Travel, Family, Property, etc.).
5. Purpose-selected evaluated good/caution/unassessed timing area.
6. Why-this-time drawer, optional remedy/practice, and reflection.

**Avoid:** green/amber dashboard banners, fake “calibration” percentages, urgent countdowns, duplicate timing cards, random finance/task advice without user context.

**If timing not available:** Show “We can't assess a suitable window yet” and a clear reason. Do not invent a favorable interval to fill visual space.

## 8.8 Timing — **the precision instrument**

**Job:** Choose purpose + date; receive evaluated traditional timing, with transparent limitations.

Visual style is more utility-focused, but uses the same gold/ivory system:

- Date control and purpose selector first.
- Single horizontal time-strip or calendar schedule with distinguishable states.
- Large time ranges and simple explanations; location, timezone, and calculation basis remain discoverable.
- Side/expanded drawer shows used rules, rule precedence, conflicts, input mode, and provenance.
- **Never** silently mark a window auspicious if it overlaps a disqualifying traditional interval under the chosen policy.
- Never imply timing guarantees a job, marriage, recovery, or financial outcome.

## 8.9 Ask — **quiet personal consultation**

**Job:** A comfortable place to ask, understand, and navigate to richer evidence.

- No big chat-bubble walls for assistant responses.
- One restrained input/composer with natural line expansion, clear attach/context settings only when implemented.
- Short contextual suggested questions, grounded in the available pack and user choices.
- Responses use a short direct answer, a supporting interpretation, and optional “Why?” / “View timing” / “Explore chapter” follow-ups.
- Personal memory must be permissioned, editable, and distinguishable from generated interpretation.
- If no chat history exists, do **not** describe the system as already remembering the user's life.
- Fallback copy must not imply favorable timing where timing is unavailable.

## 8.10 Profile, privacy and paid experience

**Profile:** A calm settings list with birth details, active chart, language, input quality, memory controls, notifications, data export/delete and billing. No “accuracy %” gauges.

**Paywall:** One clear premium value proposition: deeper stories and other actually implemented benefits. Display plan terms accurately; do not gate users from seeing why an initial interpretation was generated. Never use fear, impending bad events, or exaggerated predictive certainty to sell.

**Notifications:** Optional and user controlled. Do not send sensitive interpretations to a lockscreen without an explicit preview-setting choice.

---

# 9. Story Gallery & share-first output

**Virality must come from real, distinctive insights, not CTA saturation.** A share is a user-selected publication event.

## 9.1 Four editorial share families

| Format | Purpose | Content source | Privacy requirement |
|---|---|---|---|
| **Identity Portrait** | “This is a part of me” | `me_profile`, `user_identity` | Explicit approval; no DOB by default |
| **Life Chapter** | “This chapter resonates” | `journey_phases`, `life_map` | Dates only if approved and appropriate |
| **Purpose Timing** | “Here's the selected moment” | Evaluated timing result | Label traditional basis; no outcome guarantee |
| **Reflect Together** | Discuss two chosen perspectives | Two consented profiles, if feature exists | Both parties' consent; no automatic public comparison |

Last item is **conceptual**, not currently established as implemented. Defer until consent and comparison engine design exist.

## 9.2 Layout sizes

- **9:16 vertical Story:** 1080 × 1920 visual canvas, safe text region away from platform UI.
- **4:5 Feed:** 1080 × 1350.
- **1:1 Preview:** 1080 × 1080, if text is short enough.
- **OpenGraph:** 1200 × 630 (bespoke composition, not a squashed story image).
- Ensure text size remains legible after a WhatsApp screenshot/compression.

## 9.3 Share card design specifications

**Private-reading card / Ivory Edition**

```text
muhūrta                     [tiny custom time mark]

YOUR JANMA STORY

The way you
make sense of things.

One meaningful interpretation, 25–40 words max.

An interpretation in the tradition of Indian Jyotish.

Discover your own story   [brand URL]
```

**Special edition / Night Gold**

```text
muhūrta                                   ✧

A CHAPTER FROM MY LIFE STORY

The years that
changed my direction.

Period / theme (only if user-approved)

[Minimal gold line-art / time mark]

Discover your own story ↗
```

Do not automatically print someone's full name, location, birth date, chart, phone, or private reflection on an export. Provide preview + redaction controls. Public share links must fetch only explicit approved share-payload fields.

## 9.4 Content selection, not generic quote generation

Editorial gate for candidate selection:

1. **Grounded:** every factual or chart-derived claim has a supported source.
2. **Distinctive:** not interchangeable with any horoscope or productivity quote.
3. **Human-readable:** one complete, memorable idea without jargon.
4. **Non-fearful:** no threats, fatalism, or promises.
5. **Privacy-safe:** minimal disclosure.
6. **Non-repetitive:** different from other exported cards.
7. **User-approved:** final consent at preview.

If nothing passes, offer “Share the app” rather than generating a sensational false insight.

## 9.5 Recipient journey

`Read in app → Preview card → Edit/hide fields → Share → /c/{id} → See exact safe card → Explore own story → Install/open app`

- OG image reflects the exact approved safe share payload.
- The recipient landing page should be attractive even without app installation.
- Deep link routes to relevant content only if authorized, otherwise to private onboarding.
- No PII in query strings or public analytics.
- Do not create publicly indexed personal pages by default (`noindex` for personal content where appropriate).

---

# 10. Responsive website — same product, not a generic legal site

The public website is the exterior of the app's private reading room. Build with the same tokens, type, imagery, voice, and spacing.

## 10.1 Site map

- `/` — product landing
- `/explore` — consent-free interactive sample using **fictional** data
- `/life-atlas` — explain the life-story concept and evidence boundaries
- `/c/{shareId}` — approved public share landing with correct OG data
- `/download` — app store CTA with referral attribution
- `/privacy`, `/terms`, `/delete-account` — clear legal controls

## 10.2 Landing page wireframe

```text
[ m u h ū r t a ]        How it works    Life Atlas    [Start my story]

---------------------------------------------------------------

Your life has a story.
Look back. See the pattern. Choose your next chapter.

Personal Jyotish interpretations, explained in human language.

[Explore a sample life]       [Get the app]

             [beautiful phone mockup of real Decode hero]

---------------------------------------------------------------

01   See what feels familiar              [Decode example]
02   Explore the chapters of your life   [Life Atlas example]
03   Find relevant traditional timing    [Timing example]

---------------------------------------------------------------

A reading you can understand.
[Why we say this] [What we cannot know]

---------------------------------------------------------------

[approved public share gallery, fictional examples]

Start your story →

[legal / disclosure / footer]
```

## 10.3 Web visual spec

- Desktop page max-width 1200–1240px; reading copy measure ~650px.
- Hero desktop serif 64–76px; mobile 38–44px.
- Ivory/ink base; gold only for CTA, small label, brand.
- No distracting auto-play space video or generic zodiac stock images.
- Product mockups must reflect actual app design; don't market invented AI feats.
- Share landing LCP/performance: prioritize lightweight HTML/CSS/text/OG image, minimal client JS.
- Mobile menu, focus visibility, keyboard access, and localization.

---

# 11. Content strategy and data-to-UI mapping

## 11.1 Current Supabase fields: highest-value placements

| Available field | User-facing output | Rule |
|---|---|---|
| `me_profile.title`, `.summary` | Decode hero | Must clear editorial gate |
| `me_profile.strengths`, `.watchouts` | Decode subchapters | No arbitrary personality scores |
| `user_identity` | Supporting identity narrative | Never imply a reported fact from archetype text |
| `current_phase` | Today context / Life Atlas current node | Precise dates require adequate birth information |
| `life_map` | Life Atlas grouping | Correct period boundaries only |
| `journey_phases`, `journey_phase_facts` | Full chapter narrative and Why drawer | Preserve traditional provenance |
| `likely_life_events` | Optional past reflection prompts | Never assert the event happened |
| `category_reports` | Topic explorations | User concern determines priority |
| `today_guidance`, `today_cards` | Today reading | Not all 16 cards on one page |
| `weekly_cards`, `monthly_cards` | Upcoming chapter previews | Avoid duplicate productivity advice |
| `timing_plan`, live timing result | Timing page | Live calculation is authoritative for window, not pack prose |
| `ask_knowledge`, `ask_templates` | Ask suggestions/shortcuts | Do not hallucinate memory |
| `share_cards` | Gallery candidates | Must be curated and approved |
| `remedy_cards`, `remedy_pack` | Optional traditional practices | No fear or commercial pressure |

## 11.2 Data contract: separate text from facts

Introduce (or adapt to existing types) a **presentation view model** on the client or API boundary:

```ts
interface ReadingViewModel {
  id: string;
  locale: 'en' | 'te' | 'hi';
  kind: 'decode' | 'chapter' | 'today' | 'timing' | 'share';
  title: string;
  lead: string;
  body?: string[];
  sourceFactIds: string[];
  traditionRuleIds?: string[];
  inputMode: 'full_chart' | 'approximate' | 'nakshatra_only' | 'general';
  dateRange?: { start?: string; end?: string; precision: 'exact' | 'approximate' };
  claimStatus: 'supported' | 'qualified' | 'unassessed';
  shareEligibility: 'eligible' | 'review_needed' | 'blocked';
  privacy: 'private' | 'redactable' | 'public_safe';
  promptVersion?: string;
  modelVersion?: string;
}
```

This is **a design contract to adapt**, not a claim that these fields already exist in Supabase. Avoid a risky wholesale data migration solely for typography.

## 11.3 Editorial prompt upgrades

The observed generation rules use an across-the-board “sharp Indian friend on WhatsApp” voice. Replace with **role-specific tone profiles**:

| Surface | Voice |
|---|---|
| Decode | Insightful, personal, precise, warm; editor of a meaningful personal portrait |
| Life Atlas | Reflective, story-first; dates and uncertainty handled rigorously |
| Today | Concise, useful and grounded; one clear focus |
| Timing | Direct, factual, carefully qualified |
| Ask | Natural Indian conversational intelligence; warm but not chatty filler |
| Share | One elegant, self-contained, approved thought |

**Prompt rules to enforce:**

- Specificity only where source facts permit.
- No invented past events, professions, birth details, relationship status, guaranteed outcomes.
- No pseudoscientific accuracy score.
- No repeated “clean up/finish tasks/be practical” copy across 5 sections unless each has genuinely separate grounds.
- Do not use line-count quotas to force generic verbosity; use meaningful content length bands by screen.
- Never fabricate precise timestamps, Dasha dates or chart placements.
- Do not treat astrological tradition as scientifically verified outcome prediction.
- Every personal claim includes an evidence ID or a clear qualifier in the structured data.
- Prefer smaller numbers of excellent insights over a large volume of paraphrases.
- Fail closed or return “not enough information” when input quality cannot support a claim.

## 11.4 Content quality gates

Before exposing a story or share candidate:

1. Schema validation and nonempty required fields.
2. Trace source claims to engine facts and known user data.
3. Reject contradictory timing/phase claims.
4. Detect semantically repeated paragraphs across horizons and cards.
5. Detect generic Barnum-style statements; use human spot checks, not just blacklist words.
6. Validate locale and script; distinguish Telugu language versus Tenglish preference intentionally.
7. Prevent unsupported exactness and unapproved personal disclosures.
8. Save generation/prompt version for reproducibility and rollbacks.
9. If pack partially complete, present only ready sections; otherwise show appropriate loading/error.

**P0 backend anomaly:** Reconcile pack `status` with `_generation.phases_done` and `screens_ready`, and test `today` readiness. The audited single pack had completed phase flags but remained `generating`; do not ship contradictory status indicators.

---

# 12. Flutter implementation map — file-by-file

**No architecture rewrite.** Add new primitives and migrate one feature at a time behind reviewable feature flags if needed.

## 12.1 Existing file adjustments

| File | Required work |
|---|---|
| `app/lib/design_system/muhurta_colors.dart` | New golden editorial palette + semantic status tokens |
| `app/lib/design_system/muhurta_type_scale.dart` | Named reading/editorial/UI type ramp |
| `app/lib/design_system/muhurta_spacing.dart` | Contextual spacing tokens, not uniform card padding |
| `app/lib/design_system/muhurta_radius.dart` | Consistent, restrained shape system |
| `app/lib/design_system/muhurta_motion.dart` | Reduced-motion-aware motion durations and springs |
| `app/lib/app/muh_theme.dart` | Explicit serif display styles and sans body styles; gold buttons |
| `app/lib/app/muh_router_transitions.dart` | Cut redundant fade/stagger; route-specific transitions |
| `app/lib/features/home/home_shell.dart` | Screen hierarchy, first-session vs returning default, retained tab state |
| `app/lib/features/welcome/welcome_screen.dart` | Editorial hero, one CTA, no double entrance animation |
| `app/lib/features/onboarding/*` | Conversational steps and low-friction choice layout |
| `app/lib/features/onboarding/quick_proof_screen.dart` | Single chapter proof, reflect and progress |
| `app/lib/shared/widgets/celestial_components.dart` | Replace broad stylistic containers with composable semantic widgets |
| `app/lib/shared/widgets/orbital_backdrop.dart` | Restrict decorative geometry to special contexts; don't sit behind all reading text |
| `app/lib/shared/widgets/muhurtha_loading_view.dart` | Context-aware skeleton and unobtrusive generation status |
| `app/lib/shared/widgets/muh_timeline_hero.dart` | Calm, evaluated timeline component; avoid day-bias oversimplification |
| `app/lib/shared/widgets/share_story_card.dart` | New Ivory / Night Gold export templates |
| `app/lib/core/share/share_card_service.dart` | Privacy-safe pre-export review, size presets, link consistency |
| `app/lib/core/data/birth_pack_views.dart` | Build presentation data efficiently without duplicating engine facts |
| `supabase/functions/muhurtha-api/birth_pack_multiturn.ts` | Editorial role profiles and reduced repeated writing |
| `supabase/functions/muhurtha-api/birth_intelligence_pack.ts` | Improved quality gates, completion consistency |
| `supabase/functions/muhurtha-api/ask_pack.ts` | Guard unsupported fallback timing claims |
| `supabase/functions/share-preview/index.ts` | OG card rendering based solely on approved share payload |

## 12.2 New reusable Flutter primitives

Suggested additions:

```text
app/lib/design_system/
  muh_color_scheme.dart
  muh_typography.dart
  muh_semantics.dart
  muh_reading_theme.dart

app/lib/shared/widgets/editorial/
  muh_page_scaffold.dart
  muh_editorial_hero.dart
  muh_reading_section.dart
  muh_chapter_header.dart
  muh_fact_row.dart
  muh_why_drawer.dart
  muh_reflection_choice.dart
  muh_chapter_timeline.dart
  muh_share_preview.dart
  muh_skeleton_reading.dart

app/lib/shared/widgets/story/
  identity_portrait.dart
  chapter_portrait.dart
  timing_portrait.dart
```

These are recommended locations. Adapt to existing conventions; avoid multiple near-identical implementations.

## 12.3 Theme implementation sketch

```dart
// Schematic. Adapt to the project's installed Flutter SDK and theming API.
abstract final class MuhGold {
  static const canvas = Color(0xFFF8F5EE);
  static const paper = Color(0xFFFFFCF6);
  static const ink = Color(0xFF242019);
  static const inkSecondary = Color(0xFF5E574E);
  static const goldText = Color(0xFF77541F);
  static const goldButton = Color(0xFFC59B4F);
  static const goldWash = Color(0xFFF3E8D2);
  static const line = Color(0xFFE8E0D3);
}

// Serif display, sans body: assign explicitly, not by stacking
// global text-theme replacements that silently remove serif.
final base = ThemeData(useMaterial3: true, brightness: Brightness.light);
final textTheme = base.textTheme.copyWith(
  displayLarge: GoogleFonts.newsreader(fontSize: 40, height: 1.08,
      color: MuhGold.ink),
  headlineLarge: GoogleFonts.newsreader(fontSize: 34, height: 1.12,
      color: MuhGold.ink),
  titleLarge: GoogleFonts.newsreader(fontSize: 23, height: 1.20,
      color: MuhGold.ink),
  bodyLarge: GoogleFonts.instrumentSans(fontSize: 17, height: 1.57,
      color: MuhGold.ink),
  bodyMedium: GoogleFonts.instrumentSans(fontSize: 15, height: 1.46,
      color: MuhGold.inkSecondary),
);
```

For locales, set title/body fonts separately rather than applying one language font indiscriminately to every slot. Resolve typography from `Locale`, `MediaQuery.textScalerOf(context)`, and type role.

---

# 13. Web implementation notes

The website should **share semantic tokens and type definitions** through a package or JSON manifest, not recreate the brand by eyeballing Flutter screenshots. E.g.:

```json
{
  "color.canvas": "#F8F5EE",
  "color.paper": "#FFFCF6",
  "color.ink": "#242019",
  "color.gold.text": "#77541F",
  "color.gold.button": "#C59B4F",
  "font.display": "Newsreader",
  "font.body": "Instrument Sans",
  "radius.reading": 20,
  "space.page.mobile": 20
}
```

- Reuse the existing deployment platform if stable; do not migrate purely for branding.
- Server-generate share-page metadata where possible.
- Use a consistent `/c/{id}` safe public schema; no private Supabase rows exposed in browser code.
- Keep CSS animations optional and low-motion-friendly.
- Test og:image in WhatsApp/social preview scrapers, not just browser view.
- Implement canonical URLs, localization routing as needed, and invalid/revoked share states.

---

# 14. Instrumentation, testing and quality gates

## 14.1 Design review matrix

Golden screenshot coverage (minimum):

| Screen | Variants |
|---|---|
| Welcome | 360dp, 430dp; English/Telugu/Hindi |
| Onboarding | Empty, selected, validation error, unknown birth time |
| Quick Proof | Short/long copy, first/last chapter, reflection saved |
| Decode | Full/partial/general data, short/long reading, languages |
| Life Map | Past/current/future; date uncertainty; dense 25 periods |
| Today | Normal, missing timing, stale, refreshing, offline |
| Timing | Good/caution/conflict/unassessed, 12/24-hour preferences |
| Ask | Empty, partial streamed text, citation/explanation, error, offline |
| Share Gallery | 9:16, 4:5, OG; privacy redactions; localized |
| Website | 375 mobile / 768 tablet / 1440 desktop; share links |

## 14.2 Accessibility acceptance

- WCAG AA contrast in actual rendered text/surfaces.
- Text scaling 200% without losing essential content or buttons.
- Interaction hit targets approximately 48dp or larger where feasible.
- Semantics labels for chart symbols, timeline selection, periods, validation controls and nav tabs.
- TalkBack and VoiceOver reading order checked.
- Reduced motion respected.
- No solely color-coded favorable/caution states.
- Photos/line art not necessary to understand the reading.
- Keyboard and screen-reader access to the time-line **list fallback**.

## 14.3 Motion/performance acceptance

- Run representative physical-device profile tests, not only emulator/debug.
- Tab switching does not reset Life Map location or Ask draft.
- First useful content remains visible while background pack generation continues.
- No offscreen forever-running animation tickers.
- Hero, share, and chapter transitions have stable layout; no overflow from language changes.
- No layout jumps from late font fetches; bundle fonts or ensure robust fallback and warmup.

## 14.4 Quality and privacy acceptance

- No fabricated chart factor, date, outcome certainty, score or “calibration %”.
- Share content exactly matches the preview and approved redactions.
- Every personal statement is traceable to computed tradition/explicit user context or clearly qualified.
- There is a useful response when the birth time is unknown.
- No user-private content in public preview payloads, logs, URLs, or analytics by default.
- Play billing/entitlement integration preserved; paywall accurately reflects actual product.
- Translation/localization QA includes natural language, not simply literal ARB key presence.

## 14.5 Product success metrics (baseline before target)

- First meaningful insight viewed (time-to-value).
- First Decode scroll depth and “Why?” open rate.
- Quick Proof reflection participation and disagreement rates.
- Life Atlas chapters explored and return depth.
- Share preview → approved share rate.
- Recipient click → open/demo → install/registration conversion.
- Repeat visitors for Today; purposeful Timing and Ask usage.
- Generated content editorial rejection and duplicate rate.
- Cost per completed high-quality reading.

**Do not manufacture success numbers.** Collect baseline from consenting testers and compare variants.

---

# 15. Implementation sequence with acceptance gates

## Phase A — Art direction lock (no production-wide rewrite)

**Deliverables:** 3 real-size, faithful Flutter/HTML prototypes using the *same* sample read, with the Golden Editorial direction iterated for type and layout; not 3 generic unrelated themes.

1. Decode full viewport (short and long real-data-style content).
2. Life Atlas current/past chapter.
3. Today concise reading.
4. 9:16 Identity Portrait share asset.
5. Home landing hero and `/c/{id}`.

**Gate:** No design implementation across all screens until this family passes side-by-side review on real Android dimensions, including Telugu.

## Phase B — Foundations

Implement tokens, type roles, button styles, surfaces, navigation treatment, reduced-motion foundation, and component-gallery golden fixtures. Preserve existing app functionality.

**Gate:** No hardcoded blue/graphite color remains in active user-visible features unless explicitly assigned a semantic function.

## Phase C — First aha moment

Redesign Welcome, Onboarding, Quick Proof, Decode. Hook to existing data and uncertainty modes.

**Gate:** One compelling, supported Decode story in the first viewport; all input modes render safely; feedback works; no invented facts.

## Phase D — Signature exploration

Build Life Atlas with real period semantics, open-chapter transitions, reason drawer, and reflected past events.

**Gate:** Navigation accessibility + dense periods + retention across tab switches + semantic accuracy tested.

## Phase E — Utility without dashboard aesthetics

Redesign Today, Timing, Ask, Profile, billing/reports. Remove duplicate data cards; simplify loading.

**Gate:** Calculated timing remains authoritative; Ask doesn't invent; app stays responsive.

## Phase F — Share gallery and web

Design/render share formats, approval/redaction, landing pages, OG, deep links, and demo.

**Gate:** Public preview matches approved content; privacy and metadata verified; recipients can explore without app install.

## Phase G — Real user validation

Conduct moderated studies across English/Telugu/Hindi, different birth-input knowledge levels, Jyotish-familiar and skeptical users, Android device price tiers. Compare old vs new build.

**Gate:** Qualitative reading preference and measured task success/retention improve without increased misinformation, latency, or support cost.

---

# 16. Quality checklist for product/design/engineering sign-off

- [ ] Light gold/ivory identity replaces generic fintech/sci-fi aesthetic.
- [ ] Brand looks unmistakably Muhūrta; does not copy Claude trademarks or UI exactly.
- [ ] Screens have **one primary visual idea** rather than five competing cards.
- [ ] Serif display styles really render serif; sans body styles render sans.
- [ ] Telugu/Hindi fonts, word wrapping and hierarchy are reviewed.
- [ ] Gold is restrained; text and buttons pass accessibility contrast.
- [ ] Bottom navigation is readable, context-aware and retains state.
- [ ] Decorative orbital graphics no longer compete with body text.
- [ ] Every loading, stale, empty and error state remains beautiful and truthful.
- [ ] Quick Proof offers genuine opt-in reflection; no manufactured validation.
- [ ] Decode never shows fake personality metrics.
- [ ] Life Atlas maps real/qualified periods without fabricated success trends.
- [ ] Today doesn't duplicate timings or make fake precision claims.
- [ ] Timing conflicts and rule provenance can be inspected.
- [ ] Ask preserves context only with appropriate permissions and honest state.
- [ ] Shares are editorially distinctive, user-selected and redacted.
- [ ] Public share metadata exposes only approved fields.
- [ ] Website and Flutter tokens/screens share one design system.
- [ ] Pack status/readiness inconsistency resolved or properly surfaced.
- [ ] Tests and actual screenshots reviewed on representative Android devices.

---

# 17. Copy-paste implementation brief for Cursor / Codex

> **TASK:** Implement **Muhūrta Golden Editorial** from this Markdown specification in the existing `prasanthkuna/muhurtha` repository. This is a controlled visual, information-architecture and editorial upgrade. Not a rewrite of the Jyotish engine.
>
> **Read first:** `MUHURTA_DESIGN.md`, `app/lib/design_system/*`, `app/lib/app/*`, `app/lib/features/*`, `app/lib/shared/widgets/*`, `app/lib/core/data/birth_pack_views.dart`, the current Supabase generation and share functions, and this document.
>
> **First output:** A source-grounded gap report of existing design/theme/data contracts, a list of candidate components and exact files to change, and a representative design-gallery fixture using synthetic/redacted data.
>
> **Visual mandate:** Warm ivory `#F8F5EE`, paper `#FFFCF6`, ink `#242019`, accessible deep gold `#77541F`, button gold `#C59B4F`, hairline `#E8E0D3`. Editorial serif headlines and Instrument Sans UI copy. Do not build a generic dashboard. Use gold sparingly. No neon space visuals, generic personality percentages, heavy gold card borders or busy animations.
>
> **Screen mandate:** Decode first-session aha; Life Map becomes interactive chapters; returning Today is personal-first; Timing remains purpose-driven and precise; Ask resembles a readable consultation; share exports become designed story cards; website matches the system.
>
> **Data mandate:** Reuse existing Supabase pack, deterministic timing and user context. Never invent chart/dasha values, past events or success probabilities. Reconcile pack `status`, `_generation.phases_done`, and `screens_ready` before treating the pack as fully complete. Improve copy deduplication and claim grounding. Share only approved redacted content.
>
> **Implementation protocol:** Implement tokens + typography + component gallery first; then Welcome/Quick Proof/Decode; then Life Atlas; then Today/Timing/Ask; then share/web. Keep changes reviewable, preserve auth/paywall/deeplinks/localizations, run tests and golden comparisons after each segment. Do not report completion for untested behavior. Provide screenshots from actual rendered builds, not AI-generated illustrations presented as product screenshots.
>
> **Completion report:** Files changed, before/after screenshots, design audit checks, locale/a11y results, runtime tests, engine unchanged/changed notes, known limitations and next decisions. Only declare production-ready once real-device review passes.

---

# 18. Non-negotiables and final art direction

**The brand does not need more astrology symbols. It needs better stories and better reading design.**

- **Claude-level restraint:** quiet backgrounds, generous reading space, elegant typography, gentle interactions.
- **Golden Muhūrta identity:** warm ivory, antique gold, comfortable Indian-script typography, real Jyotish cues.
- **Truthful personalization:** computed facts, qualified interpretations, user-approved history, no unsupported certainty.
- **Share-worthy artifacts:** polished editorial stories people choose to send, not sensational personality labels.
- **A better first minute:** the user sees a meaningful Janma reading before being pushed into a maze of features or subscriptions.

**Design test:** Cover the wordmark. If the screen could belong to any fintech or generic AI personality app, the design has failed. Read its headline. If it could be sent to anyone without changing a word, the content has failed.

**Final product standard:** A quiet, highly legible, genuinely Indian personal reading experience whose value and distinctiveness survive even after all decorative effects are removed.
