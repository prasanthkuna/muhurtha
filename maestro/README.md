# Maestro flows (Muhurta)

**Install CLI (Windows):**

```powershell
.\scripts\install-maestro.ps1
```

**Full signed-in audit + Play store PNGs** (keep USB connected, phone unlocked, signed in):

```powershell
.\scripts\run-maestro-audit.ps1 -Device 10BF441Y76003GL
```

Options:

- `-SkipInstall` — reuse last APK
- `-SkipGuest` — skip welcome/sign-in capture (does not clear app data)
- `-IncludeBilingual` — te-IN then en-IN via profile language switch
- `-ReleaseBuild` — release APK + `MAESTRO_SEMANTICS=true`

**Outputs**

| Flow | PNG location |
|------|----------------|
| `capture_home_tabs.yaml` | `app/test/audit/flows/` |
| `capture_store_en.yaml` | `play/assets/screenshots/en-IN/` |
| `capture_store_te.yaml` | `play/assets/screenshots/te-IN/` |
| `capture_guest_welcome.yaml` | `app/test/audit/flows/guest-*` |

**Smoke (clears app data):**

```powershell
cd maestro
..\tools\maestro\maestro\bin\maestro.bat --device YOUR_DEVICE test flows/smoke_launch.yaml flows/smoke_auth.yaml
```

**Notes**

- Bottom nav uses **Today 10% · Life Map 30% · Decode 50% · Timing 70% · Ask 90%** (y ≈ 94%).
- If Maestro loses ADB (`UNAVAILABLE`), `run-maestro-audit.ps1` falls back to `capture-audit-flows.ps1` / adb store script.
- Store bilingual capture: `capture_store_bilingual.yaml` (Telugu UI first).
