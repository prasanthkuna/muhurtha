# TRD — **Muhūrta v1**

## Proof + Today Timing

```text
Stack: Flutter + Supabase + Edge Functions + Gemini
Core: Deterministic Jyotish engine
AI Role: Narrative renderer only
V1 Goal: Past validation + daily purpose timing
```

---

# 1. System architecture

```text
Flutter App
  ↓
Supabase Auth
  ↓
Supabase Postgres + RLS
  ↓
Supabase Edge Functions
  ↓
Deterministic Jyotish Engine
  ↓
Gemini Narrative Renderer
  ↓
Anti-generic Validator
  ↓
Postgres Stored Output
  ↓
Flutter UI
```

## Rule

```text
Flutter displays.
Supabase stores.
Edge Functions calculate.
Gemini writes.
Jyotish engine decides.
```

---

# 2. Core modules

```text
1. Auth Module
2. Profile Module
3. Birth Input Module
4. Chart Mode Resolver
5. Jyotish Core Engine
6. Phase Engine
7. Quick Proof Engine
8. Validation Engine
9. Today Timing Engine
10. Purpose Timing Engine
11. Remedy Engine
12. Narrative Renderer
13. Localization System
14. Analytics Module
15. Admin/Debug Module
```

---

# 3. User input modes

## Supported birth input modes

```ts
type BirthInputMode =
  | "exact_time"
  | "time_bucket"
  | "nakshatra_only"
  | "time_bucket_plus_nakshatra"
  | "unknown";
```

## Time buckets

```ts
type BirthTimeBucket =
  | "early_morning" // 04:00–08:00
  | "morning"       // 08:00–12:00
  | "afternoon"     // 12:00–16:00
  | "evening"       // 16:00–20:00
  | "night"         // 20:00–00:00
  | "late_night";   // 00:00–04:00
```

## Engine mode resolver

```ts
type EngineMode =
  | "full_chart"
  | "strong_phase"
  | "window_chart"
  | "nakshatra_dasha"
  | "general_panchanga";
```

## Mapping

```text
Exact time + birth place → full_chart
Exact time + Nakshatra → full_chart
Time bucket + Nakshatra → strong_phase
Time bucket only → window_chart
Nakshatra only → nakshatra_dasha
Unknown time + unknown Nakshatra → general_panchanga
```

---

# 4. Functional flow

## 4.1 First-time flow

```text
Welcome
→ Birth basics
→ Time bucket / exact time
→ Nakshatra
→ Engine mode result
→ Quick Proof
→ Validation feedback
→ Today screen
```

## 4.2 Returning flow

```text
Open app
→ Today
→ Select purpose
→ Get good/caution windows
→ See better option
→ Optional why
```

## 4.3 Journey flow

```text
Journey
→ Current phase
→ Recent past phases
→ Full journey
→ Next 12 months
```

---

# 5. Supabase schema

## 5.1 `profiles`

```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  gender text,
  current_city text,
  current_country text default 'IN',
  current_timezone text default 'Asia/Kolkata',
  language_code text default 'en',
  explanation_mode text default 'simple',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 5.2 `birth_inputs`

```sql
create table birth_inputs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,

  date_of_birth date not null,
  birth_place text,
  birth_country text default 'IN',
  birth_lat numeric,
  birth_lng numeric,
  birth_timezone text,

  birth_input_mode text not null,
  exact_birth_time time,
  time_bucket text,

  janma_nakshatra text,
  nakshatra_pada int,

  source text default 'user_input',
  confidence_label text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 5.3 `chart_runs`

```sql
create table chart_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  birth_input_id uuid not null references birth_inputs(id) on delete cascade,

  engine_mode text not null,
  engine_version text not null,
  calculation_status text default 'pending',

  rashi text,
  janma_nakshatra text,
  nakshatra_pada int,
  lagna text,

  confidence_score numeric,
  confidence_label text,

  raw_context jsonb not null default '{}',
  error_message text,

  created_at timestamptz default now()
);
```

---

## 5.4 `phase_runs`

