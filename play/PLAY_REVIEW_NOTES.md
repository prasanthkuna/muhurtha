# Play Store review notes (internal testing / production)

Paste into **Release notes** or **App access / Review instructions** when Google asks how to test.

---

## App summary

**Muhūrta** (`app.muhurta`) — Jyotish timing companion. Phone OTP sign-in only (no email/password).

## How to sign in

1. Install the build from Internal testing.
2. Tap **Begin** → enter Indian mobile number with country code (e.g. `+91…`).
3. Tap **Continue** — OTP arrives via SMS (Twilio).
4. Allow SMS read consent if Android prompts, or enter the 6-digit code manually.

## Test account (fill before submit)

| Field | Value |
|-------|--------|
| Test phone | `+919008393030` |
| OTP | Delivered by SMS to that number |
| Premium access | Enable **premium-access** checkbox on sign-in for reviewer testing without purchase |

## Core flows to verify

1. **Onboarding** — birth date, place, language (English / Telugu / Hindi).
2. **Decode** — personality / chart insights.
3. **Today** — good / caution timing cards.
4. **Life Map** — life chapters (Pro depth for subscribers).
5. **Timing** — purpose-based windows.
6. **Ask** — one question answered from personal chart dossier.

## Subscriptions (Muhūrta Pro)

- Monthly / yearly via Google Play Billing (RevenueCat).
- Free tier works without purchase.
- Cancel anytime in Play Store → Subscriptions.

## Permissions

| Permission | Why |
|------------|-----|
| Location | Resolve current city for timing (optional) |
| Notifications | Local reminders for timing windows |
| SMS / phone | OTP autofill (Android); phone picker optional |

## Legal

- Privacy: https://muhurta-legal.vercel.app/privacy
- Terms: https://muhurta-legal.vercel.app/terms
- Account deletion: Profile → Account, or https://muhurta-legal.vercel.app/delete-account

## Contact

prasanthkuna@gmail.com
