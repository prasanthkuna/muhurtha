# PWA deploy, locale, and chart profiles

## Deploy

| Layer | When | Command |
|-------|------|---------|
| **Vercel (PWA)** | Any change under `pwa/` | Push to `main` → auto deploy to https://pwa-lyart-phi.vercel.app |
| **Supabase (BE)** | Changes under `supabase/functions/muhurtha-api/` | `supabase functions deploy muhurtha-api` from repo root |

After shipping, confirm Vercel production **Ready** and edge function version in Supabase dashboard.

## Locale (en / te / hi)

- Stored on `profiles.language_code` and mirrored in `localStorage` (`muh_locale_v1`).
- All `/api/engine` calls must include `locale` (use `useEngineBody()` in the PWA).
- UI chrome: `useLocale().t('dotted.key')` → `pwa/src/lib/messages.ts`.
- On language change: update profile → `clearPackCache()` → `refresh()` so pack/today reload in the new locale.

## Partner / friend charts

- Engine: `chart_profile_list`, `chart_profile_save`, `chart_profile_delete`, `chart_initialize`.
- Active chart: pass `chart_profile_id` on engine calls; persist id in `muh_active_chart_profile_v1`.
- Switching chart clears pack cache and reloads readings for that person.

## Cursor rule

Copy of agent guidance lives at `.cursor/rules/muhurtha-pwa-deploy.mdc` (local; may be gitignored). This doc is the tracked equivalent.