```sql
create table phase_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  chart_run_id uuid not null references chart_runs(id) on delete cascade,

  engine_version text not null,
  run_type text not null, -- quick_proof, full_journey, future_12_months
  status text default 'pending',

  created_at timestamptz default now()
);
```

---

## 5.5 `phase_segments`

```sql
create table phase_segments (
  id uuid primary key default gen_random_uuid(),
  phase_run_id uuid not null references phase_runs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,

  start_date date not null,
  end_date date not null,

  mahadasha_lord text,
  antardasha_lord text,
  pratyantardasha_lord text,

  active_life_areas text[] default '{}',
  main_themes text[] default '{}',
  caution_themes text[] default '{}',

  confidence_score numeric,
  confidence_label text,

  deterministic_context jsonb not null default '{}',
  sort_order int default 0,

  created_at timestamptz default now()
);
```

---

## 5.6 `narrative_runs`

```sql
create table narrative_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,

  source_type text not null, -- phase, today, purpose, remedy
  source_id uuid,

  prompt_version text not null,
  model_name text not null default 'gemini',
  language_code text default 'en',

  input_context jsonb not null,
  output_json jsonb not null default '{}',

  validator_status text default 'pending',
  validator_errors text[] default '{}',

  created_at timestamptz default now()
);
```

---

## 5.7 `narrative_blocks`

```sql
create table narrative_blocks (
  id uuid primary key default gen_random_uuid(),
  narrative_run_id uuid not null references narrative_runs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,

  block_type text not null,
  title text,
  body text not null,

  evidence_refs jsonb default '{}',
  sort_order int default 0,

  created_at timestamptz default now()
);
```

---

## 5.8 `validation_feedback`

```sql
create table validation_feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  phase_segment_id uuid references phase_segments(id) on delete cascade,

  feedback_value text not null,
  -- exactly_this, partly_true, wrong_timing, didnt_happen

  optional_note text,
  created_at timestamptz default now()
);
```

---

## 5.9 `daily_windows`

```sql
create table daily_windows (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,

  target_date date not null,
  location_city text,
  timezone text not null,

  engine_mode text not null,
  window_type text not null,
  -- good, caution, neutral, remedy

  start_time time not null,
  end_time time not null,

  label text not null,
  reason text,
  source_factors text[] default '{}',

  score numeric,
  created_at timestamptz default now()
);
```

---

## 5.10 `purpose_checks`

```sql
create table purpose_checks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,

  purpose_type text not null,
  target_date date not null,
  location_city text,
  timezone text not null,

  status text not null,
  -- matched, partly_matched, not_matched

  summary text not null,
  action_line text not null,

  best_windows jsonb default '[]',
  caution_windows jsonb default '[]',
  better_options jsonb default '[]',

  deterministic_context jsonb not null default '{}',
  narrative_run_id uuid references narrative_runs(id),

  created_at timestamptz default now()
);
```

---

## 5.11 `remedy_catalog`

```sql
create table remedy_catalog (
  id uuid primary key default gen_random_uuid(),

  remedy_key text unique not null,
  remedy_type text not null,
  -- behavioral, spiritual, charity, discipline

  title text not null,
  simple_line text not null,

  applicable_planets text[] default '{}',
  applicable_purposes text[] default '{}',

  is_active boolean default true,
  created_at timestamptz default now()
);
```

---

## 5.12 `remedy_completions`

```sql
create table remedy_completions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  remedy_id uuid not null references remedy_catalog(id),
  completed_for_date date not null,
  created_at timestamptz default now()
);
```

---

## 5.13 `localized_content_blocks`

```sql
create table localized_content_blocks (
  id uuid primary key default gen_random_uuid(),

  content_key text not null,
  language_code text not null,
  simple_text text not null,
  traditional_text text,
  tone_level text default 'simple',

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(content_key, language_code)
);
```

---

## 5.14 `vedic_glossary_entries`

```sql
create table vedic_glossary_entries (
  id uuid primary key default gen_random_uuid(),

  term_key text not null,
  language_code text not null,
  vedic_term text not null,
  simple_line text not null,
  why_it_matters text,
  example_line text,
  aliases text[] default '{}',
  do_not_translate boolean default false,

  created_at timestamptz default now(),

  unique(term_key, language_code)
);
```

