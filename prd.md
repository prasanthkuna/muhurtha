# PRD — **Muhūrta**

## Purpose-first Jyotish Timing Companion

## 1. Product vision

Build an India-first Jyotish app that first earns user trust by checking their past life periods, then gives daily practical timing guidance for real actions like interview, money talk, travel, property, business, study, family discussion, and remedies.

Old PRD direction was trust-first through past validation, Quick Proof, explainability, and India-first compliance. That stays. 
New direction removes score-first UX, makes the experience phase-wise using MD/AD/PD, and keeps AI as a renderer over deterministic Jyotish data. 

---

## 2. Product name

## **Muhūrta**

### Tagline

```text
First check your past. Then choose the right time.
```

### One-line product

```text
Muhūrta is a Jyotish timing companion that reads your life periods and helps you choose better days and time windows for important actions.
```

---

## 3. Core product thesis

Most Indian users do not want dense astrology data.

They want:

```text
Did this match my life?
Is today good?
When should I do this?
What should I avoid?
```

So the app must be built around:

```text
Past Proof → Today Timing → Purpose Check → Journey → Remedies
```

---

## 4. Target users

### Primary

Indian users aged 18–45 who are curious about astrology but skeptical of generic predictions.

### Secondary

Believers who already know terms like Rashi, Nakshatra, Dasha, Rahu Kalam, and Muhurtham.

### Tertiary

Family users who want to check timing for spouse, child, sibling, parents, property, travel, marriage talks, or business decisions.

The old PRD already identified skeptical Indians, believers who want timing windows, and family decision-makers as target users. 

---

## 5. Core promise

```text
Muhūrta first checks your recent past.
If the life periods feel correct, it helps you choose better timing for your next action.
```

### Product loop

```text
Open app
→ choose what you want to do
→ see good time / caution time / better option
→ act or avoid
→ return tomorrow
```

---

## 6. Product principles

1. **Trust before future prediction**
2. **Simple Indian English over heavy Sanskrit**
3. **Deterministic Jyotish core, AI only for wording**
4. **No fear-based copy**
5. **No fake certainty**
6. **No mandatory rectification blocker**
7. **Purpose-first daily utility**
8. **Only show strongest 2–3 themes per phase**
9. **Every negative answer must suggest a better time**
10. **Internal scores stay internal**
11. **Lived-experience copy, not astrology lectures** — User-facing text may be long and meaningful about feelings, situations, and practical timing; it must not explain chart mechanics (no houses, grahas, dasha names, or technical “because X in Y” reasoning in the default UI).

The previous PRD already called out trust over theatrics, specificity over Barnum statements, explainability, cultural relevance, and compliance-by-design. 

---

# 7. V1 scope

## Must ship

```text
1. Onboarding with DOB, birthplace, current city, time bucket, Nakshatra
2. Input quality mode
3. Quick Proof: recent life periods
4. Validation buttons
5. Today screen with good/caution windows
6. Purpose Check
7. My Journey phase feed
8. Remedies
9. Profile/preferences
10. Full localization for **English (`en`), Telugu (`te`), and Hindi (`hi`)** — UI strings + AI narrative in the user’s language; **default language follows the device locale** when it maps to a supported code (otherwise fallback, e.g. `en`), then **`profiles.language_code`** is the source of truth after onboarding.
```

## Must not ship in v1

```text
1. Mandatory birth-time rectification
2. Human astrologer marketplace
3. 16-varga beginner UI
4. Ritual commerce
5. Public PSA/PCS scoreboards
6. Heavy monthly planner
7. Full family plan
8. Medical/legal/financial guarantees
9. Complex paid billing before trust loop is proven
```

The previous PRD already marked astrologer marketplace, beginner 16-varga depth, guaranteed medical/legal/financial outcomes, and custom ritual commerce as non-goals. 

---

# 8. Core user flows

## 8.1 First-time user flow

```text
Welcome
→ Birth basics
→ Approx birth time bucket
→ Nakshatra input
→ Accuracy mode result
→ Quick Proof
→ Validation
→ Today screen
```

## 8.2 Daily returning flow

```text
Open app
→ Today
→ choose purpose
→ see good/caution windows
→ see better option
→ optional why
```

## 8.3 Deep exploration flow

