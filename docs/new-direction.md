# New Direction — **Muhūrta**

## AI-native Jyotish companion

We moved from:

```text
Static Jyotish timing app
```

to:

```text
AI-native Jyotish companion that creates dynamic, personal, shareable Jyotish screens.
```

Core idea:

```text
User gives basic birth details + Nakshatra/time bucket
→ app checks past through life-phase cards
→ user validates what matched
→ AI remembers user feedback
→ user asks life-timing questions
→ app gives practical good/caution timing
→ every card can be shared beautifully on WhatsApp
```

---

# 1. Biggest strategic changes

## Change 1: From “Muhurta-only” to **AI-native Jyotish companion**

Earlier:

```text
Main value = good/caution timing
```

Now:

```text
Main value = AI Jyotish companion + past proof + timing + chat memory + shareable cards
```

The app should feel like:

```text
Ask anything about your life timing.
Muhūrta replies with simple Jyotish-backed guidance.
```

---

## Change 2: AI decides the screen experience

Earlier plan:

```text
Deterministic engine creates fixed fields
UI displays fixed cards
```

New plan:

```text
Screen purpose is given to AI
AI composes the screen dynamically
AI chooses titles, card order, wording, share line, CTA
```

But with one guardrail:

```text
AI can decide what to show.
AI should not invent unsafe/overconfident claims.
```

---

## Change 3: No heavy deterministic filter in v1

Earlier:

```text
Full deterministic engine first
AI only rewrites output
```

New v1:

```text
Calculation-light, AI-heavy, boundary-strong
```

Meaning:

```text
Do minimum required Jyotish context.
Use AI Screen Composer for experience.
Use validation + memory to improve personalization.
```

We are not building a rigid astrology calculation dashboard first.

---

## Change 4: No mandatory birth-time rectification

Earlier:

```text
If time uncertain → rectification required
```

New:

```text
No one is blocked.
Use whatever user knows.
Show accuracy mode.
Let them improve later.
```

Most Indian users may know:

```text
DOB
birth place
morning/evening/night
Janma Nakshatra
```

So onboarding must support that.

---

## Change 5: Nakshatra + time bucket first

New default assumption:

```text
User may not know exact time.
User may know Janma Nakshatra.
```

So app asks:

```text
DOB
birth place
current city
time bucket
Nakshatra
language
```

Exact birth time is optional, not required.

---

## Change 6: Chat memory without complex memory infra

Earlier options:

```text
Mem0
pgvector
custom memory system
```

Final v1:

```text
Use Gemini large context
+ Supabase chat history
+ chat summaries
+ validated life events
```

No Mem0.
No pgvector.
No custom semantic memory in v1.

Simple memory plan:

```text
Store all chat messages
Send recent messages + summary + validated events to Gemini
Summarize old chats when long
```

---

## Change 7: No separate Awe Card screen

Earlier:

```text
Build Awe Engine / Awe Result screen
```

New:

```text
Every meaningful card has a small WhatsApp share icon.
```

Virality is built into cards, not a separate gimmick.

---

## Change 8: Share card is core product

Every important card becomes:

```text
beautiful branded image
+ main insight
+ Muhūrta wordmark
+ minimal app link
+ WhatsApp share
```

This is the virality layer.

---

## Change 9: Story-first, chart-later

Earlier:

```text
Show Dasha / Nakshatra / technical Jyotish data
```

New:

```text
Show life story first.
Show “Why Muhūrta said this” only if user opens drawer.
```

Example:

```text
The Search and Build Phase

You were not just working.
You were searching for where you truly belong.
```

Technical details go inside:

```text
Why Muhūrta said this
```

---

## Change 10: Product is not horoscope feed

We explicitly rejected:

```text
generic daily horoscope
astrologer marketplace
scoreboard app
ritual commerce
static Panchang app
```

Final product:

```text
AI-native Jyotish companion for life timing, past proof, and personal guidance.
```

---

# 2. Final product positioning

## Product name

```text
Muhūrta
```

## Tagline

```text
First check your past. Then choose the right time.
```

## One-line pitch

```text
Muhūrta is an AI-native Jyotish companion that checks your past life periods, remembers what matched, and helps you choose better timing for real-life actions.
```

## Core loop