---

## 5.15 `consent_ledger`

```sql
create table consent_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  consent_type text not null,
  consent_version text not null,
  accepted boolean not null,
  accepted_at timestamptz default now(),

  ip_hash text,
  user_agent_hash text
);
```

---

# 6. RLS rules

## Core rule

```text
Users can access only their own profiles and dependent data.
```

## Example

```sql
alter table profiles enable row level security;

create policy "users can read own profiles"
on profiles for select
using (auth.uid() = user_id);

create policy "users can insert own profiles"
on profiles for insert
with check (auth.uid() = user_id);

create policy "users can update own profiles"
on profiles for update
using (auth.uid() = user_id);
```

For dependent tables:

```sql
create policy "users can read own birth inputs"
on birth_inputs for select
using (
  exists (
    select 1 from profiles
    where profiles.id = birth_inputs.profile_id
    and profiles.user_id = auth.uid()
  )
);
```

Apply same pattern to:

```text
chart_runs
phase_runs
phase_segments
narrative_runs
narrative_blocks
validation_feedback
daily_windows
purpose_checks
remedy_completions
```

---

# 7. Edge Functions

## Functions list

```text
profile-create
chart-initialize
quick-proof-generate
validation-submit
today-get
purpose-check
journey-get
remedy-today
```

---

## 7.1 `profile-create`

### Input

```ts
type ProfileCreateRequest = {
  displayName?: string;
  dateOfBirth: string;
  birthPlace?: string;
  birthLat?: number;
  birthLng?: number;
  currentCity: string;
  currentTimezone: string;
  languageCode: "en" | "te" | "hi";
  exactBirthTime?: string;
  timeBucket?: BirthTimeBucket;
  janmaNakshatra?: string;
  nakshatraPada?: number;
};
```

### Output

```ts
type ProfileCreateResponse = {
  profileId: string;
  birthInputId: string;
  birthInputMode: BirthInputMode;
  nextStep: "initialize_chart";
};
```

---

## 7.2 `chart-initialize`

### Responsibilities

```text
1. Read birth input
2. Resolve engine mode
3. Calculate available Jyotish facts
4. Save chart_run
5. Return accuracy mode
```

### Output

```ts
type ChartInitializeResponse = {
  chartRunId: string;
  engineMode: EngineMode;
  confidenceLabel: string;
  userMessage: string;
  canShowQuickProof: boolean;
  canShowPurposeTiming: boolean;
  canShowPersonalJourney: boolean;
};
```

---

## 7.3 `quick-proof-generate`

### Responsibilities

```text
1. Fetch latest chart_run
2. Generate recent phase segments
3. Create deterministic phase context
4. Call Gemini renderer
5. Validate output
6. Save narrative blocks
7. Return 3–5 cards
```

### Output

```ts
type QuickProofCard = {
  phaseSegmentId: string;
  periodLabel: string;
  title: string;
  sentences: string[];
  confidenceLabel: "high" | "medium" | "general";
  validationOptions: [
    "exactly_this",
    "partly_true",
    "wrong_timing",
    "didnt_happen"
  ];
};
```

---

## 7.4 `validation-submit`

### Input

```ts
type ValidationSubmitRequest = {
  profileId: string;
  phaseSegmentId: string;
  feedbackValue:
    | "exactly_this"
    | "partly_true"
    | "wrong_timing"
    | "didnt_happen";
  optionalNote?: string;
};
```

### Output

```ts
type ValidationSubmitResponse = {
  saved: boolean;
  nextAction:
    | "continue_quick_proof"
    | "go_to_today"
    | "show_more_phases";
};
```

---

## 7.5 `today-get`

### Responsibilities

```text
1. Get profile + current location
2. Calculate panchanga for date
3. Calculate good/caution windows
4. Add life-period summary if input supports it
5. Return Today payload
```

### Output

