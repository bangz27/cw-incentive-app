# TBS Incentive Production Release Signing

## Permanent signing identity

This is the new permanent production signing identity established for **V1.9.0 and later**. It intentionally does not preserve compatibility with the previous V1.0–V1.8 signing certificate because those APKs have not been released to end users.

| Field | Value |
|---|---|
| Keystore filename | `tbs-incentive-production-release.jks` |
| Alias | `tbs-incentive-release` |
| Algorithm | RSA |
| Key size | 4096 bits |
| SHA-256 certificate fingerprint | `D8:B2:D5:44:B0:F2:3F:DE:EA:E9:79:F6:68:66:0D:21:93:52:81:E4:B0:E9:92:E8:28:65:6A:DE:C1:14:DE:CD` |
| Created | 2026-09-28 |
| Valid through | 2054-02-13 |
| First release using this identity | TBS Incentive V1.9.0 |

## Storage

The keystore is stored outside the repository in secure local storage:

```text
/home/ubuntu/.secrets/tbs-incentive-production-release.jks
```

The keystore and signing secrets are not committed, uploaded, or included in this repository. Passwords and private-key material are intentionally not documented here.

## Build requirements

Release builds require all four environment variables:

```text
CW_KEYSTORE_PATH
CW_KEYSTORE_PASSWORD
CW_KEY_ALIAS
CW_KEY_PASSWORD
```

If any signing value is missing, a release Gradle task fails before building. Debug builds continue to use the Android debug keystore.

## Future releases

All future production releases must use this exact keystore and alias. Do not generate another production key, do not use `debug.keystore`, and do not replace this identity without an explicit signing migration decision.
