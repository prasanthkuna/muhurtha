**P0/P1 Plan**

I’d treat this as a product rebuild in place, not a feature spree.

**P0 is trust and usefulness.**  
If P0 lands well, users will say “this gets me.”  
**P1 is shareability and monetizable depth.**  
If P1 lands well, users will say “I need this daily, and I want to send it.”

## P0
P0 goal: make Muhūrta feel sharp, personal, and clearly useful.

### 1. Truth Engine Upgrade
We fix the core problem first: the app is compressing birth data too early.

Backend changes:
- Upgrade dasha start precision from `pada midpoint` to `exact Moon fraction within nakshatra`.
- Create a `chart fact model` object per profile/birth input.
- Include richer facts for generation:
  - Moon sign
  - Moon nakshatra + pada
  - Sun sign
  - current mahadasha / antardasha
  - active domains
  - period pressure/support themes
  - timing confidence
- Add `generation_provenance` for every generated payload:
  - `engine_version`
  - `prompt_version`
  - `provider`
  - `model`
  - `copy_source`
  - `fact_signature`

Do not do full-house/lagna astrology yet unless we can do it correctly. For P0, we should deepen what we already do well before pretending full classical chart synthesis.

### 2. Interpretation Planner Layer
Right now we go from engine facts to pretty prose too fast.

Add a new backend layer:
- `planner.ts`
- output a structured interpretation before writing copy

Planner output example:
- `main_theme`
- `active_domains`
- `pressure_points`
- `supporting_factors`
- `daily_expression`
- `phase_truth`
- `action_bias`
- `avoid_bias`
- `confidence`

Then:
- engine computes facts
- planner interprets facts
- LLM writes from planner output
- fallback uses planner too

This is the biggest architecture improvement.

### 3. Quick Proof Rebuild
Quick Proof is the trust engine. It must become the strongest screen in the app.

Changes:
- generate fewer but stronger proof cards
- each card must include:
  - period
  - core line
  - 1 supporting line
  - visible domains
  - confidence label
- the copy should sound like:
  - “work got heavier”
  - “family pressure increased”
  - “inner reset, outer delay”
  not generic reflection

Backend:
- separate `quick_proof_generate` from Journey prompt style
- create a dedicated proof prompt tuned for “recognition”
- store which planner facts drove the card

Frontend:
- redesign Quick Proof into high-contrast “memory trigger” cards
- add one `strongest line` treatment visually
- keep feedback pills, but don’t depend on them for relevance

### 4. Journey Rebuild
Journey should not feel like a dark card list with paraphrased planet blends.

Backend:
- generate cards from planner output, not raw `lordFlavor`
- require every card to include:
  - phase name
  - active domains
  - what this phase tends to feel like
  - what changed from previous phase
- cache by:
  - `profile_id`
  - `birth_input_id`
  - `locale`
  - `engine_version`
  - `planner_version`
  - `prompt_version`
  - `provider`

Frontend:
- make Journey a real timeline
- each card shows:
  - Mahadasha
  - Sub-phase
  - domains
  - one strong summary line
  - expandable detail
- cards should feel specific, not repetitive

### 5. Today and Purpose as Habit Loop
These two should become the product’s daily reason to return.

Today:
- one hero line
- one “better for”
- one “be careful”
- simple time windows only
- Rahu Kalam called out clearly
- show:
  - `Your Moon sign`
  - `Sun sign you may know`
  - one plain-language note:
    `Main reading uses Moon sign in Indian astrology.`

Purpose:
- upgrade purpose categories from [muhurtha-categories.md](</c:/Users/PrashanthKuna/muhurtha/docs/upgrades/muhurtha-categories.md:365>)
- P0 set:
  - money talk
  - family discussion
  - boss call
  - interview
  - travel start
  - property visit
  - serious relationship talk
- result should include:
  - do today or not
  - better time
  - better alternative if weak
  - one short reason

### 6. Remedies Rebuild
Remedies should feel grounded and Indian, not wellness filler.

Each remedy should show:
- `Why this is showing now`
- `What to do`
- `Keep it simple`

Keep remedy categories small:
- mind reset
- speech discipline
- body reset
- quiet seva
- prayer / mantra-lite

## P1
P1 goal: make the product shareable, sticky, and ready for paid depth.

### 1. Share Layer
I agree with your research direction: every important card should be shareable.

Build:
- `share_cards` table
- `share-card-generate` function
- local Flutter share-image generation first
- server-side OG/deep-link later in same phase if time allows

P1 share targets:
- Quick Proof card
- Today one-line card
- Purpose result card
- Journey phase card
- Remedy card

### 2. Today One Line
This is the easiest retention asset.

Requirements:
- one sharp line per day
- short enough for screenshot and push
- tied to real timing context, not vague horoscope tone

### 3. Screenshot Mode
Important for India/WhatsApp behavior.

For shared cards:
- premium branded export
- big headline
- one supporting line
- subtle Muhūrta branding
- no clutter

### 4. Push-Ready Copy
Even if notifications are not fully shipped immediately, generate notification-grade copy now:
- today warning
- best purpose timing
- wait-until-later suggestion

### 5. Monetization Gates
After trust and usefulness are stronger, add clean gating.

Free:
- Quick Proof lite
- Today
- 1 purpose check/day
- limited Journey
- share card support

Plus:
- unlimited purpose checks
- full Quick Proof
- expanded Journey depth
- compare days / better option

Pro:
- 12-month preview
- deeper phase explanations
- extra profile

Family stays later. Don’t build it now.

## What We Skip For Now
This stays out of current P0/P1:
- compatibility engine
- partner/friend profiles
- family bundle plan
- naming
- festivals
- children/pregnancy
- public/community features
- celebrity comparison
- full lagna-house predictive stack unless we can implement it properly

## Delivery Order
1. Truth engine + planner layer
2. Quick Proof rebuild
3. Journey rebuild
4. Today + Purpose rebuild
5. Remedies rebuild
6. Share layer
7. Monetization gates

## Definition of Done
P0 is done when:
- Quick Proof feels personally recognizable
- Journey cards stop sounding repetitive
- Today and Purpose feel distinctly useful
- cache no longer hides provenance
- generated content clearly reflects richer engine facts

P1 is done when:
- every key card can be shared beautifully
- Today One Line exists
- purpose results become sendable
- soft gating for Plus/Pro is in place without harming trust

## Brutal Product Truth
This is a 10x opportunity only if we resist the temptation to add more astrology surfaces before fixing the narrative engine.

The winning V2 is not:
- more tabs
- more jargon
- more categories

The winning V2 is:
- stronger proof
- sharper daily utility
- more specific phase truth
- better shareability
- cleaner monetization