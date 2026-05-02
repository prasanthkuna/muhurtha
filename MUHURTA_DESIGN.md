# MUHŪRTA — DESIGN.md

## 1. Product

**Muhūrta** is a purpose-first Jyotish timing companion for India.

It first checks the user’s past life periods, then helps them choose better days and time windows for important actions.

Core promise:

> First check your past. Then choose the right time.

Primary user need:

> Is this true for my life? Is today good? When should I do this? What should I avoid?

Do not design this like a generic astrology app, SaaS dashboard, crypto app, or meditation app.

Muhūrta must feel like:

- a premium Indian daily-use app
- warm, serious, and trustworthy
- modern but rooted in Jyotish
- cinematic but not fake spiritual
- practical before mystical

---

## 2. Aesthetic Direction

### Chosen direction

**Warm Vedic Streaming Interface**

Design inspiration mix:

- **70% Spotify structure** — scrollable daily cards, strong hierarchy, personal feed, bottom navigation
- **20% Mastercard warmth** — premium cream/gold warmth, trustworthy family-friendly tone
- **10% Binance accent energy** — controlled gold highlights for timing, confidence, and action

### What users should remember

The user should remember the **timing cards**:

> “This app told me exactly when to do and when to avoid.”

The most memorable UI element is the **Good Time / Caution Time split card**.

---

## 3. Brand Personality

Muhūrta should sound and feel:

- clear
- wise
- practical
- calm
- Indian
- evidence-style
- non-fearful
- non-poetic

Avoid:

- cosmic fantasy
- vague spiritual language
- overdecorated temple visuals
- horoscope newspaper feeling
- generic AI-gradient UI
- purple/blue SaaS dashboard look
- fear-based astrology

---

## 4. Visual Mood

### Keywords

```txt
warm black
vedic gold
soft cream
burnt amber
quiet emerald
deep maroon caution
large cinematic cards
fine grain texture
subtle orbital geometry
sunrise/sunset time energy
premium Indian editorial
```

### Visual metaphor

The UI should feel like **a warm brass lamp in a dark room**, not a neon horoscope app.

Use:

- dark warm backgrounds
- gold as timing/action highlight
- cream text for readability
- muted brown surfaces
- soft gradients
- thin sacred-geometry-style lines, very subtle
- rounded cards
- large typography
- simple chips
- non-distracting motion

---

## 5. Color System

Use these as base Flutter design tokens.

```dart
class MuhurtaColors {
  static const bg = Color(0xFF080704);              // warm black
  static const bgElevated = Color(0xFF0F0C07);      // elevated black-brown
  static const surface = Color(0xFF171107);         // card surface
  static const surfaceSoft = Color(0xFF21180D);     // soft warm card
  static const surfaceGold = Color(0xFF30220D);     // gold-tinted surface

  static const gold = Color(0xFFE6B85C);            // primary accent
  static const goldDeep = Color(0xFFB9822E);        // pressed/active gold
  static const goldSoft = Color(0xFFFFD98A);        // highlights

  static const cream = Color(0xFFF5E8C8);           // primary text
  static const creamMuted = Color(0xFFCDBB94);      // secondary text
  static const muted = Color(0xFF8F7D5D);           // tertiary text

  static const emerald = Color(0xFF4FC38A);         // good/supportive
  static const emeraldBg = Color(0xFF102418);       // good surface

  static const amber = Color(0xFFE6A23C);           // caution
  static const amberBg = Color(0xFF2A1B07);         // caution surface

  static const maroon = Color(0xFFB85B5B);          // avoid/strong caution
  static const maroonBg = Color(0xFF2A0E0E);        // avoid surface

  static const line = Color(0xFF3B2E1A);            // borders/dividers
  static const overlay = Color(0x99000000);         // modal overlay
}
```

### Color usage

| Role | Color |
|---|---|
| App background | `bg` |
| Primary cards | `surface` |
| Secondary cards | `surfaceSoft` |
| Primary CTA | `gold` |
| Good time | `emerald` |
| Caution time | `amber` |
| Avoid/Not matched | `maroon` |
| Primary text | `cream` |
| Secondary text | `creamMuted` |
| Disabled text | `muted` |

### Rules

- Never use pure white.
- Never use bright purple gradients.
- Never use default Material blue.
- Gold should be precious, not everywhere.
- Caution should feel serious, not scary.
- Good should feel calm, not casino-green.

---

## 6. Typography

Do not use Arial, Roboto, Inter, or default system font as the visible brand style.

### Recommended fonts

#### English / Latin

- **Display:** Fraunces
- **Body:** Instrument Sans
- **Numerals / timing:** IBM Plex Mono or JetBrains Mono

#### Telugu