```ts
type TodayResponse = {
  date: string;
  locationLabel: string;
  engineMode: EngineMode;

  betterFor: string[];
  beCarefulWith: string[];

  goodWindows: TimingWindow[];
  cautionWindows: TimingWindow[];

  currentLifePeriod?: {
    label: string;
    summary: string;
  };

  remedy?: {
    title: string;
    action: string;
  };

  upcomingShift?: {
    date: string;
    label: string;
    summary: string;
  };
};
```

---

## 7.6 `purpose-check`

### Input

```ts
type PurposeCheckRequest = {
  profileId: string;
  purposeType:
    | "career_interview"
    | "business_launch"
    | "money_talk"
    | "property_vehicle"
    | "relationship_marriage_talk"
    | "family_discussion"
    | "travel"
    | "study_exam"
    | "health_routine"
    | "legal_dispute"
    | "spiritual_puja"
    | "creative_public";
  targetDate: string;
  locationCity: string;
  timezone: string;
};
```

### Output

```ts
type PurposeCheckResponse = {
  status: "matched" | "partly_matched" | "not_matched";
  summary: string;

  bestWindows: TimingWindow[];
  cautionWindows: TimingWindow[];
  betterOptions: BetterOption[];

  simpleReason: string;
  action: string;
  whyFactors: string[];
};
```

---

## 7.7 `journey-get`

### Output

```ts
type JourneyResponse = {
  currentPhase?: PhaseCard;
  recentPast: PhaseCard[];
  fullJourney?: PhaseCard[];
  future12Months?: PhaseCard[];
};
```

---

## 7.8 `remedy-today`

### Output

```ts
type RemedyTodayResponse = {
  remedyId: string;
  title: string;
  simpleLine: string;
  purpose?: string;
  sourceFactors: string[];
};
```

---

# 8. Jyotish engine

## 8.1 Engine folder structure

```text
/supabase/functions/_shared/jyotish
  /core
    calendar.ts
    sunrise.ts
    panchanga.ts
    nakshatra.ts
    vimshottari.ts
    chart.ts
    transit.ts
    hora.ts
    muhurta-windows.ts

  /phase
    phase-builder.ts
    phase-context.ts
    phase-scorer.ts

  /purpose
    purpose-rules.ts
    purpose-scorer.ts
    better-option-finder.ts

  /narrative
    prompt-builder.ts
    gemini-renderer.ts
    output-validator.ts

  /types
    jyotish.types.ts
    api.types.ts
```

---

## 8.2 Core calculation requirements

```text
1. Panchanga
2. Moon Nakshatra
3. Vimshottari MD/AD/PD
4. Tithi
5. Vara
6. Yoga
7. Karana
8. Sunrise/sunset
9. Rahu Kalam
10. Yamagandam
11. Gulika
12. Durmuhurta
13. Varjyam
14. Hora
15. Tarabala
16. Chandrabala
17. Major gochara support
```

---

## 8.3 Calculation mode by input

### `full_chart`

```text
Can use:
D1
Lagna
Moon Nakshatra
MD/AD/PD
Houses
Lords
Transits
Tarabala
Chandrabala
Hora
Panchanga
```

### `strong_phase`

```text
Can use:
Nakshatra
MD/AD
Broad PD if enough data
Time bucket chart range
Moon-based guidance
Tarabala
Chandrabala
Panchanga
Hora

Avoid:
Exact Lagna claims
Exact marriage/property/job month claims
```

### `window_chart`

```text
Can use:
Possible Lagna range
Possible Moon/Nakshatra if derivable
Panchanga
Broad phase statements

Avoid:
Strong personalization
```

### `nakshatra_dasha`

```text
Can use:
Janma Nakshatra
Approx Vimshottari flow
Tarabala
Moon-based timing
Panchanga
General phase guidance

Avoid:
House-specific claims
D9/D10
Exact event timing
```

### `general_panchanga`

```text
Can use:
Location
Date
Panchanga
Rahu/Yama/Gulika
Hora
General good/caution windows

Avoid:
Personal claims
Past validation
Life periods
```

---

# 9. Phase engine

## 9.1 Phase context

