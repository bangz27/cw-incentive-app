# TBS Incentive V1.9.0 — Signing / Release Build Report

วันที่ดำเนินการ: 2026-09-28
Repository: `bangz27/cw-incentive-app`
Base commit: `238b3686e2db70b9b13664761a3cf43221e27326`
Branch: `feature/v1.9`

## Build Result

| Artifact | Result |
|---|---|
| V1.9.0 APK | **PASS** |
| V1.9.0 AAB | **PASS** |
| Public release / Google Play | **NOT PUBLISHED** ตามคำสั่ง |

## Production Signing Identity

A new permanent production release keystore was created because the project is not released to end users and the old V1.0–V1.8 certificate is intentionally not preserved.

| Field | Value |
|---|---|
| New keystore created | YES — exactly one new key |
| Keystore filename | `tbs-incentive-production-release.jks` |
| Alias | `tbs-incentive-release` |
| Algorithm | RSA |
| Key size | 4096 bits |
| Certificate SHA-256 | `D8:B2:D5:44:B0:F2:3F:DE:EA:E9:79:F6:68:66:0D:21:93:52:81:E4:B0:E9:92:E8:28:65:6A:DE:C1:14:DE:CD` |
| Created | 2026-09-28 |
| Valid through | 2054-02-13 |
| First release | V1.9.0 |

Secure local backup path:

```text
/home/ubuntu/.secrets/tbs-incentive-production-release.jks
```

The keystore is outside the repository and has filesystem mode `600`. Passwords and private-key material are not included in this report.

## APK Signature Verification

`apksigner verify --verbose --print-certs` result:

- APK signed: **YES**
- Certificate matches the new keystore: **YES**
- APK Signature Scheme v1: **true**
- APK Signature Scheme v2: **true**
- APK Signature Scheme v3: **true**
- Debug certificate detected: **NO**
- Signer subject: `CN=TBS Incentive V1.9 Release, OU=Release, O=CW Incentive, C=TH`
- AAB `jarsigner -verify`: **PASS**
- AGP also emitted the v4 idsig file beside the release APK

## Package Metadata

```text
package: com.cw.incentive
versionName: 1.9.0
versionCode: 10
compileSdkVersion: 35
```

## Artifacts

| Artifact | SHA-256 |
|---|---|
| `TBS-Incentive-v1.9.0-release.apk` | `d9d2de29aec67df94ef831695a2de609ad527d0396ee5cd625702622dc14fe2c` |
| `TBS-Incentive-v1.9.0-release.aab` | `c10f4d9383bf0a249e70c4389751d764042d612a6d34169b5e3fbdfddebcb7f3` |

## Gradle Signing Safety

- Release tasks require all four `CW_*` signing variables.
- A release build without signing secrets fails before producing a release artifact.
- Release cannot silently fall back to debug signing or unsigned output.
- Debug builds continue to use the Android debug keystore.
- `.gitignore` protects `.jks`, `.keystore`, `.p12`, `.pfx`, signing env files and local secret directories.

## Update Checker / Settings Cleanup

### Root cause

- Update Checker queried GitHub `releases/latest`; the public repository currently returns `v1.5.0`.
- The cooldown/cache branch returned any cached release as `update-available` without comparing it with the installed version. This allowed stale `v1.5.0` metadata to appear on V1.9.0.
- This repository has no Supabase release/update table, migration, or query. The Supabase REST endpoint also rejected the configured public key with HTTP 401 (`Secret API key required`), so no database mutation was performed.

### Fixed behavior

- Numeric SemVer comparison is used for remote releases and cached releases.
- If the remote release is older than the installed version, the effective latest becomes the bundled current version instead of showing `ahead` or an old update.
- Current `1.9.0` + remote `1.5.0` now returns **latest / up to date**.
- Current `1.9.0` + remote `1.9.0` returns **latest / up to date**.
- Current `1.8.1` or `1.5.0` + remote `1.9.0` returns **update available**.
- Stale cache is compared and replaced; it can no longer downgrade the displayed latest version.
- The effective V1.9.0 fallback points to the existing GitHub Releases landing page. A direct V1.9.0 APK URL is intentionally not published or invented while public release creation is prohibited.

### Settings cleanup

- Share App Card: **REMOVED**
- Share App click handler: **REMOVED**
- Share App-only CSS rule: **REMOVED**
- Update Card: **PRESERVED**
- Profile, Owner/License, Payment Details, Support, Contact, About, Theme and other Settings: **PRESERVED**
- Share Story functionality: **PRESERVED**

## Regression / Scope QA

- Automated tests: **49 PASS / 0 FAIL**
- JavaScript syntax: **PASS — 46 files**
- Update contract: **PASS**
- Platform validation: **PASS**
- npm audit: **0 vulnerabilities**
- Calculation Engine: **unchanged**
- Incentive tiers/rates: **unchanged**
- License Logic: **unchanged**
- Legacy LocalStorage: **unchanged**
- App PIN / Biometric: **not added**
- `git diff --check`: **PASS**
- Secret/private-key scan: **no exposed secret or private key found**

## Install / Runtime QA

Clean-install runtime testing was **NOT RUN** because the user does not use Android Emulator. A temporary API 35 AVD was created for this attempt, but its boot job was stopped and no emulator process remains.

Therefore these device-only checks remain pending on a real disposable Android test device:

- Clean install
- Launch and screen flow
- Calculation interaction
- LocalStorage/history persistence
- Dark/light theme
- App restart persistence
- Reinstall behavior

The old V1.8 APKs use the previous certificate, so direct upgrade installation is intentionally not used for this new signing identity.

## Security Result

| Check | Result |
|---|---|
| Keystore committed | NO |
| Password committed | NO |
| Private key exposed | NO |
| Debug keystore used for production | NO |
| Old release key reused | NO |
| New key count created | ONE |
| Public release created | NO |

## Final Status

**BUILD READY — UPDATE/SETTINGS STATIC QA PASS — RUNTIME DEVICE QA PENDING**

V1.9.0 signed APK/AAB are rebuilt and cryptographically verified with the same permanent production signing identity. Update Checker cleanup and Share App removal are packaged in the artifacts. No public release was created. A real disposable Android device is still required before declaring the full release gate complete.