- **Display:** Anek Telugu SemiBold
- **Body:** Noto Sans Telugu

#### Hindi / Devanagari

- **Display:** Anek Devanagari SemiBold
- **Body:** Noto Sans Devanagari

### Type scale

```dart
class MuhurtaType {
  static const displayXL = 40.0;
  static const displayL = 32.0;
  static const titleXL = 26.0;
  static const titleL = 22.0;
  static const titleM = 18.0;
  static const bodyL = 16.0;
  static const bodyM = 14.0;
  static const bodyS = 12.0;
  static const timeXL = 28.0;
  static const chip = 14.0;
}
```

### Typography rules

- Use display font for screen titles and key phase statements.
- Use mono font for time windows.
- Time windows must be visually strong.
- Body copy must be short, readable, and line-broken cleanly.
- Telugu strings will be longer; allow wrapping and avoid tight chips.

---

## 7. Layout System

### Screen rhythm

Use a vertical feed structure.

```txt
Top greeting / title
Hero decision card
Primary action chips
Good / caution timing card
Current phase card
Remedy card
Secondary content
```

### Spacing

```dart
class MuhurtaSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
  static const xxl = 32.0;
  static const page = 20.0;
}
```

### Radius

```dart
class MuhurtaRadius {
  static const chip = 999.0;
  static const card = 28.0;
  static const sheet = 32.0;
  static const button = 18.0;
}
```

### Elevation

Use soft shadows only. No hard Material shadows.

```dart
BoxShadow(
  color: Colors.black.withOpacity(0.28),
  blurRadius: 28,
  offset: Offset(0, 16),
)
```

---

## 8. Core Components

Build custom Flutter components. Do not rely on generic Material card styling.

### 8.1 `MuhurtaScaffold`

App shell with:

- warm black background
- safe area handling
- optional grain overlay
- custom bottom nav
- top-right profile icon

### 8.2 `MuhurtaHeroCard`

Used for:

- Welcome promise
- Today primary guidance
- Quick Proof phase card
- Current Life Period

Style:

- large rounded card
- subtle radial gold glow
- cream headline
- muted secondary text
- optional small Jyotish metadata row

### 8.3 `PurposeChip`

Used for purpose selection.

States:

- default
- selected
- disabled

Purpose chip examples:

```txt
Interview
Money Talk
Business
Travel
Property
Family Talk
Study
Health Routine
```

Selected chip:

- gold surface
- dark text
- subtle scale on tap

### 8.4 `TimingSplitCard`

Most important component.

Shows:

- Good times
- Caution times
- better option if needed

Layout:

```txt
┌──────────────────────────────┐
│ Good times                   │
│ 10:20 AM – 11:45 AM          │
│ Best for clear discussion    │
├──────────────────────────────┤
│ Be careful                   │
│ 3:05 PM – 4:35 PM            │
│ Avoid emotional replies      │
└──────────────────────────────┘
```

Rules:

- Good section uses emerald accent.
- Caution section uses amber accent.
- Avoid section uses maroon accent.
- Time text must be large and mono.

### 8.5 `PurposeResultCard`

Shows purpose check result.

Fields:

```txt
Purpose
Status
Best time
Avoid time
Better option
What to do
Why
```

Status styles:

| Status | Style |
|---|---|
| Matched | emerald accent |
| Partly Matched | amber accent |
| Not Matched | maroon accent |

### 8.6 `PhaseCard`

Used in Quick Proof and Journey.

Content structure:

```txt
2023–2025
Career and money planning became stronger.

You may have started thinking more seriously about growth, recognition, or building something more stable.

This period supports progress, but results improve through skill and consistency, not sudden luck.

[Exactly This] [Partly True] [Wrong Timing] [Didn’t Happen]
```

Rules:

- 2–3 sentences only.
- Do not show all categories.
- Highlight top 2–3 active themes.
- Make it screenshot-friendly.
- Add subtle Muhūrta watermark only on share image, not normal UI.

### 8.7 `ValidationButtonGroup`

Buttons:

```txt
Exactly This
Partly True
Wrong Timing
Didn’t Happen
```

Visual treatment:

- `Exactly This`: emerald outline/fill
- `Partly True`: amber outline/fill
- `Wrong Timing`: gold outline/fill
- `Didn’t Happen`: muted outline

### 8.8 `WhyDrawer`

Bottom sheet for explanation.

Two modes:

1. Simple
2. Traditional

Simple example:

```txt
Why Muhūrta said this

Your current life period shows stronger pressure around work and responsibility.
Jupiter support improves planning, but Saturn makes results slower.
```

Traditional example:

```txt
Based on:
Mahadasha / Antardasha
Moon Nakshatra
Chandrabala
Transit support
```

