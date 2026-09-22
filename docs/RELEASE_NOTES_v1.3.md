# TBS Incentive V1.3

V1.3 contains only targeted UI changes on the Calculator screen. The 2W Shipper and 4W Shipper views share the same updated profile-field layout; no new screen or component was introduced.

The Calculator heading text `คำนวณรายได้` was removed from the upper-left corner. The missing-profile alert was made shorter with reduced padding while retaining its full message and `สร้างโปรไฟล์` button. The Hub field now shows `ฮับ ข้อมูลจากโปรไฟล์ปัจจุบัน`, while the Name field shows only `ชื่อ-นามสกุล`. Both fields use the same two-column layout and 52px input height, with responsive stacking on narrow screens and no horizontal overflow.

The Calculation Engine, tiers, rates, deductions, RTS calculation, profile data model, auto-fill behavior, and navigation were not changed. Live browser verification confirmed profile auto-fill for both fields, equal Hub/Name dimensions of 455×52 on the verification viewport, no horizontal overflow, and unchanged sample results: 2W Zone 1 with 70 parcels = ฿632.00 and 4W Zone 1 with Size S 70 = ฿924.00.

The Android release metadata is `versionCode 3`, `versionName 1.3`, with package `com.cw.incentive`. JavaScript syntax checks and all 13 unit tests passed. The APK was built successfully and signed with the local debug keystore for installation testing.