```text
Home
→ My Journey
→ Current phase
→ Past phase cards
→ Next 12 months
→ Remedies
```

---

# 9. Onboarding strategy

## Key decision

Do **not** force rectification during onboarding.

Most users may know:

```text
Date of birth
Birth place
Morning / afternoon / evening / night
Janma Nakshatra
```

Many will not know exact birth time.

So onboarding must be:

```text
Nakshatra + time-bucket first
Exact birth time optional
Rectification optional later
```

---

## 9.1 Screen: Welcome

```text
Don’t trust us yet.

First, Muhūrta checks your past.
Then it helps you choose better timing for your next action.

[Put Muhūrta to the Test]
```

The verbiage review correctly says Indian users are skeptical, and the first moment should create an “Aha” instead of sounding like generic astrology. 

---

## 9.2 Screen: Birth basics

Fields:

```text
Name
Date of birth
Birth place
Current city
Language
```

CTA:

```text
Continue
```

---

## 9.3 Screen: Birth time bucket

```text
What time were you born?
```

Options:

```text
Early morning — 4 AM to 8 AM
Morning — 8 AM to 12 PM
Afternoon — 12 PM to 4 PM
Evening — 4 PM to 8 PM
Night — 8 PM to 12 AM
Late night — 12 AM to 4 AM
I know exact time
I don’t know
```

---

## 9.4 Screen: Nakshatra

```text
Do you know your Janma Nakshatra?
```

Options:

```text
Select Nakshatra
I don’t know
```

Optional:

```text
Pada, if known
```

---

## 9.5 Accuracy mode result

### Exact time + Nakshatra

```text
Your chart has high detail.
Muhūrta can show life periods, past patterns, and personal timing.
```

### Time bucket + Nakshatra

```text
Your chart has good detail.
Some exact timing may shift, but major life periods can still be read.
```

### Nakshatra only

```text
Your Nakshatra is enough to read major life periods.
Add birth time later for deeper chart detail.
```

### Unknown time + unknown Nakshatra

```text
Muhūrta can still show today’s general good and caution times.
Add Nakshatra or birth time later for personal life periods.
```

---

# 10. Engine modes

| Input                   | Mode                  | What app can show                                                       |
| ----------------------- | --------------------- | ----------------------------------------------------------------------- |
| Exact time + Nakshatra  | Full chart mode       | D1, MD/AD/PD, houses, transits, personal purpose timing                 |
| Exact time only         | Full chart calculated | Nakshatra derived from chart                                            |
| Time bucket + Nakshatra | Strong phase mode     | Dasha phases, daily Tarabala, phase sentences, medium-confidence timing |
| Time bucket only        | Window chart mode     | possible chart ranges, less-specific phase guidance                     |
| Nakshatra only          | Nakshatra-dasha mode  | Mahadasha/Bhukti themes, Tarabala, Moon-based guidance                  |
| Unknown both            | Panchanga mode        | general daily good/caution times by location                            |

---

# 11. Core screens

## 11.1 Today

Main daily screen.

### Card order

```text
1. What are you planning today?
2. Today is better for
3. Be careful with
4. Good times
5. Caution times
6. Current life period
7. Today’s remedy
8. Upcoming shift
```

The old V2 plan had Home with active phase, today’s windows, remedy, and upcoming shift, but the new version puts user purpose first. 

### Example

```text
What are you planning today?

[Interview] [Money Talk] [Business]
[Travel] [Property] [Family Talk]
[Study] [Health Routine]

Today is better for:
• Focus work
• Planning
• Payment follow-up

Be careful with:
• Emotional family discussion
• Signing without checking details

Good times:
9:20 AM – 10:45 AM
1:15 PM – 2:05 PM

Caution times:
7:38 AM – 9:12 AM
3:05 PM – 4:35 PM

Current Life Period:
Mercury – Saturn

Work pressure is high, but planning is improving.
```

---

## 11.2 Purpose Check

Purpose Check is the strongest v1 feature.

### Supported v1 purpose categories

```text
Career / Interview
Business / Launch
Money / Payment
Property / Vehicle
Relationship / Marriage talk
Family discussion
Travel
Study / Exam
Health routine
Legal / Dispute
Spiritual / Puja
Creative / Public announcement
```

### Flow

```text
Choose purpose
→ choose date
→ get result
```

