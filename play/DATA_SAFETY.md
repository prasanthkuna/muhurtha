# Play Console — Data safety (copy-paste answers)

Use when filling **App content → Data safety** after developer verification.

**Privacy policy URL:** `https://muhurta-legal.vercel.app/privacy`  
**Account deletion:** `https://muhurta-legal.vercel.app/delete-account` (also in-app: Profile → Account)

---

## Does your app collect or share user data?

**Yes**

## Data types collected

| Type | Collected | Shared | Purpose | Optional? |
|------|-----------|--------|---------|-----------|
| Name | Yes | No | App functionality | Yes (optional field) |
| Phone number | Yes | No | Account / auth | No |
| Date of birth | Yes | No | App functionality (chart) | No |
| Approximate location | Yes | No | App functionality (city/timezone) | Yes (permission) |
| Precise location | Yes | No | Same as above when user grants | Yes |
| App interactions (Ask, preferences) | Yes | No | App functionality | No |
| Purchase history | Yes | No | Account / subscription | No |
| Crash logs | No | — | — | — |
| Analytics / advertising ID | **No** | — | — | — |

## Data shared with third parties

| Party | Data | Purpose |
|-------|------|---------|
| Supabase | Account, profile, chart content | Backend / auth |
| RevenueCat | Purchase identifiers | Subscriptions |
| Google Play | Billing | Payments |
| Cloud AI (via Supabase functions) | Chart prompts for content generation | App functionality |

**Not sold** to data brokers.

## Security

- Data encrypted in transit (HTTPS/TLS).
- Data encrypted at rest (Supabase hosted Postgres).

## Account deletion

- Users can request deletion in-app (Profile → Account → Email deletion request).
- Web instructions: https://muhurta-legal.vercel.app/delete-account
- Completed within 7 days.

## Target audience

- Not designed for children under 13.
- Suggested content rating: **Everyone** or **Teen** depending on questionnaire wording (astrology / life guidance, no violence).

## Ads

- **No ads** in the app.