### 8.9 `RemedyCard`

Simple and non-fearful.

Example:

```txt
Today’s remedy
Speak less during conflict.
Offer water to Tulasi.
Do 5 minutes silent prayer before work.
```

### 8.10 `AccuracyBadge`

Shows chart/input quality without scaring users.

Labels:

```txt
High detail
Good detail
Phase guidance
General day guidance
```

Never use:

```txt
High risk
Danger
Bad chart
Weak destiny
```

---

## 9. Screen Design Rules

## 9.1 Welcome

Goal: trust-first curiosity.

Copy:

```txt
Don’t trust us yet.

First, Muhūrta checks your past.
Then it helps you choose better timing for your next action.

[Put Muhūrta to the Test]
```

Design:

- large editorial headline
- warm black background
- soft gold orbital line behind headline
- one CTA only
- no charts, no planets clutter

---

## 9.2 Birth Basics

Fields:

```txt
Name
Date of birth
Birth place
Current city
Language
```

**Localization (v1):** Supported app languages are **English, Telugu, Hindi**. Pre-select **Language** from **device locale** when it matches `en` / `te` / `hi` (with sensible mapping for regional tags like `en_IN`); user can override before **Continue**. Persist choice to profile as `language_code`.

Design:

- calm form
- large labels
- minimal fields per screen
- no dense technical explanation

---

## 9.3 Birth Time Bucket

Copy:

```txt
What time were you born?
```

Options:

```txt
Early morning — 4 AM to 8 AM
Morning — 8 AM to 12 PM
Afternoon — 12 PM to 4 PM
Evening — 4 PM to 8 PM
Night — 8 PM to 12 AM
Late night — 12 AM to 4 AM
I know exact time
I don’t know
```

Design:

- vertical choice cards
- selected state with gold glow
- no guilt for not knowing exact time

---

## 9.4 Nakshatra Input

Copy:

```txt
Do you know your Janma Nakshatra?
```

Options:

```txt
Select Nakshatra
I don’t know
```

Optional:

```txt
Pada, if known
```

Design:

- searchable dropdown
- show simple helper: “No problem if you don’t know.”

---

## 9.5 Accuracy Result

Use one of these:

```txt
Your chart has high detail.
Muhūrta can show life periods, past patterns, and personal timing.
```

```txt
Your chart has good detail.
Some exact timing may shift, but major life periods can still be read.
```

```txt
Your Nakshatra is enough to read major life periods.
Add birth time later for deeper chart detail.
```

```txt
Muhūrta can still show today’s general good and caution times.
Add Nakshatra or birth time later for personal life periods.
```

Design:

- badge + explanation
- no red warning
- one CTA: “Check my past” or “Go to Today”

---

## 9.6 Quick Proof

Goal: first trust moment.

Show 3–5 phase cards.

Card copy pattern:

```txt
From 2023 to 2025, career ambition and money planning became stronger.
You may have started thinking more seriously about growth, recognition, or building something more stable.
This period supports progress, but results improve through skill and consistency, not sudden luck.
```

Design:

- one card per screen or vertical stack with strong spacing
- validation buttons visible below every card
- progress indicator: “2 of 5 checked”

---

## 9.7 Today

Goal: daily habit.

Card order:

```txt
1. What are you planning today?
2. Today is better for
3. Be careful with
4. Good times
5. Caution times
6. Current life period
7. Today’s remedy
8. Upcoming shift
```

Design:

- purpose chips at top
- timing split card in first viewport
- current phase below timing
- no dense chart data

---

## 9.8 Purpose Check

Goal: answer “when should I do this?”

Result template:

