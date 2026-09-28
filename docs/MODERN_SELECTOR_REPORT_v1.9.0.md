# TBS Incentive V1.9.0 — Modern Selector UI Report

วันที่ตรวจสอบ: 28 กันยายน 2026  
Branch: `feature/v1.9`  
Scope: UI/UX presentation refactor เฉพาะ Zone และ Position Selector

## สรุปผล

**Modern Selection Sheet implementation: PASS**

สร้าง reusable `ModernSelectionSheet` สำหรับ Zone และ Position โดยยังคง native `<select>` เป็น data source ภายใน และ dispatch `change` event เดิมเมื่อผู้ใช้เลือกค่า จึงไม่เปลี่ยน Calculation Engine, Profile Store, LocalStorage หรือ License Logic

## UI / UX Checklist

| รายการ | ผล | รายละเอียด |
|---|---|---|
| Modern Selection Sheet | PASS | Bottom sheet สูงประมาณ 74–75% ของ viewport, rounded top corners, drag handle |
| Zone Selector | PASS | ใช้ component เดียว, รองรับ Zone 1–16 |
| Position Selector | PASS | ใช้ component เดียว, รองรับ 2W Shipper, 4W Shipper, Hub Agent |
| Search | PASS | ค้นหาจาก label/value; ตัวอย่าง `12` แสดง Zone 12 |
| Selected state | PASS | ใช้ orange accent + check icon; ไม่มี radio button |
| Light Mode | PASS | ใช้ theme tokens เดิม |
| Dark Mode | PASS | ใช้ `data-theme="dark"` และ surface/text tokens เดิม |
| Back / Escape | PASS | Escape ปิด sheet; Android Back handler ปิด sheet ก่อน navigation |
| Swipe Down | PASS | ปัดลงจาก drag handle ตั้งแต่ 72px เพื่อปิด sheet |
| Tap outside | PASS | แตะ backdrop เพื่อปิด sheet |
| Current selection visibility | PASS | scroll current selection เข้า viewport เมื่อเปิด sheet |
| Safe Area | PASS | รองรับ `env(safe-area-inset-top/bottom/left/right)` |
| Responsive | PASS | มี rules สำหรับ 320–480px และไม่มี horizontal overflow ใน component |

## Functional Preservation

- Zone data unchanged: **YES**
- Position data unchanged: **YES**
- Calculation Engine unchanged: **YES**
- Tier / Rate unchanged: **YES**
- License Logic unchanged: **YES**
- Record Model unchanged: **YES**
- Legacy LocalStorage unchanged: **YES**
- Profile persistence flow unchanged: **YES**
- App PIN / Biometric: **ไม่ได้เพิ่ม**
- Package name unchanged: `com.cw.incentive`
- Version unchanged: `1.9.0`
- Version Code unchanged: `10`

## QA Results

- Automated tests: **54 PASS / 0 FAIL**
- JavaScript syntax: **PASS — 48 JavaScript files**
- Update contract: **PASS**
- Platform validation: **PASS**
- npm audit: **0 vulnerabilities**
- Protected calculation/tier contract files: **byte-identical to baseline**
- Packaged web asset: `modern-selection-sheet.js` present in `www/` and Android public assets
- Chromium DOM smoke test: **PASS**
  - 2 visual triggers detected
  - Zone sheet opened with 16 rows
  - Search `12` returned Zone 12
  - Zone value synced back to `calc-zone`
  - Position search `Hub` returned Hub Agent
  - Position value synced back to `profile-position`
  - Escape closed sheet

## Build / Signing

### APK

- Output: `android/app/build/outputs/apk/release/app-release.apk`
- Package: `com.cw.incentive`
- Version: `1.9.0`
- Version Code: `10`
- APK SHA-256: `d8873612a00f26cbc021c48f120ff5703a19113d3aeb6f1e54d2b176d59de707`
- `apksigner verify`: **PASS**
- v1 signature: **true**
- v2 signature: **true**
- v3 signature: **true**
- Certificate SHA-256: `D8:B2:D5:44:B0:F2:3F:DE:EA:E9:79:F6:68:66:0D:21:93:52:81:E4:B0:E9:92:E8:28:65:6A:DE:C1:14:DE:CD`

### AAB

- Output: `android/app/build/outputs/bundle/release/app-release.aab`
- AAB SHA-256: `e0645c917f85ecdd2c7ef75f1e4d5fb87c49dd16afbf9492d57be55ebef46965`
- `jarsigner -verify`: **jar verified**
- Certificate SHA-256: `D8:B2:D5:44:B0:F2:3F:DE:EA:E9:79:F6:68:66:0D:21:93:52:81:E4:B0:E9:92:E8:28:65:6A:DE:C1:14:DE:CD`
- The signer is self-signed, so Java reports the expected trust-chain warning; the artifact is signed and the certificate fingerprint matches the keystore.

### Production signing guard

- Permanent keystore reused: **YES**
- New keystore created for this task: **NO**
- Debug keystore used for release: **NO**
- Keystore certificate matched required fingerprint: **YES — 100%**

## Runtime / Release Gate

- Android device/emulator upgrade test: **PENDING** — no connected Android device/emulator was available, and emulator setup was intentionally skipped.
- App open, LocalStorage persistence after upgrade, Android keyboard/back behavior, swipe physics, and real WebView rendering therefore remain **manual device QA items**.
- GitHub Release: **NOT CREATED**
- Google Play: **NOT CREATED**
- Public deployment / Phase 5: **NOT EXECUTED**

## Final Status

**PRODUCTION SIGNED BUILD READY — RUNTIME ANDROID DEVICE QA PENDING**

This report does not claim that a real-device upgrade test passed. The signed artifacts are built from the UI-only change, use the permanent production certificate, and passed all available static, automated, and Chromium interaction checks.
