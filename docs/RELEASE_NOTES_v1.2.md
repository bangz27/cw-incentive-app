# TBS Incentive V1.2

## Implemented

- Replaced the bottom navigation with five equal-width items: หน้าหลัก, คำนวณ, โปรไฟล์, รายการ, and ตั้งค่า.
- Removed the Summary/Dashboard destination from navigation while preserving existing history records and the locked รายการ screen.
- Added an inline Home date-range picker that updates the Home page without changing tabs or opening History.
- Updated Home totals to aggregate existing records within the selected date range.
- Added Settings → คู่มือการทำจ่าย navigation and retained the existing coffee-support QR asset.
- Kept the existing profile store, active-profile behavior, calculation engine, formulas, tiers, rates, and record schema unchanged.
- Applied responsive equal-column navigation and targeted calculator/banner spacing fixes.

## Verification

- JavaScript syntax check: passed.
- Unit tests: 13 passed.
- Android Release build: passed.
- Package: `com.cw.incentive`.
- Android `versionCode`: `2`.
- Android `versionName`: `1.2`.
- Release APK is currently unsigned because no release keystore credentials were configured in the build environment.

## Known limitations

GitHub Release creation and APK asset upload require authenticated GitHub credentials. The Share App action intentionally remains guarded until the actual V1.2 release APK URL exists; no guessed URL is embedded.
