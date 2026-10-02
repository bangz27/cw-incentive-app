# TBS Incentive v1.9.0 — GPS Persistence & Dashboard Report

วันที่ตรวจสอบ: 3 ตุลาคม 2026

## Status

**Partially verified**

Implementation และ deployment สำเร็จ แต่ยังไม่ได้สร้าง production test download ใหม่ด้วย `location_permission=granted` เพื่อหลีกเลี่ยงการเพิ่มข้อมูลทดสอบเข้า analytics จริง

## Root cause

1. `public.qr_scan_events` มีคอลัมน์ `latitude` และ `longitude` อยู่แล้ว แต่ Tracking Function รุ่นก่อน validate พิกัดเพื่อ reverse geocoding แล้วไม่เขียนพิกัดลง event payload
2. Dashboard query อ่านพิกัดอยู่แล้ว แต่ไม่ได้บังคับเรียงผลซ้ำหลังรับ response และไม่ได้ส่ง alias `source` / `platform` ให้ UI โดยตรง
3. Recent Activity แสดง `scanned_at` แบบ ISO ดิบ จึงไม่เป็นเวลาไทยและไม่แสดงพิกัด GPS ต่อรายการ

## Changes

- `supabase/functions/tbs-download-v15/index.ts`
  - เขียน latitude/longitude ที่ผ่าน validation ลง `qr_scan_events` เฉพาะเมื่อ permission เป็น `granted`
  - กรณี denied/timeout/unavailable ยังคงเก็บ permission state และพิกัดเป็น `null`
- `supabase/functions/tbs-download-dashboard/index.ts`
  - เรียง events ตาม `scanned_at DESC`
  - ส่ง latitude/longitude, source และ platform ใน event response
- `license-center/download-analytics.js`
  - รักษาค่า coordinate ที่เป็น `0` ได้ถูกต้อง
  - เพิ่ม formatter เวลา `Asia/Bangkok` พร้อมปีพุทธศักราช
- `license-center/download-analytics-ui.js`
  - แสดงพิกัด GPS, Province/District/Subdistrict, source และ platform
  - แสดงเวลาในรูปแบบ `📅 DD-เดือน-พ.ศ. 🕟 HH:MM 🇹🇭`
- `license-center/index.html`
  - ปรับคำอธิบายแผนที่ให้ตรงกับ GPS และพื้นที่ไทย
- `license-center/style.css`
  - เพิ่ม neobrutalism minimalist styling เฉพาะ Dashboard
- Tests เพิ่ม/ปรับเฉพาะ Download Location Analytics

## Database

ไม่ต้อง apply migration ใหม่ เพราะ schema ที่ deploy อยู่มีคอลัมน์ที่จำเป็นแล้ว:

- `qr_scan_events.latitude` — `double precision`, nullable
- `qr_scan_events.longitude` — `double precision`, nullable
- `qr_scan_events.location_permission` — check: `granted`, `denied`, `timeout`, `unavailable`
- `qr_scan_events.province`, `district`, `subdistrict`
- `qr_scan_events.download_source`
- `qr_scan_events.scanned_at` — `timestamptz`

Aggregate ปัจจุบันจาก Supabase: download events 9 รายการ, มี latitude 9 รายการ, มี longitude 9 รายการ; ข้อมูลเดิมยังมี `location_permission` เป็น `NULL` จึงไม่นับเป็นหลักฐานของ granted event รุ่นใหม่

## Verification

- `npm test` — **72 PASS / 0 FAIL**
- JavaScript syntax checks — **PASS**
- `npm run verify:update` — **PASS**
- `npm run verify:platform` — **PASS**
- Protected calculation/tier/license/storage files — **ไม่ถูกแก้**
- Tracking Edge Function `tbs-download-v15` — **ACTIVE v6**
- Dashboard Edge Function `tbs-download-dashboard` — **ACTIVE v5**
- Live Tracking GET — **HTTP 200**
- Live Tracking HEAD — **HTTP 204**, ไม่สร้าง event
- Live Dashboard unauthenticated — **HTTP 401**

## Limitation

ยังไม่ได้ทำ live POST ด้วยพิกัดจริงจาก browser เพื่อสร้างแถวทดสอบใหม่ เพราะจะเพิ่มข้อมูลทดสอบเข้า production analytics และทำให้ยอดดาวน์โหลดจริงปนกับ QA data

## Safety

ไม่ได้แก้ calculation engine, tier/rate, license logic, QR URL, QR tracking contract เดิม, APK signing, package name หรือ version APK