```text
Enter birth details
→ Quick Proof checks past
→ User validates cards
→ App remembers what matched
→ User asks questions
→ AI gives timing/story/remedy
→ User shares beautiful card
→ Friend opens and checks their own past
```

---

# 3. Final app structure

## Bottom navigation

```text
Today
Ask
Journey
Remedies
```

## Profile

Top-right icon.

---

# 4. Final screen plan

## 1. Welcome Screen

Purpose:

```text
Create skepticism-to-curiosity hook.
```

Copy:

```text
Don’t trust us yet.

First, Muhūrta checks your past.
Then it helps you choose better timing for your next action.

[Put Muhūrta to the Test]
```

Key rule:

```text
No generic spiritual intro.
No “unlock destiny.”
No cosmic nonsense.
```

---

## 2. Birth Basics Screen

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

Purpose:

```text
Collect minimum details without friction.
```

---

## 3. Birth Time Bucket Screen

Question:

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

Purpose:

```text
Avoid blocking users who don’t know exact time.
```

---

## 4. Nakshatra Screen

Question:

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

Purpose:

```text
Let users who know Nakshatra unlock stronger phase guidance.
```

---

## 5. Accuracy Mode Screen

Input quality modes:

```text
exact_time
time_bucket
nakshatra_only
time_bucket_plus_nakshatra
unknown
```

Engine modes:

```text
full_chart
strong_phase
window_chart
nakshatra_dasha
general_panchanga
```

Copy examples:

### Exact time

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

### Unknown

```text
Muhūrta can still show today’s general good and caution times.
Add Nakshatra or birth time later for personal life periods.
```

Purpose:

```text
Set expectation without fear.
```

---

## 6. Quick Proof Screen

Purpose:

```text
Create the “how did it know?” moment.
```

Show:

```text
3–5 recent life-phase cards
```

Each card includes:

```text
phase title
date range
2–3 story sentences
validation buttons
small WhatsApp share icon
```

Validation buttons:

```text
Exactly This
Partly True
Wrong Timing
Didn’t Happen
```

Example card:

```text
The Search and Build Phase
2005–2023

This was a long transformation phase.
You may have felt restless, ambitious, and unwilling to live a normal path.
This period built skill, pressure tolerance, and the hunger to create your own direction.

[Exactly This] [Partly True] [Wrong Timing] [Didn’t Happen]
```

Purpose of validation:

```text
Build trust
Create memory
Improve future answers
```

---

## 7. Today Screen

Purpose:

```text
Daily retention.
```

Card order:

```text
1. Today’s One Line
2. What are you planning today?
3. Today is better for
4. Be careful with
5. Good time windows
6. Caution time windows
7. Current Life Period
8. Today’s Remedy
```

Example:

```text
Today’s One Line

Don’t rush emotional replies after sunset.
```

Purpose chips:

```text
Interview
Money Talk
Business
Travel
Property
Family Talk
Relationship
Study
Health Routine
Puja
```

Timing cards:

```text
Good times
9:20 AM – 10:45 AM
1:15 PM – 2:05 PM

Caution times
7:38 AM – 9:12 AM
3:05 PM – 4:35 PM
```

Rule:

```text
Even if user has unknown birth time, show general Panchanga timing.
If personal info exists, personalize more.
```

---

## 8. Ask Screen

Purpose:

```text
Make app AI-native.
```

Prompt placeholder:

```text
Ask Muhūrta anything…
```

Suggested prompts:

```text
Is today good for interview?
When should I talk to my manager?
Why was 2021 difficult?
Best date for travel?
What should I avoid this week?
When is good for property discussion?
Why do I keep changing ideas?
```

Answer format:

```text
Direct answer
Best time
Caution time
Better option
Simple why
Action line
WhatsApp share icon
```

Example answer:

```text
Tomorrow is usable, but not the best day for salary discussion.

If you must speak, use 10:20 AM – 11:40 AM.
Avoid 3:05 PM – 4:35 PM because replies can become sharper.

Better option: Friday, 9:40 AM – 11:10 AM.
Prepare the points tomorrow. Ask on Friday.
```

Memory behavior:

```text
Load recent messages
Load chat summary
Load validated life events
Load profile + birth mode
Then answer
```

---

## 9. Journey Screen

Purpose:

```text
Long-form life story.
```