### Result

```text
Purpose: Job Interview
Status: Partly Matched

Best time:
10:20 AM – 11:45 AM

Avoid:
3:05 PM – 4:35 PM

Better option:
Friday, 9:40 AM – 11:10 AM

What to do:
Prepare now. Speak after 10:20 AM. Avoid rushed commitment.
```

### Status values

```text
Matched
Partly Matched
Not Matched
```

---

## 11.3 Quick Proof

Quick Proof checks recent past before the user trusts future timing.

Show **3–5 recent phase cards**, not the full 15 years.

### Card structure

```text
2023–2025
Career and money planning became stronger.

You may have started thinking more seriously about growth, recognition, or building something bigger than a regular job path.

This period supports progress, but results improve more through skill and consistency than sudden luck.

[Exactly This] [Partly True] [Wrong Timing] [Didn’t Happen]
```

The previous PRD already had Quick Proof for the last 5 years before full timeline expansion. 
The verbiage review recommended validation buttons like “Exactly This” and “Partially True” instead of survey-like True/False labels. 

### Add one extra button

```text
Wrong Timing
```

This is needed for engine calibration.

---

## 11.4 My Journey

A phase-wise feed based on MD/AD/PD, not arbitrary year cards.

### Sections

```text
Current Phase
Recent Past
Full Journey
Next 12 Months
```

### Phase card

```text
Mercury – Saturn Period
Jun 2022 – Oct 2024

Main themes:
Work pressure
Money planning
Responsibility

Reading:
From this period, career ambition and money planning became stronger. You may have started thinking more seriously about growth, recognition, or building something more stable. Results improve through discipline and skill, not sudden luck.

Why Muhūrta said this:
Mahadasha/Bhukti + active life areas + transit support
```

The V2 upgrade file already requires phase-wise MD/AD/PD storage and replacing year-point payloads with phase segments. 

---

## 11.5 Remedies

Simple, sattvic, non-fear-based.

### Sections

```text
Today’s remedy
This week’s remedy
Purpose-based remedy
Completed remedies
```

### Example

```text
Today’s remedy:
Speak less during conflict.
Offer water to Tulasi.
Do 5 minutes silent prayer before work.
```

---

## 11.6 Profile

Profile is not a main tab in v1. Keep it top-right.

Fields:

```text
Birth details
Birth time bucket
Exact time, if added
Nakshatra
Language
Simple / Traditional mode
Current city
Saved profiles
Privacy
Delete data
```

Guest profile can come after v1 because it is a strong viral loop, but not required for the first minimal build. The verbiage review calls “Test a Sceptic” with sibling/partner profiles a strong viral loop. 

---

# 12. Navigation

## Bottom tabs

```text
Today
Purpose
Journey
Remedies
```

Profile stays as top-right icon.

---

# 13. Jyotish engine requirements

## 13.1 Deterministic core

AI must not calculate astrology.

Engine must calculate:

```text
D1 chart where birth time allows
Moon Nakshatra
Vimshottari Mahadasha / Antardasha / Pratyantardasha
Tithi
Nakshatra
Yoga
Karana
Vara
Sunrise / sunset
Rahu Kalam
Yamagandam
Gulika
Durmuhurta
Varjyam
Hora
Tarabala
Chandrabala
Major gochara: Saturn, Jupiter, Rahu, Ketu
Weekly triggers: Moon, Mars
```

The original PRD already required D1 chart, Vimshottari MD/AD/PD, major transits, Moon/Mars weekly triggers, and optional D9/D10 confirmations for high-impact claims. 

---

## 13.2 Purpose Timing Engine

Each purpose has a rule matrix.

### Example purpose dimensions

| Purpose       | Favor                                                    | Avoid                                       |
| ------------- | -------------------------------------------------------- | ------------------------------------------- |
| Interview     | Mercury, Jupiter, good Hora, Chandrabala                 | Rahu Kalam, weak Moon, harsh Mars           |
| Money talk    | Jupiter, Venus, Mercury, stable Tithi                    | Durmuhurta, emotional Moon                  |
| Property      | Mars, Saturn stability, 4th-house support if exact chart | Varjyam, weak Moon                          |
| Marriage talk | Venus, Jupiter, Moon support                             | Mars aggression, emotional conflict windows |
| Study         | Mercury, Jupiter, calm Moon                              | restless Mars/Rahu windows                  |
| Travel        | Moon support, good Tithi, avoid Varjyam                  | Rahu Kalam, weak travel indicators          |

