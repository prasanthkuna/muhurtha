# V3 Implementation Plan

## Product Decision

V3 should become a conversion-first personal timing product, not a broad astrology feed.

The right model is:

```text
One strong OpenAI birth decode + deterministic Jyotish timings + subscription-gated depth + share cards.
```

Keep the current Birth Intelligence Pack architecture, but reshape its output and UI around five screens:

1. Decode
2. Today
3. Timing
4. Life Map
5. Ask

## What Changes From V2

V2 still behaves like a content app: Today, Week, Month, Journey, Remedies.

V3 should behave like a personal dossier:

- Free users get a strong identity hit, two past proof cards, and one useful today timing.
- Paid users unlock full life map, category reports, weekly/monthly timing, remedies, Ask, and notifications.
- Share cards become a growth loop, not a small icon attached to every card.
- Ask becomes template-backed first, not full LLM chat on every message.

## P0: Backend Contract

### 1. Birth Pack V3 Schema

Add a new pack version:

```text
birth-pack:v3-conversion-dossier
```

Required top-level sections:

- `user_identity`
- `free_preview`
- `past_life_check`
- `current_phase`
- `category_reports`
- `today_guidance`
- `timing_plan`
- `life_map`
- `ask_templates`
- `share_cards`
- `notification_pack`
- `remedy_pack`
- `paywall_copy`

Do not delete V2 tables yet. V3 can sit on the same `birth_intelligence_packs` table with a new `pack_version`.

### 2. Stronger Onboarding Inputs

Before pack generation, collect:

- name
- DOB
- birth time or confidence
- birth place
- current city
- preferred language
- main concern
- optional upcoming event

Main concern options:

- Career timing
- Money growth
- Marriage / relationship
- Family pressure
- Business direction
- Good/bad time today
- Full life phases

Upcoming event options:

- Interview
- Manager talk
- Payment follow-up
- Travel
- Exam
- Family talk
- Purchase
- Launch
- Nothing now

### 3. One-Call Prompt Upgrade

The LLM must generate screen-ready content, not generic sections.

Rules:

- Different purpose for every screen.
- No repeated phase note across screens.
- No category keys in date fields.
- Natural language per user language.
- Age-aware tone.
- Indian daily examples.
- Share hook for every major insight.
- Past phases must sound already happened.
- Future phases must sound useful and exciting, not scary.

### 4. Access Model

Add a small server-side access helper:

```text
free | trial_decode | plus | pro
```

For now, the app can run without payments, but every card should already carry:

- `visibility`
- `locked`
- `unlock_reason`
- `paywall_hook`

This lets us add RevenueCat later without rewriting content.

## P1: Frontend IA Rebuild

### Screen 1: Decode

Replaces current `Me`.

Free sections:

- Core nature
- 3 strengths
- 2 watchouts
- Work/money pattern preview
- Relationship pattern preview
- One share card

Paid sections:

- Full identity report
- stress reset pattern
- deeper work/money/relationship blocks

### Screen 2: Today

Keep only what is useful today:

- main advice
- one strongest good window
- one avoid window / Rahu Kalam
- best for
- be careful with
- one remedy
- one shareable line

No repeated moon card. No repeated current phase note.

### Screen 3: Timing

Move Week and Month here.

Tabs:

- Week
- Month
- Current Phase

Each tab should have:

- one headline
- action focus
- caution
- best day/window if facts support it
- share line

### Screen 4: Life Map

This replaces long Journey as the main mental model.

Sections:

- Past Check: first two cards free
- Current Chapter: free summary
- Coming 12 Months: paid
- Long-Term Direction: paid

Each phase card:

- period
- main theme
- what may match
- career
- money
- family/relationship
- avoid
- share line

### Screen 5: Ask

V1 Ask should be template-backed from the pack.

Free:

- one sample Ask / day
- limited topics

Paid:

- all templates
- future phase questions
- category timing questions

Initial templates:

- Interview
- Manager talk
- Money talk
- Family talk
- Client call
- Start something
- Travel
- Purchase

## P1: Share System

Use one share button per major insight, not every small card.

Share card types:

- Identity card
- Moon/Nakshatra card
- Current phase card
- Today card
- Week card
- Money card
- Relationship card
- Remedy card

Every share card needs:

- user name
- one strong line
- small chart marker
- Muhurtha watermark
- `Decode yours` CTA

## P1: Paywall

Best paywall moment:

```text
After Decode + Past Check + Today preview.
```

Headline:

```text
Your basic decode is ready. Full timing map is locked.
```

Unlock bullets:

- full past-to-future life phases
- career, money, relationship, family timing
- today/week/month action plan
- good and caution windows
- personal remedies
- share cards
- Ask timing questions

Suggested MVP pricing:

- Free
- Rs 99/month
- Rs 499/year launch price
- Rs 29 one-time full decode trial, optional

## What To Remove Now

- Quick Proof as a separate product surface
- repeated phase note on every screen
- 7 Days and Month as top tabs in Today
- duplicate money/study/work chip clusters
- long Journey as the main screen
- Moon sign as the repeated hero
- multiple share icons per screen
- raw remedies list feel

## Implementation Order

### Step 1: Pack Contract

- Add V3 pack types.
- Add V3 prompt.
- Keep V2 fallback temporarily.
- Generate `free_preview`, `life_map`, `timing_plan`, `category_reports`, `ask_templates`, `share_cards`.

### Step 2: API Adapters

- Add `decode_get`.
- Replace current week/month adapters with `timing_get`.
- Replace journey adapter with `life_map_get`.
- Keep `today_get`.
- Add `ask_templates_get`.

### Step 3: UI Navigation

Change bottom nav to:

- Decode
- Today
- Timing
- Life Map
- Ask

Keep Remedies inside Today or Timing, not as its own nav item.

### Step 4: Free/Paid Gating

- Add lock metadata to API responses.
- Render locked cards visually.
- Add paywall screen copy from pack.
- Do not integrate payment until the UX is stable.

### Step 5: Share Cards

- Normalize share payloads from `share_cards`.
- Make share image feel branded.
- Add CTA and watermark.
- Share only major insight cards.

### Step 6: Notifications

- Use `notification_pack`.
- Schedule:
  - today ready
  - good window start
  - Rahu Kalam start
  - weekly ready
  - phase change approaching

## V2 Compatibility

Do not hard-delete existing V2 code in the first pass.

Use a feature switch:

```text
PRODUCT_EXPERIENCE_VERSION=v3
```

This lets us compare V2 and V3 without another painful rollback.

## Success Criteria

V3 is successful if a fresh user can say:

- “This sounds like me.”
- “This past period makes sense.”
- “I know what to do today.”
- “I want to unlock the full timing map.”
- “This card is worth sharing.”

## Brutal Risk

The biggest risk is not backend complexity.

The biggest risk is weak first impression.

So do not start with payment plumbing. Start with the first three free moments:

1. Decode hit
2. Past check hit
3. Today usefulness

If those three are strong, subscription has a chance.