```txt
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

Design:

- status badge large
- time windows prominent
- “What to do” line must be visible without scrolling

---

## 9.9 Journey

Goal: phase-wise life story.

Sections:

```txt
Current Phase
Recent Past
Full Journey
Next 12 Months
```

Design:

- vertical phase timeline
- large phase cards
- avoid year-grid dashboard
- show 2–3 themes per phase

---

## 9.10 Remedies

Goal: simple daily action.

Design:

- calm card
- no fear
- no commerce
- completion interaction with soft haptic

---

## 10. Motion System

Motion should feel like **lamp light slowly revealing information**.

Use:

- soft fade-in
- slight upward slide
- staggered card reveal
- tap scale on chips/buttons
- bottom sheet glide
- gentle shimmer only while calculating

Avoid:

- bouncy cartoon motion
- excessive astrology spinning effects
- confetti for serious predictions
- fast crypto-style flashing

### Motion tokens

```dart
class MuhurtaMotion {
  static const fast = Duration(milliseconds: 140);
  static const normal = Duration(milliseconds: 240);
  static const slow = Duration(milliseconds: 420);
}
```

### Page load pattern

```txt
Title fades in at 0ms
Hero card fades/slides at 100ms
Purpose chips stagger at 180ms
Timing card appears at 280ms
Secondary cards appear at 380ms
```

---

## 11. Background and Texture

Use a layered background:

```txt
Base warm black
Subtle radial gold glow from top-right
Very low-opacity grain
Thin orbital line motifs on hero cards
```

Rules:

- Background should add atmosphere, not reduce readability.
- Sacred geometry must be subtle, not decorative clutter.
- Avoid obvious mandala wallpaper.

---

## 12. Copy Rules

### Use

```txt
From 2023...
This period may have...
Work and money planning...
Be careful during this time.
Better do this after...
Today is better for...
```

### Avoid

```txt
resonance
alignment
abundance
cosmic rhythm
clarity phase
comeback phase
the universe supports you
high vibration
manifestation portal
```

### Tone examples

Good:

```txt
Today is better for planning than emotional discussion.
```

Bad:

```txt
Your cosmic energies are aligned for communication.
```

Good:

```txt
From this period, work pressure and money planning became stronger.
```

Bad:

```txt
Your career aura entered an abundance phase.
```

---

## 13. Jyotish Term Display

Default mode: simple.

Do not dump technical terms on the main screen.

Show technical terms only inside `WhyDrawer` or Traditional mode.

### Three-layer explanation model

```txt
Vedic term
Simple meaning
Why it matters now
```

Example:

```txt
Mahadasha
Your main life period
It shows the broad theme active for many years.
```

---

## 14. Accessibility

Must support:

- large text scaling
- screen readers
- minimum 44px touch targets
- high contrast between cream text and dark backgrounds
- no color-only meaning; use labels with status colors
- Telugu and Hindi text wrapping

---

## 15. Flutter Implementation Rules

Use:

- custom theme
- custom components
- `google_fonts` or bundled brand fonts
- `AnimatedContainer`, `TweenAnimationBuilder`, `AnimatedOpacity`, `SlideTransition`
- haptics for validation and remedy completion

Avoid:

- default Material cards
- default AppBar look
- default blue buttons
- generic ListTiles for major screens
- dense tables
- raw JSON-looking data

---

## 16. Component Naming

Use these component names:

```txt
MuhurtaApp
MuhurtaScaffold
MuhurtaBottomNav
MuhurtaHeroCard
MuhurtaPurposeChip
MuhurtaTimingSplitCard
MuhurtaPurposeResultCard
MuhurtaPhaseCard
MuhurtaValidationGroup
MuhurtaWhyDrawer
MuhurtaRemedyCard
MuhurtaAccuracyBadge
MuhurtaSectionHeader
MuhurtaOrbitalBackground
```

---

## 17. Bottom Navigation

Tabs:

```txt
Today
Purpose
Journey
Remedies
```

Profile lives top-right.

Do not add more tabs in v1.

---

## 18. Icon Direction

Use thin-line icons with rounded ends.

Preferred metaphors:

```txt
Today: small sun / lamp
Purpose: arrow / target
Journey: path / timeline
Remedies: leaf / hand / diya
Profile: simple person circle
Good time: rising sun
Caution: small triangle / dusk
Phase: moon arc
```

Avoid:

- scary occult symbols
- skulls
- heavy temple iconography
- cartoon zodiac icons

---

## 19. Share Card Style

Phase cards and purpose results should be shareable later.

Share card must include:

```txt
Muhūrta watermark
phase or purpose result
1–2 strongest sentences
good/caution time if relevant
```

Share card background:

- warm black
- gold rim
- subtle grain
- large cream text

Do not include private birth details on share cards.

---

## 20. Do / Don’t Summary

### Do

```txt
Make timing windows visually memorable.
Use simple Indian English.
Use warm black and gold.
Make cards screenshot-friendly.
Show practical next action.
Use Jyotish terms only when helpful.
Give better option when today is weak.
```

### Don’t

```txt
Do not make a generic horoscope feed.
Do not use purple AI gradients.
Do not use public scoreboards.
Do not scare users with risk language.
Do not force exact birth time.
Do not make every screen look like a form.
Do not show all Jyotish calculations on main UI.
```

---

## 21. Final Design North Star

Muhūrta is not an astrology content app.

Muhūrta is not a scoreboard app.

Muhūrta is not a ritual marketplace.

Muhūrta is:

> A premium daily Jyotish timing companion that proves itself through the user’s past and helps them choose better timing for real-life actions.

Every screen must answer one of these:

```txt
Did this match my life?
Is today good?
When should I do this?
What should I avoid?
What is the better time?
```