---

## 13.3 Phase sentence generator

For every phase, engine must generate 2–3 sentences from deterministic context.

### Internal formula

```text
Dasha + Bhukti + active planets + activated houses where available + Nakshatra + transit support + confidence boundary
```

### Output formula

```text
Time + life area + likely experience + meaning/caution
```

### Example

```text
From 2023 to 2025, career ambition and money planning became stronger.
You may have started thinking more seriously about growth, recognition, or building something more stable.
This period supports progress, but results improve more through skill and consistency than sudden luck.
```

### Rule

Do not force all categories.

Show only:

```text
Top 2–3 strongest themes
1 support/caution line
```

---

# 14. AI narrative system

## Gemini role

Gemini is **renderer only**, not oracle.

Pipeline:

```text
Stage A: deterministic Jyotish context JSON
Stage B: Gemini converts it into simple user-facing sentences
Stage C: validator checks grounding, banned phrases, readability
Stage D: save output with prompt version
```

The V2 upgrade file already defines this two-stage approach and strict output contract: phase meaning, manifestation, caution, action/upaya, and timing reference. 

---

## Anti-generic validator

Reject output if it uses vague phrases like:

```text
resonance
alignment
abundance
cosmic rhythm
clarity phase
comeback phase
universe is supporting you
```

Require:

```text
time period
life area
felt experience
action or caution
engine grounding
```

---

# 15. Copy rules

## Use

```text
From 2023...
This period may have...
Work and money planning...
Be careful during this time...
Better do this after...
```

## Avoid

```text
Your cosmic alignment is powerful.
You are entering abundance.
The universe wants you to...
Massive comeback phase.
```

The V2 upgrade file already says every prediction line should be understandable by a 15-year-old, avoid fear-heavy language, and convert screen copy to short action-first lines. 

---

# 16. Design direction

## Design system

```text
Spotify structure
+ Mastercard warmth
+ controlled Binance gold
```

## Visual feel

```text
Premium dark
Warm gold
Soft cream
Large cards
Cinematic but not fake spiritual
Purpose chips
Good/caution timing cards
Screenshot-friendly journey cards
```

The V2 design plan already asks for centralized design tokens, premium streaming-style presentation, fewer stronger cards, and avoiding dense/repetitive utility UI. 

---

# 17. Recommended tech stack

## V1 stack

```text
Flutter app
Supabase Auth
Supabase Postgres
Supabase Edge Functions
Gemini API
Server-side Jyotish calculation module
```

## Boundary

```text
Flutter displays.
Supabase stores and secures.
Edge Functions calculate and orchestrate.
Gemini writes simple sentences.
```

---

# 18. Data model

## Tables

```text
users
profiles
birth_inputs
input_quality_modes
nakshatra_inputs
chart_runs
phase_runs
phase_segments
phase_highlights
narrative_runs
narrative_blocks
daily_windows
purpose_checks
purpose_rules
validation_feedback
remedy_catalog
remedy_completions
localized_content_blocks
vedic_glossary_entries
consent_ledger
```

The V2 file already recommends phase storage, narrative versioning, glossary entries, and localized content blocks. 

---

# 19. API contracts

## Profile

```text
POST /profile/create
GET /profile/me
PATCH /profile/birth-input
```

## Chart / phase

```text
POST /chart/initialize
GET /journey/quick-proof
GET /journey/current-phase
GET /journey/full
```

## Validation

```text
POST /validation/submit
```

## Daily timing

```text
GET /today
GET /today/windows
```

## Purpose

```text
POST /purpose/check
POST /purpose/find-best-dates
```

## Remedies

```text
GET /remedies/today
POST /remedies/complete
```

---

# 20. Example `POST /purpose/check`

## Request

```json
{
  "profileId": "profile_123",
  "purposeType": "career_interview",
  "targetDate": "2026-05-01",
  "location": {
    "city": "Hyderabad",
    "timezone": "Asia/Kolkata"
  }
}
```

## Response

