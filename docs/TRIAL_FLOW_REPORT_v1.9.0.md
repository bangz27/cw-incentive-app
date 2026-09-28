# TBS Incentive V1.9.0 — Login / Package Selection / Trial Flow Report

วันที่ตรวจสอบ: 28 กันยายน 2026
Repository: `bangz27/cw-incentive-app`
Branch: `feature/v1.9`
Package: `com.cw.incentive`
Version: `1.9.0` (versionCode `10`)

## สรุปผล

เพิ่ม flow สำหรับผู้ใช้ที่ Login สำเร็จแต่ยังไม่มีสิทธิ์ใช้งาน โดยยังใช้ `public.app_licenses` เป็น source of truth เดิม และไม่แก้ calculation engine, tier/rate, legacy LocalStorage หรือ purchase/license owner logic เดิม

- หลัง Login สำเร็จและยังไม่มี `app_licenses` row: แสดงหน้า **Package Selection** ค้างอยู่ใน app shell
- ไม่เริ่ม Trial อัตโนมัติ และไม่ auto-navigate ไปหน้า Calculator
- แสดงแพ็กเกจ **LIFETIME 79 บาท**, **STARTER 49 บาท** และ **ทดลองใช้ฟรี 14 วัน**
- ปุ่ม Trial ต้องผ่าน confirmation dialog ก่อนเรียก backend
- Trial ถูกผูกกับ Supabase account และเริ่มได้ครั้งเดียว
- เมื่อ Trial หมดอายุ จะไม่เริ่มใหม่จาก LocalStorage และจะแสดงทางเลือก Lifetime/ซื้อสิทธิ์
- ผู้ใช้ Lifetime ที่ active จะไม่เห็น/ไม่สามารถเริ่ม Trial
- Countdown ใช้ค่าที่คำนวณจาก PostgreSQL `now()`; เมื่อเหลือน้อยกว่า 24 ชั่วโมงจะแสดงเป็นชั่วโมง

## Backend ที่ deploy แล้ว

Supabase project: `tbs-incentive` (`cqzuhwzvxrmlezfkbpwv`)

Migration: `persistent_trial_activation`

เพิ่มคอลัมน์ใน `public.app_licenses`:

- `trial_started_at timestamptz`
- `trial_ends_at timestamptz`
- `trial_used_at timestamptz`

Existing `TRIAL` rows ถูก backfill ให้ถือว่า Trial ถูกใช้แล้ว เพื่อไม่ให้ migration เปิดช่องให้เริ่ม Trial ซ้ำ

### RPC ที่ใช้

- `get_my_license_status()`
  - `security definer`
  - กรองด้วย `auth.uid()`
  - ใช้ PostgreSQL `now()` เป็นเวลาอ้างอิง
  - คืน `trial_used`, `remaining_hours`, `server_now` เพิ่มเติม
- `start_my_trial()`
  - `security definer`
  - ต้องมี authenticated session
  - lock row ด้วย `FOR UPDATE`
  - Trial ยาว 14 วัน
  - ปฏิเสธ Lifetime, active license, suspended license และ Trial ที่เคยใช้แล้ว
  - grant execute เฉพาะ `authenticated`

ตรวจ security guard แล้ว: การเรียก `start_my_trial()` โดยไม่มี `auth.uid()` ถูกปฏิเสธด้วย `42501: authenticated session required`

## QA ผลล่าสุด

| รายการ | ผล |
|---|---:|
| Automated tests | **60 PASS / 0 FAIL** |
| JavaScript syntax | **PASS** — 49 files |
| Update contract | **PASS** |
| Platform validation | **PASS** |
| Protected calculation/tier files | **byte-identical / ไม่มี diff** |
| npm audit | เดิมตรวจผ่าน 0 vulnerabilities; dependencies ไม่ได้เปลี่ยนในงานนี้ |
| Web/Android packaged assets | **PASS** — `license-manager.js`, Package Selection และ Trial markup ถูก sync ครบ |

## Signed production artifacts

Production certificate ที่ใช้กับ artifacts รอบนี้:

`D8:B2:D5:44:B0:F2:3F:DE:EA:E9:79:F6:68:66:0D:21:93:52:81:E4:B0:E9:92:E8:28:65:6A:DE:C1:14:DE:CD`

APK ตรวจด้วย `apksigner` ผ่าน v1/v2/v3 และมี package/version ตรงตาม release gate

- Package: `com.cw.incentive`
- Version: `1.9.0`
- Version code: `10`

| Artifact | SHA-256 |
|---|---|
| `artifacts/TBS-Incentive-v1.9.0-release.apk` | `a93bcf4f9c036b5960ba943930a5de253fa9aecb80e1fe303dca8f1de0365545` |
| `artifacts/TBS-Incentive-v1.9.0-release.aab` | `43141f765feede33009252eafaeac5decd075981e5c37168041fd5016a900e9a` |

## Runtime limitation

ไม่ได้ติดตั้งทับบนอุปกรณ์จริงหรือ Android emulator ในรอบนี้ เนื่องจาก environment นี้ไม่มีอุปกรณ์ที่ผู้ใช้ต้องการใช้ทดสอบ และผู้ใช้ระบุว่าไม่ต้องการใช้ emulator ดังนั้น runtime install/upgrade และการตรวจ LocalStorage บนอุปกรณ์จริงยังต้องทำบนเครื่อง Android จริงก่อนเผยแพร่

## Scope guard

ไฟล์ protected ที่ตรวจแล้วไม่มี diff:

- `calculation-engine.js`
- `calculator.js`
- `config.js`
- `two-w-config.js`
- `record-model.js`
- `history.js`
- `user-storage.js`

ไม่มีการเพิ่ม App PIN หรือ Biometric และไม่มีการสร้าง/เปลี่ยน production signing identity ในงานนี้