```ts
type PhaseContext = {
  profileId: string;
  engineMode: EngineMode;

  startDate: string;
  endDate: string;

  mahadashaLord: Planet;
  antardashaLord?: Planet;
  pratyantardashaLord?: Planet;

  activeLifeAreas: LifeArea[];
  mainThemes: string[];
  cautionThemes: string[];

  confidence: {
    score: number;
    label: "high" | "medium" | "general";
    limitations: string[];
  };

  evidence: {
    dashaFactors: string[];
    transitFactors: string[];
    panchangaFactors?: string[];
    chartFactors?: string[];
  };
};
```

---

## 9.2 Life areas

```ts
type LifeArea =
  | "career_work"
  | "money_income_savings"
  | "family_responsibility"
  | "marriage_relationship"
  | "health_sleep_stress"
  | "property_vehicle_home"
  | "travel_relocation"
  | "study_learning"
  | "business_public";
```

---

## 9.3 Sentence rule

Every phase card must produce:

```text
Sentence 1: What became active
Sentence 2: What user may have experienced
Sentence 3: Meaning / action / caution
```

## Example

```text
From 2023 to 2025, career ambition and money planning became stronger.
You may have started thinking more seriously about growth, recognition, or building something more stable.
This period supports progress, but results improve through skill and consistency, not sudden luck.
```

---

# 10. Purpose Timing Engine

## 10.1 Purpose score object

```ts
type PurposeScore = {
  purposeType: PurposeType;
  targetDate: string;

  totalScore: number;
  status: "matched" | "partly_matched" | "not_matched";

  supportiveFactors: string[];
  cautionFactors: string[];

  bestWindows: TimingWindow[];
  cautionWindows: TimingWindow[];
  betterOptions: BetterOption[];
};
```

---

## 10.2 Timing window

```ts
type TimingWindow = {
  start: string;
  end: string;
  label: string;
  score?: number;
  sourceFactors?: string[];
};
```

---

## 10.3 Better option

```ts
type BetterOption = {
  date: string;
  start: string;
  end: string;
  reason: string;
  score: number;
};
```

---

## 10.4 Score layers

```text
Base day score
+ Panchanga quality
+ Purpose-specific planet support
+ Hora support
+ Tarabala
+ Chandrabala
+ Dasha support, if available
+ Gochara support, if available
- Rahu Kalam
- Yamagandam
- Gulika
- Durmuhurta
- Varjyam
- Weak Moon support
```

---

## 10.5 Status thresholds

```ts
if totalScore >= 75 => matched
if totalScore >= 45 => partly_matched
else => not_matched
```

---

## 10.6 Purpose rules v1

```ts
const purposeRules = {
  career_interview: {
    favor: ["Mercury", "Jupiter", "good_hora", "chandrabala"],
    caution: ["rahu_kalam", "weak_moon", "mars_aggression"],
  },

  business_launch: {
    favor: ["Mercury", "Jupiter", "Venus", "stable_tithi"],
    caution: ["durmuhurta", "varjyam", "rahu_kalam"],
  },

  money_talk: {
    favor: ["Jupiter", "Venus", "Mercury", "stable_moon"],
    caution: ["weak_moon", "emotional_window", "durmuhurta"],
  },

  property_vehicle: {
    favor: ["Mars", "Saturn", "stable_tithi", "chandrabala"],
    caution: ["varjyam", "rahu_kalam", "weak_moon"],
  },

  relationship_marriage_talk: {
    favor: ["Venus", "Jupiter", "Moon", "soft_hora"],
    caution: ["mars_aggression", "rahu_kalam", "emotional_window"],
  },

  family_discussion: {
    favor: ["Moon", "Jupiter", "stable_moon"],
    caution: ["mars_aggression", "weak_moon", "late_evening_conflict"],
  },

  travel: {
    favor: ["Moon", "good_tithi", "chandrabala"],
    caution: ["varjyam", "rahu_kalam", "yamagandam"],
  },

  study_exam: {
    favor: ["Mercury", "Jupiter", "calm_moon"],
    caution: ["restless_mars", "rahu_kalam", "low_focus_window"],
  },

  health_routine: {
    favor: ["Saturn", "Sun", "stable_morning"],
    caution: ["low_energy_window", "weak_moon"],
  },

  legal_dispute: {
    favor: ["Saturn", "Mars_controlled", "Mercury"],
    caution: ["emotional_window", "mars_aggression", "rahu_kalam"],
  },

  spiritual_puja: {
    favor: ["Jupiter", "Moon", "sunrise_window", "good_tithi"],
    caution: ["rahu_kalam", "varjyam"],
  },

  creative_public: {
    favor: ["Venus", "Mercury", "Moon", "public_hora"],
    caution: ["weak_moon", "durmuhurta"],
  },
};
```