```json
{
  "status": "partly_matched",
  "summary": "Today is usable, but not perfect for final decisions.",
  "bestWindows": [
    {
      "start": "10:20",
      "end": "11:45",
      "label": "Best for clear discussion"
    }
  ],
  "cautionWindows": [
    {
      "start": "15:05",
      "end": "16:35",
      "label": "Avoid emotional replies"
    }
  ],
  "betterOptions": [
    {
      "date": "2026-05-03",
      "start": "09:40",
      "end": "11:10",
      "reason": "Better Moon and Hora support"
    }
  ],
  "simpleReason": "Communication support is decent, but emotional reaction can increase later in the day.",
  "action": "Prepare now. Speak after 10:20 AM. Avoid rushed commitment."
}
```

---

# 21. Monetization

## V1 free

```text
Basic onboarding
Quick Proof
Today’s general guidance
1 purpose check per day
Basic Journey
Today’s remedy
```

## Pro later

```text
Unlimited purpose checks
Best dates in next 30/90 days
Full Journey
Next 12 months
Advanced Why
Family profiles
Saved reminders
Monthly planner
Traditional explanation mode
```

The previous PRD included Basic, Pro, Family, and one free guest profile. Keep that direction later, but do not let billing delay the first trust loop. 

---

# 22. Analytics

Track only useful events.

```text
onboarding_started
birth_mode_selected
nakshatra_added
quick_proof_viewed
validation_submitted
today_opened
purpose_selected
purpose_result_viewed
journey_phase_viewed
remedy_completed
profile_accuracy_upgraded
```

Do not track vanity events.

---

# 23. Success metrics

## Activation

```text
% users completing onboarding
% users reaching Quick Proof
% users submitting at least 3 validations
```

## Trust

```text
% Exactly This
% Partly True
% Wrong Timing
% Didn’t Happen
```

## Retention

```text
D1 Today screen return
D7 Today screen return
Purpose checks per user
Remedy completions
Journey reopens
```

## Monetization readiness

```text
% users using purpose check 3+ times
% users opening Journey 2+ times
% users adding Nakshatra/exact time later
```

---

# 24. Compliance and safety

## Must include

```text
18+ gate
consent capture
delete account/data
PII encryption
no raw birth details in logs
non-guarantee language
medical/legal/financial disclaimers
no fear-based predictions
```

The old PRD already includes explicit consent, age gate, data minimization, PII encryption, deletion lifecycle, and no raw birth details in application logs. 

---

# 25. Acceptance criteria

## Onboarding

```text
User can complete onboarding without exact birth time.
User can enter time bucket and/or Nakshatra.
User is not blocked by rectification.
User sees accuracy mode clearly.
```

## Quick Proof

```text
User sees 3–5 recent phase cards.
Each card has 2–3 simple sentences.
Each card is grounded in deterministic phase data.
User can validate with Exactly This / Partly True / Wrong Timing / Didn’t Happen.
```

## Today

```text
User sees good time windows.
User sees caution windows.
User sees current life period if enough input exists.
Unknown users still get general Panchanga guidance.
```

## Purpose Check

```text
User can select a purpose.
App returns Matched / Partly Matched / Not Matched.
App returns best windows, caution windows, and better option.
Every Not Matched result suggests another usable time.
```

## Journey

```text
Journey is phase-wise, not random year-wise.
Each phase shows top 2–3 active themes only.
Why drawer shows simple explanation first, technical detail second.
```

## Engine

```text
No AI astrology calculation.
All core Jyotish facts are deterministic.
AI output must pass grounding and readability checks.
```

---

# 26. Final v1 build order

```text
1. Supabase schema
2. Flutter design tokens
3. Onboarding screens
4. Input quality mode logic
5. Jyotish deterministic engine v1
6. Quick Proof phase generator
7. Validation feedback
8. Today windows engine
9. Purpose Check engine
10. Journey screen
11. Remedies screen
12. Quality checks
13. Internal beta
```

---

# 27. Final product definition

```text
Muhūrta v1 = Proof + Today Timing
```

## Final core loop

```text
Check my past
→ Trust the engine
→ Ask what I should do today
→ Choose better timing
→ Return tomorrow
```

## Final decision

Build this minimal version first.

Do not build a broad astrology app.

Do not build a scoreboard app.

Do not build a ritual marketplace.

Build:

```text
A daily Jyotish timing companion that proves itself through the user’s past.
```
