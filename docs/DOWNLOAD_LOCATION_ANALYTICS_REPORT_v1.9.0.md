# TBS Incentive v1.9.0 — Browser Download Location Analytics Report

วันที่: 2 ตุลาคม 2026

## สถานะ

**Implemented / Deployed — Live download write test ยังไม่ถูกยิงเพื่อไม่เพิ่มข้อมูลทดสอบใน production analytics**

## Objective

เพิ่ม Download Page ที่:

- ขอ Browser Location permission เฉพาะเมื่อผู้ใช้กดปุ่มดาวน์โหลด APK
- รองรับ `granted`, `denied`, `timeout`, `unavailable`
- แปลงพิกัดแบบ coarse ด้วย Nominatim/OpenStreetMap ฝั่ง server
- บันทึก province / district / subdistrict เท่าที่แหล่งข้อมูลมี
- ป้องกัน duplicate event ด้วย `download_id`
- ไม่บันทึก latitude/longitude ใหม่ลงใน event สำหรับ Browser GPS
- คง QR URL และ APK URL เดิม
- ไม่กระทบ Calculation Engine, License Logic, LocalStorage, APK signing หรือ QR function อื่น

## Baseline

- Repository: `bangz27/cw-incentive-app`
- Branch: `feature/v1.9`
- Baseline commit ก่อนงาน: `39b6a64fba425bc545135a111adc26c1183aef89`
- App version: `1.9.0`
- Existing tracking function: `tbs-download-v15` version 4
- Existing dashboard function: `tbs-download-dashboard` version 3

## Root cause / gap ที่แก้

ก่อนแก้ `tbs-download-v15` ทำ `GET → insert event → 302 ไป APK` ทันที จึงไม่มีจังหวะให้ Browser ขอ permission จาก user gesture และไม่มี Browser-derived administrative area

นอกจากนี้ function เดิมไม่ได้แยก `HEAD`; การ probe แบบ HEAD จึงสามารถสร้าง event ได้ จึงแก้ให้ `HEAD` ไม่เขียนข้อมูล

## Changes

### Source

- เพิ่ม `supabase/functions/tbs-download-v15/index.ts`
  - GET แสดง lightweight Download Page
  - ปุ่ม Download เรียก `navigator.geolocation.getCurrentPosition()` เท่านั้นเมื่อผู้ใช้กด
  - POST บันทึก event ครั้งเดียวและ redirect ไป APK URL เดิม
  - HEAD/OPTIONS ไม่สร้าง event
  - ใช้ `download_id` เป็น idempotency key
  - Nominatim request ใช้ coarse coordinate 3 decimals, `User-Agent`, `Referer` และ cache
  - ไม่ใส่ Browser `latitude`/`longitude` ลงใน `qr_scan_events`

- ปรับ `supabase/functions/tbs-download-dashboard/index.ts`
  - คืนค่า `province`, `district`, `subdistrict`, `location_permission`, `download_source`, `apk_version`
  - รองรับ legacy rows ที่ยังมี `region/city` และ approximate IP coordinates

- ปรับ License Center Analytics normalization, CSV export, search และ location display

### Database

Migration: `supabase/migrations/20261002153000_browser_download_location.sql`

เพิ่มแบบ additive เท่านั้น:

- `download_id`
- `apk_version`
- `download_source`
- `location_permission`
- `province`
- `district`
- `subdistrict`
- unique partial index สำหรับ `download_id`
- `qr_reverse_geocode_cache` แบบ RLS-protected และเข้าถึงจาก `service_role` เท่านั้น

ไม่ลบหรือ rewrite event เดิม

## Nominatim policy

ใช้ public Nominatim ตามข้อกำหนดที่เกี่ยวข้อง:

- จำกัด request ต่อ warm instance อย่างน้อย 1 วินาทีระหว่าง request
- มี coarse cache key เพื่อหลีกเลี่ยงการเรียกซ้ำ
- ส่ง `User-Agent` ที่ระบุแอปและ `Referer`
- มี attribution ใน Download Page: OpenStreetMap contributors
- หาก geocoding ล้มเหลว ยังคงดาวน์โหลด APK ได้ และ event จะมี permission status แต่พื้นที่อาจว่าง

References:

- https://operations.osmfoundation.org/policies/nominatim/
- https://nominatim.org/release-docs/latest/api/Reverse/
- https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API

## Deployment evidence

### Supabase migration

- Apply migration: **success**
- `qr_scan_events` มี columns ใหม่ครบ
- `qr_reverse_geocode_cache` ถูกสร้างและเปิด RLS

### Edge Functions

| Function | Version | SHA-256 |
|---|---:|---|
| `tbs-download-v15` | 5 | `038e49b33d6eb436cb32f677d4fbdb41f2898870aa9c7e8e2366da4f1d5389cf` |
| `tbs-download-dashboard` | 4 | `6fc57d2fa80ddfa42584242fcdd3e8c91ec3206746574113789b38d3ec8ce544` |

### HTTP verification

- Tracking GET: HTTP 200, Download Page contract PASS
- Tracking HEAD: HTTP 204, no-write contract PASS
- Tracking invalid POST: HTTP 400, validation PASS
- Dashboard unauthenticated: HTTP 401, Owner JWT gate PASS
- Production function list: both functions ACTIVE

## Automated QA

- Dedicated download-flow tests: **5 PASS / 0 FAIL**
- Existing full suite: **71 PASS / 0 FAIL**
- JavaScript syntax: **PASS**
- Update contract: **PASS**
- Platform validation: **PASS**
- `git diff --check`: **PASS**
- Protected calculation/license/storage/signing files: **unchanged**

## Runtime limitation

ยังไม่ได้ส่ง valid POST ใน production เพื่อสร้าง event ทดสอบ เพราะจะเพิ่มข้อมูลทดสอบเข้า Download Analytics จริงโดยตั้งใจ

การยืนยัน end-to-end ขั้นสุดท้ายให้ทำจากมือถือ:

1. เปิด QR/Tracking URL เดิม
2. กด **ดาวน์โหลด APK**
3. เลือก Allow หรือ Deny Location
4. ตรวจว่า APK ดาวน์โหลดต่อได้
5. เปิด Owner Console → Download Analytics แล้วกด Refresh
6. ตรวจ permission status และพื้นที่ที่ Nominatim คืนค่าให้

## Safety notes

- APK URL เดิมยังเป็น `v1.9.0/TBS-Incentive-v1.9.0-release.apk`
- ไม่แก้ Calculation Engine / tier / rate
- ไม่แก้ License/Auth/LocalStorage
- ไม่แก้ package name, version code หรือ signing
- ไม่แก้ QR function อื่น
- Direct GitHub APK URL ยังไม่ผ่าน Download Page จึงไม่บันทึก Browser permission; flow นี้ใช้กับ QR/Tracking URL เดิม

## Known inspection event

จากการตรวจครั้งก่อน endpoint รุ่นเก่ามี event สังเคราะห์ 1 รายการด้วย campaign=`inspection` เวลา 2026-10-02 07:22:01 UTC เนื่องจาก function เดิมเขียน event ตอนรับ HEAD request

ไม่มีการลบข้อมูลดังกล่าวโดยอัตโนมัติ เพื่อหลีกเลี่ยง destructive action โดยไม่ได้รับคำสั่ง