---

# 11. Narrative Renderer

## 11.0 Voice and scope (v1)

```text
- Gemini renders narrative only; the Jyotish engine supplies facts and boundaries.
- Copy may use longer, meaningful sentences about lived experience, emotions, and practical timing.
- Do NOT expose astrological explanations in user-facing text: no houses, rashis, planetary layouts,
  dasha / antardasha technical names, “because Jupiter aspects…”, tithi/yoga pedagogy, etc.
  (Calendar window labels already in the product, e.g. user-facing Rahu Kalam slots, stay as short labels —
  not tutorials.)
- `language` must be one of: en | te | hi. Match `profiles.language_code` and the active UI locale.
```

## 11.1 Gemini prompt contract

Input must include:

```json
{
  "engineMode": "strong_phase",
  "language": "en",
  "outputStyle": "simple_indian_english | simple_telugu | simple_hindi",
  "sourceType": "phase",
  "deterministicContext": {},
  "allowedClaims": [],
  "forbiddenClaims": [],
  "confidenceBoundaries": []
}
```

`outputStyle` must align with `language` (e.g. `te` + `simple_telugu`, `hi` + `simple_hindi`).

Output must be:

```json
{
  "title": "Career and money planning became stronger",
  "sentences": [
    "From 2023 to 2025, career ambition and money planning became stronger.",
    "You may have started thinking more seriously about growth, recognition, or building something more stable.",
    "This period supports progress, but results improve through skill and consistency, not sudden luck."
  ],
  "action": "Use this period for skill building and long-term planning.",
  "caution": "Avoid expecting sudden results without steady work.",
  "whyLite": [
    "Work and responsibility tend to demand more attention in this stretch.",
    "Stability and money decisions often feel more pressing than before."
  ]
}
```

`whyLite` lines must stay **experience-shaped**, not technical justifications (see §11.0).

---

## 11.2 Forbidden phrases

```text
resonance
alignment
abundance
cosmic rhythm
clarity phase
comeback phase
universe supports you
manifest
magnetic energy
destined greatness
```

---

## 11.3 Required output checks

```text
1. Has time anchor
2. Has life area
3. Has likely experience
4. Has action/caution
5. Does not overclaim beyond engine mode
6. No fear-based language
7. Natural register for the target language (simple Indian English / clear Telugu / clear Hindi)
8. No medical/legal/financial guarantee
9. No astrologicalExplanation mode: reject planet/house/dasha-as-teacher phrasing in title, sentences,
   action, caution, and whyLite (validator + forbidden patterns per language as needed)
```

---

# 12. Flutter architecture

## 12.1 Folder structure

```text
/lib
  /app
    app.dart
    router.dart
    theme.dart

  /core
    /network
      supabase_client.dart
      api_client.dart
    /constants
      colors.dart
      spacing.dart
      typography.dart
    /utils
      date_utils.dart
      time_utils.dart

  /features
    /onboarding
      /screens
      /widgets
      /models
      /providers

    /today
      /screens
      /widgets
      /models
      /providers

    /purpose
      /screens
      /widgets
      /models
      /providers

    /journey
      /screens
      /widgets
      /models
      /providers

    /remedies
      /screens
      /widgets
      /models
      /providers

    /profile
      /screens
      /widgets
      /models
      /providers

  /shared
    /widgets
      muh_scaffold.dart
      muh_hero_card.dart
      muh_purpose_chip.dart
      muh_timing_window_card.dart
      muh_caution_card.dart
      muh_phase_card.dart
      muh_validation_button.dart
      muh_bottom_nav.dart
      muh_why_drawer.dart
      muh_remedy_card.dart
```

