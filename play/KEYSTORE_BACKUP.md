# Copy `upload-keystore.jks` and record the password from `key.properties` in a secure vault.

| File | Location (gitignored) |
|------|------------------------|
| Upload keystore | `app/android/upload-keystore.jks` |
| Passwords | `app/android/key.properties` |

## Minimum backup (do today)

1. Copy both files to encrypted cloud storage (1Password, Bitwarden attachments, or encrypted drive).
2. Save the **Play App Signing** certificate from Play Console after first upload (Setup → App signing).
3. Never commit `.jks` or `key.properties` to git.

## If you lose the upload keystore

- You cannot publish updates to the same `app.muhurta` listing unless Google approves a key reset (slow, not guaranteed).
- Treat this like losing a production database password.

## Regenerate (only before first Play upload)

```powershell
Remove-Item app\android\upload-keystore.jks, app\android\key.properties
.\scripts\create-upload-keystore.ps1
.\scripts\build-release-aab.ps1
```

After Play has accepted a release, **do not** regenerate.