Sections:

```text
Current Phase
Recent Past
Full Journey
Next 12 Months
```

Card format:

```text
The Foundation Builder Phase
2025–2028

This is not a shortcut period.
Career, money planning, and family duty need more discipline.
Results improve through structure and patience.

[WhatsApp icon]
[Why Muhūrta said this]
```

Why drawer has 3 layers:

```text
Simple reason
Traditional Jyotish reason
Raw factors if available
```

Rule:

```text
Main card = life story.
Drawer = Jyotish explanation.
```

---

## 10. Remedies Screen

Purpose:

```text
Simple action, not fear.
```

Sections:

```text
Today’s remedy
This week’s remedy
Purpose-based remedy
Completed remedies
```

Example:

```text
Speak less during conflict.
Offer water to Tulasi.
Do 5 minutes silent prayer before work.
```

Rules:

```text
No extreme ritual commerce
No fear-based remedy
No “do this or bad thing will happen”
```

---

## 11. Profile Screen

Fields:

```text
Birth details
Birth time bucket
Exact time, if added
Nakshatra
Language
Simple / Traditional mode
Current city
Chat memory summary
Validated life events
Privacy
Delete data
```

Important:

```text
User should be able to see/edit what Muhūrta remembers later.
```

---

# 5. AI Screen Composer

This is the central new module.

## Input

```json
{
  "screenPurpose": "quick_proof",
  "profile": {},
  "birthInputMode": "time_bucket_plus_nakshatra",
  "engineMode": "strong_phase",
  "jyotishContext": {},
  "previousValidations": [],
  "screenRules": {
    "cardsCount": 4,
    "style": "simple_indian_english",
    "emotion": "awe_but_safe",
    "shareable": true
  },
  "forbiddenClaims": [
    "guaranteed job",
    "guaranteed marriage",
    "specific disease",
    "death",
    "exact house claim if not calculated"
  ]
}
```

## Output

```json
{
  "screenTitle": "Your recent life pattern",
  "cards": [
    {
      "type": "phase_story",
      "title": "The Search and Build Phase",
      "periodLabel": "2005–2023",
      "bodyLines": [
        "This was a long transformation phase.",
        "You may have felt restless, ambitious, and unwilling to live a normal path.",
        "This period built skill, pressure tolerance, and the hunger to create your own direction."
      ],
      "shareLine": "You were not just working. You were searching for where you truly belong.",
      "cta": "Exactly This",
      "whyLite": [],
      "whyTraditional": []
    }
  ]
}
```

AI decides:

```text
title
card order
strongest themes
wording
share line
CTA
which detail to hide/show
```

AI must not:

```text
invent exact Lagna
invent exact Dasha if unknown
invent disease
promise job/marriage/money
use fear
use fake certainty
```

---

# 6. Chat memory final plan

## We are not using in v1

```text
Mem0
pgvector
Letta
Mastra memory
custom semantic memory
```

## We are using

```text
Supabase chat_messages
Supabase chat_summaries
validated_life_events
Gemini large context
```

Flow:

```text
User asks
→ Edge function loads profile
→ loads birth mode / chart mode
→ loads recent chat messages
→ loads latest summary
→ loads validated events
→ sends to Gemini
→ saves answer
→ if chat is long, summarize old messages
```

Memory types:

```text
Recent chat = short-term memory
Chat summary = long-term conversational memory
Validated life events = truth memory
Profile = identity memory
```

---

# 7. WhatsApp share system

## New rule

```text
Every meaningful card has a small WhatsApp share icon.
```

Cards with share:

```text
Quick Proof card
Today One Line
Purpose result
Journey phase
Remedy
Ask answer
```

Share image should include:

```text
Muhūrta wordmark
card title
main insight
small context line
muhurta.app link
```

Should not include:

```text
validation buttons
full UI clutter
long paragraphs
technical data
```

Example:

```text
MUHŪRTA

The Search and Build Phase
2005–2023

“You were not just working.
You were searching for where you truly belong.”

Check your life period:
muhurta.app
```

---

# 8. Design direction

Final style:

```text
premium dark
warm Vedic gold
soft cream text
large cinematic rounded cards
subtle Indian spiritual feel
not fake cosmic
not purple AI gradients
not generic Material UI
not crypto dashboard
```