---

## 12.2 State management

Use:

```text
Riverpod
```

Providers:

```text
authProvider
profileProvider
onboardingProvider
todayProvider
purposeCheckProvider
journeyProvider
remedyProvider
languageProvider
```

---

## 12.3 Navigation

Use:

```text
go_router
```

Routes:

```text
/splash
/welcome
/onboarding/birth-basics
/onboarding/time
/onboarding/nakshatra
/onboarding/accuracy
/quick-proof
/today
/purpose
/purpose/result
/journey
/remedies
/profile
```

---

# 13. Flutter design tokens

## Colors

```dart
class MuhColors {
  static const bg = Color(0xFF090806);
  static const surface = Color(0xFF15110B);
  static const surfaceSoft = Color(0xFF211A10);
  static const gold = Color(0xFFE6B85C);
  static const cream = Color(0xFFF3E6C8);
  static const muted = Color(0xFF9B8A6A);
  static const emerald = Color(0xFF42C78A);
  static const amber = Color(0xFFE6A23C);
  static const red = Color(0xFFD96B6B);
}
```

## Spacing

```dart
class MuhSpace {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
  static const xxl = 48.0;
}
```

## Radius

```dart
class MuhRadius {
  static const sm = 10.0;
  static const md = 18.0;
  static const lg = 28.0;
  static const xl = 36.0;
}
```

---

# 14. Screen payloads

## 14.1 Today screen model

```dart
class TodayViewModel {
  final String dateLabel;
  final String locationLabel;
  final List<String> betterFor;
  final List<String> beCarefulWith;
  final List<TimingWindow> goodWindows;
  final List<TimingWindow> cautionWindows;
  final LifePeriodSummary? currentLifePeriod;
  final RemedySummary? remedy;
  final UpcomingShift? upcomingShift;
}
```

---

## 14.2 Purpose result model

```dart
class PurposeResultViewModel {
  final String purposeLabel;
  final String status;
  final String summary;
  final List<TimingWindow> bestWindows;
  final List<TimingWindow> cautionWindows;
  final List<BetterOption> betterOptions;
  final String simpleReason;
  final String action;
  final List<String> whyFactors;
}
```

---

## 14.3 Phase card model

```dart
class PhaseCardViewModel {
  final String phaseSegmentId;
  final String periodLabel;
  final String title;
  final List<String> sentences;
  final List<String> themes;
  final String confidenceLabel;
  final List<String> whyLite;
}
```

---

# 15. Security

## Must-have

```text
1. Supabase RLS enabled on all user data
2. No raw birth details in logs
3. Edge Functions validate auth JWT
4. PII encrypted where needed
5. Consent ledger before calculation
6. Delete profile and dependent data
7. Gemini requests should not include unnecessary PII
8. Rate limit purpose checks
```

---

# 16. Privacy

## Gemini input minimization

Send only:

```text
phase context
age band if needed
language
engine mode
allowed claim boundaries
```

Do not send:

```text
full name
phone
email
exact address
raw birth details unless necessary
```

---

# 17. Analytics

## Events

```text
onboarding_started
birth_basics_submitted
time_bucket_selected
nakshatra_selected
engine_mode_created
quick_proof_viewed
validation_submitted
today_viewed
purpose_selected
purpose_result_viewed
journey_phase_viewed
remedy_completed
profile_accuracy_upgraded
```

---

# 18. Error handling

## Common errors

```text
BIRTH_PLACE_NOT_FOUND
INVALID_NAKSHATRA
CHART_INIT_FAILED
PHASE_GENERATION_FAILED
NARRATIVE_VALIDATION_FAILED
PURPOSE_CHECK_FAILED
TODAY_WINDOWS_FAILED
```

## User-facing language

```text
We could not calculate this safely right now.
Please try again.
```

Do not show technical errors.

---

# 19. Performance

## Targets

```text
App cold start: < 3 sec
Today API: < 1.5 sec cached, < 3 sec uncached
Purpose check: < 3 sec
Quick Proof generation: < 8 sec first run
Journey cached load: < 1 sec
```

