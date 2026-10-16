# Pro screen audit — 2026-10-16 (I2401, kuna / Hyderabad)

Captures: this folder (`01-*` … `10-*`). Re-run: `.\scripts\capture-pro-audit.ps1`

## P0 — Trust / correctness

| Screen | Issue |
|--------|--------|
| Today, Decode, Timing | **Partial pack** banner showed raw `today_cards expected 30, got 16` **twice** — fixed in app (humanized + deduped). |
| Today | **Subtitle repeats hero**: date card + same advice in hero — still dense; hero + one line enough. |
| Life Map | **Duplicate prose**: transition line repeated under “Ease up on”. |
| Life Map | **Chapter body** still reads like planner metadata (“Mercury tone”, “Saturn tone”) — needs editorial pass. |
| Timing | **No purpose selected** by default; “Check timing” needs chip + CTA state (disabled until selected). |
| Profile | **Birth place “gudivada”** very low contrast (grey on white). |

## P1 — UX / editorial

| Screen | Issue |
|--------|--------|
| Today | Partial banner on **every** tab that mounts pack — OK for trust but noisy on Decode/Timing; consider Today-only. |
| Today | “What are you planning?” collapsed — good; verify CTA reaches Timing with purpose. |
| Decode | **Subtitle + “This sounds like you”** overlap same copy. |
| Decode | Domain **ExpansionTiles** below fold — good; need te/hi audit. |
| Ask | **Generic pack chips** (career/money/relationship/family) — not journey-aware. |
| Ask | **Recent** thread visible — good; answer still template-heavy. |
| Nav | **Life Map vs Decode** similar book icons — differentiate. |
| Guest | **Begin** tap at 88% missed auth — script uses 92% + extra shot. |

## P2 — Polish

| Screen | Issue |
|--------|--------|
| All | Name **“kuna”** lowercase in headers — product decision (display name vs brand). |
| Life Map | Period rail **2018-2…** truncated — expected scroll; add fade hint. |
| Profile | Long form — scroll capture OK; birth time bucket section cut off in first viewport. |

## Screens not captured (manual / Maestro)

- Splash (fast), Auth OTP steps, Onboarding concern → birth → time → nakshatra
- Timing **after** purpose evaluation result
- Why drawer, Share preview, Paywall sheet
