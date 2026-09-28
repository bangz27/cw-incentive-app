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
| `TBS-Incentive-v1.9.0-release.apk` | `07de423185a728aac2cd59e389f4ad18e2ee2efb8b9bbc486706babc4eea8375` |
| `TBS-Incentive-v1.9.0-release.aab` | `3d75a2f7b3ac45ef41fcc4372b7031dedd37b07bfc6afd2605d22e159e21f35d` |

## Gradle Signing Safety

- Release tasks require all four `CW_*` signing variables.
- A release build without signing secrets fails before producing a release artifact.
- Release cannot silently fall back to debug signing or unsigned output.
- Debug builds continue to use the Android debug keystore.
- `.gitignore` protects `.jks`, `.keystore`, `.p12`, `.pfx`, signing env files and local secret directories.

## Regression / Scope QA

- Automated tests: **43 PASS / 0 FAIL**
- JavaScript syntax: **PASS — 45 files**
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

**BUILD READY — RUNTIME DEVICE QA PENDING**

V1.9.0 signed APK/AAB are built and cryptographically verified with the new permanent production signing identity. No public release was created. A real disposable Android device is still required before declaring the full release gate complete.