Inspired by:

```text
Spotify structure
Mastercard warmth
controlled Binance gold
```

Core design tokens:

```text
bg: #090806
surface: #15110B
surfaceSoft: #211A10
gold: #E6B85C
cream: #F3E6C8
muted: #9B8A6A
emerald: #42C78A
amber: #E6A23C
red: #D96B6B
```

Core components:

```text
MuhScaffold
MuhHeroCard
MuhPurposeChip
MuhTimingWindowCard
MuhCautionCard
MuhPhaseCard
MuhValidationButton
MuhBottomNav
MuhWhyDrawer
MuhRemedyCard
MuhChatBubble
MuhShareIconButton
MuhBrandedShareCard
```

---

# 9. Tech stack

Final v1 stack:

```text
Flutter
Supabase Auth
Supabase Postgres
Supabase Edge Functions
Gemini API
Supabase Storage if needed for share images
```

State/navigation:

```text
Riverpod
go_router
supabase_flutter
share_plus
RepaintBoundary / screenshot for image export
```

No:

```text
Mem0
pgvector
LangGraph
Letta
Mastra
complex deterministic engine first
```

---

# 10. Supabase tables planned

Core tables:

```text
profiles
birth_inputs
chart_runs
phase_segments
screen_cards
validation_feedback
validated_life_events
daily_windows
purpose_checks
chat_sessions
chat_messages
chat_summaries
remedy_catalog
remedy_completions
share_cards
consent_ledger
```

Most important new tables:

```text
screen_cards
chat_messages
chat_summaries
validated_life_events
share_cards
```

Because the app is now:

```text
AI-composed screens + remembered chat + shareable cards
```

---

# 11. Edge functions planned

```text
profile-create
chart-initialize
quick-proof-generate
validation-submit
today-get
ask
purpose-check
journey-get
remedy-today
share-card-generate
chat-summarize
```

Most important:

```text
ask
quick-proof-generate
today-get
share-card-generate
chat-summarize
```

---

# 12. Pricing direction

V1 free should be strong enough for trust.

## Free

```text
Quick Proof 3 cards
Today timing
3 Ask questions/day
1 purpose check/day
Share cards
Basic remedy
```

## Plus — ₹99/month

```text
Unlimited Ask
Unlimited purpose checks
Weekly planner
Best dates
Simple why
```

## Pro — ₹199/month

```text
12-month planning
Family/relationship comparison
Advanced why
Saved reminders
Extra profiles
```

Pricing final intent:

```text
Less than one astrologer call.
Private daily Jyotish guidance for the whole month.
```

---

# 13. Categories planned

## V1 purpose categories

```text
Interview
Money Talk
Business
Travel
Property / Vehicle
Family Talk
Relationship / Marriage Talk
Study
Health Routine
Spiritual / Puja
Legal / Dispute
Creative / Public Announcement
```

## Bigger Jyotish categories later

```text
Career
Business
Money
Marriage
Family
Health
Education
Travel
Property
Legal
Spiritual
Personality
Compatibility
Children
Naming
Festivals
Forecasting
```

---

# 14. What we removed

Removed from v1:

```text
mandatory rectification
heavy deterministic filter
separate Awe screen
Mem0
pgvector
public PSA/PCS score
astrologer marketplace
ritual commerce
full family plan
complex monthly planner
heavy Sanskrit-first UI
exact chart claims for uncertain users
```

---

# 15. Final MVP build order

```text
1. Supabase schema + RLS
2. Flutter design tokens + components
3. Auth + profile creation
4. Onboarding screens
5. Accuracy / engine mode resolver
6. Quick Proof with AI-composed cards
7. Validation feedback
8. Today screen
9. Ask chat with Supabase history
10. Chat summary
11. Purpose Check
12. Journey
13. Remedies
14. WhatsApp share image export
15. QA
```

---

# 16. Final product definition

```text
Muhūrta v1 = AI-native Jyotish companion with Proof + Ask + Today Timing + Shareable Cards.
```

Not:

```text
horoscope app
static Panchang app
astrologer marketplace
AI hallucination bot
```

Final direction:

```text
AI writes the experience.
User validation builds memory.
Jyotish context gives boundaries.
Every card can become a viral WhatsApp share.
```

That is the new app.