## Caching

```text
Cache Today payload per profile/date/location
Cache phase runs
Cache narrative blocks
Cache purpose rules
Cache glossary
```

---

# 20. Background jobs

Supabase Edge Functions are request-based. For v1, avoid complex queues.

Use lazy generation:

```text
Generate chart on onboarding.
Generate Quick Proof after chart.
Generate Today on app open.
Generate Journey when first opened.
Cache all outputs.
```

Later:

```text
cron precompute daily Today payload
cron update upcoming shifts
cron clean stale narrative drafts
```

---

# 21. Testing

## Backend tests

```text
birth input mode resolver
engine mode resolver
nakshatra validation
dasha calculation
panchanga calculation
daily window generation
purpose scoring
anti-generic validator
API response shape
RLS access tests
```

## Flutter tests

```text
onboarding flow
time bucket selection
nakshatra selection
quick proof rendering
validation submission
today screen rendering
purpose result rendering
journey card rendering
```

## Manual QA scenarios

```text
Exact time user
Time bucket + Nakshatra user
Nakshatra-only user
Unknown user
Telugu mode
No internet
Failed Gemini response
Wrong Timing validation
```

---

# 22. Deployment

## Environments

```text
local
staging
production
```

## Supabase

```text
supabase db push
supabase functions deploy
supabase secrets set GEMINI_API_KEY
```

## Flutter

```text
cd app
flutter create . --project-name muhurta
flutter pub get
flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
flutter build apk --release
flutter build appbundle --release
flutter build ios --release
```

---

# 23. Build sequence

## 23.1 Recommended: thin foundation + vertical slices

Backend-only-then-all-frontend tends to surface integration issues late. Prefer a **thin platform** proof (Auth, minimal schema, RLS, one Edge Function + Flutter calling it), then **vertical slices** along the user journey (each slice = migrations/RLS + functions + screens for that flow).

## 23.2 What to ship per slice

```text
1. Thin platform: Supabase project, Auth, core migrations (profiles, birth_inputs, chart_runs, RLS),
   one happy-path Edge Function wired to Flutter — proves deploy and JWT path.
2. Slice by user journey (each slice ships backend + minimal UI that uses it):
   - Onboarding + profile-create + chart-initialize (engine mode + confidence labels)
   - Quick Proof + narrative (Gemini + validator + narrative_blocks)
   - Today + daily_windows
   - Purpose Check
   - Journey feed
   - Remedies
   - Profile polish, localization pass (en/te/hi), analytics, hardening
3. Within each slice: schema/migrations and RLS first for those tables, then Edge Function(s),
   then Flutter screens. Avoid building all Edge Functions before any client.
```

## 23.3 Reference phase list (dependency order)

```text
Phase 1: Supabase schema + RLS (expand per slice)
Phase 2: Flutter shell + onboarding + auth
Phase 3: Chart mode resolver + chart_runs
Phase 4: Jyotish core v1
Phase 5: Quick Proof generation
Phase 6: Today windows
Phase 7: Purpose Check
Phase 8: Journey
Phase 9: Remedies
Phase 10: QA + beta
```

---

# 24. V1 acceptance criteria

```text
User can onboard without exact birth time.
User can select time bucket and Nakshatra.
No user is blocked by rectification.
System resolves engine mode correctly.
Quick Proof shows 3–5 cards.
Each card has 2–3 grounded sentences.
User can validate each card.
Today screen shows good and caution times.
Purpose Check returns status, best windows, caution windows, and better option.
Unknown users get general Panchanga only.
Gemini never calculates astrology.
AI output is validated before saving.
User-facing narrative avoids astrological explanations (no chart-mechanics pedagogy).
App supports en / te / hi UI and narrative aligned to profile language and device-default rule.
All user data is protected by RLS.
```

---

# 25. Final implementation rule

```text
Do not build a generic astrology app.
Do not build a scoreboard app.
Do not build an astrologer marketplace.

Build:
Muhūrta v1 — Proof + Today Timing.
```
