That setup is enough to ship iOS — you don’t need a Mac.

## Your stack

| You have | Use it for |
|----------|------------|
| **iPhone** | Install TestFlight, real OTP, paywall sandbox, Telugu UI QA |
| **Codemagic** | Every `ipa` build, signing, TestFlight upload |
| **Windows PC** | Flutter code, `ios/` scaffold, push to git |

Codemagic replaces the Mac. Your iPhone replaces the simulator for final testing.

---

## Revised timeline (realistic)

| Milestone | Time |
|-----------|------|
| Apple Developer enrolled | 1–2 days (start today) |
| `ios/` scaffold + Codemagic first green build | 3–5 days |
| App Store Connect + subscriptions + RevenueCat iOS | 2–3 days (parallel) |
| TestFlight on your iPhone | **~10–12 days** |
| App Store review + live | **+3–7 days** |

**~2 weeks to TestFlight** is realistic if Apple approves your developer account quickly.

---

## What you still need (one-time)

1. **Apple Developer Program** — $99/yr  
   [developer.apple.com/programs](https://developer.apple.com/programs)

2. **Codemagic ↔ Apple signing**  
   In Codemagic: connect Apple Developer Portal (API key or App Store Connect API key). Codemagic can create/manage certificates and provisioning profiles.

3. **App Store Connect** app record for **Muhūrta** (`app.muhurta`)

4. **`codemagic.yaml`** in the repo (not there yet) — I can add this when you’re ready

---

## Recommended workflow

```
Windows (code)  →  git push  →  Codemagic builds IPA
                                      ↓
                              TestFlight upload
                                      ↓
                              Install on your iPhone
```

**On Windows (once):**
```powershell
cd app
flutter create --platforms=ios .
```
Then enable iOS icons/splash, add `Info.plist` permission strings, fix notification init for iOS.

**On Codemagic:** build `app/` with `dart_defines.json` secrets (`SUPABASE_*`, `REVENUECAT_IOS_KEY`).

**On iPhone:** install via TestFlight link after each build.

---

## iPhone testing checklist (when TestFlight is live)

1. Sign in with `+919008393030` + OTP  
2. Onboarding → home tabs load  
3. Telugu + Niharika chart profile  
4. Pro paywall → sandbox purchase (sandbox Apple ID)  
5. Notifications permission + schedule  

---

## What Codemagic can’t do for you

- Apple Developer enrollment (you, in browser)  
- App Store Connect forms (privacy, subscriptions, review notes)  
- BillDesk-style step — **Apple uses its own** banking/tax in App Store Connect  

---

## Fastest order of operations

1. **Today:** Enroll Apple Developer (if not done).  
2. **Day 1–2:** Scaffold `ios/`, small iOS fixes (notifications, plist).  
3. **Day 2:** Add `codemagic.yaml`, connect signing in Codemagic.  
4. **Day 3–5:** First green IPA → TestFlight → install on your iPhone.  
5. **Parallel:** App Store subscriptions + RevenueCat `appl_` key.  
6. **Day 8–12:** Fix whatever breaks on device, submit for review.

---

**Bottom line:** iPhone + Codemagic is a solid production setup. The blocker isn’t hardware — it’s **Apple account + first iOS scaffold + Codemagic pipeline**. Once the first TestFlight build lands on your phone, you’re in the same lane as Android internal testing.