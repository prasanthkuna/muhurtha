# PWA Google sign-in (production)

## 1. Google Cloud OAuth client (Web)

1. [Google Cloud Console](https://console.cloud.google.com/) → your project → **APIs & Services**.
2. **OAuth consent screen** — configure (Testing + add `prasanthkuna@gmail.com` as test user until published).
3. **Credentials → Create OAuth client ID → Web application**
   - **Authorized JavaScript origins**
     - `https://pwa-lyart-phi.vercel.app`
     - `http://localhost:3000`
   - **Authorized redirect URIs** (Supabase — not Vercel):
     - `https://kdngizqrybkrckvphyin.supabase.co/auth/v1/callback`
4. Copy **Client ID** and **Client secret**.

## 2. Supabase → Authentication → Providers → Google

- Enable **Sign in with Google**.
- Paste **Client ID** into **Client IDs**.
- Paste **Client secret**.
- Save.

## 3. Supabase → Authentication → URL configuration

- **Site URL:** `https://pwa-lyart-phi.vercel.app`
- **Redirect URLs:** `https://pwa-lyart-phi.vercel.app/**`, `http://localhost:3000/**`

## 4. Map Gmail to existing phone user (+919008393030 / kuna)

Production user id: `c8b27487-fd8e-4039-a4d1-d6a6764c401f` (profile **kuna**, phone `919008393030`).

The account email is set to **`prasanthkuna@gmail.com`** on that auth user so Google can link to the same row.

In **Authentication → Providers → Google**, enable **Automatic linking** (same verified email merges into one user) if available in your dashboard.

First Google sign-in with `prasanthkuna@gmail.com` should attach a `google` identity to the existing user — not create a duplicate. Confirm under **Authentication → Users** (one user, providers: phone + google).

## 5. Push config (after Google Cloud credentials exist)

```powershell
.\scripts\setup-pwa-google-auth.ps1 `
  -GoogleClientId "YOUR_CLIENT_ID.apps.googleusercontent.com" `
  -GoogleClientSecret "YOUR_CLIENT_SECRET"
```

This runs `supabase config push` with `GOOGLE_OAUTH_*` env vars (see `supabase/config.toml`).

## 6. Verify (Chrome DevTools)

1. Open https://pwa-lyart-phi.vercel.app/welcome
2. **Continue with Google** → Google account picker → allow.
3. Land on **Today** (existing birth input) with display name **kuna**.
4. **Decode** — no duplicate identity paragraph; **Your natal luck** strip visible.
5. **Network:** `POST /api/engine` with `birth_pack_get` → 200, `natal_luck` in JSON.
6. **Application → Local Storage** — `muhurtha_birth_pack_v1` after first load.

If authorize URL returns **400**, Google client ID/secret are still empty in Supabase.
