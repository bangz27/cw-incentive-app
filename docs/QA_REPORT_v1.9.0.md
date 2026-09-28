# TBS Incentive V1.9.0 — QA Report

วันที่ตรวจสอบ: 28 กันยายน 2026  
Repository: `https://github.com/bangz27/cw-incentive-app`

## สถานะ Source

| รายการ | ผลตรวจสอบ |
|---|---|
| Branch | `feature/v1.9` |
| Baseline | `51d81b83bb40114f7969414b483bbde549c29b47` |
| Final local commit | `55260d01b74cebad731208bc2751fc0c1171d8fa` |
| Baseline ancestry | PASS — branch เริ่มจาก V1.8.1 ที่กำหนด |
| Working tree หลัง commit | CLEAN |
| Force push / history rewrite | ไม่ได้ทำ |

## Version / Android Identity

| รายการ | ค่า / ผลตรวจสอบ |
|---|---|
| Version name | `1.9.0` |
| Version code | `10` |
| Package | `com.cw.incentive` |
| App ID | `com.cw.incentive` |
| App name | `TBS Incentive` |
| Debug/Release APK metadata | PASS — package และ version ตรงกัน |

## Tests

- Automated tests: **43 PASS / 0 FAIL**
- JavaScript syntax: **PASS — 45 JavaScript files**
- Update contract: **PASS**
- Platform validation: **PASS**
- Locked calculation/tier contract files: **PASS — byte-identical ตาม baseline validation**
- `npm audit --omit=dev --audit-level=high`: **0 vulnerabilities**

ครอบคลุม Update Checker, numeric version comparison (`1.10.0 > 1.9.0`), equal/lower/higher version, API error, offline, invalid release data, cooldown/manual check, changelog และ release URL รวมถึงชุด regression เดิมของ calculation, license, owner console, purchase UI, history และ dashboard/UI contracts

## V1.9 Update System

- ดึง latest public GitHub Release จาก GitHub API แบบ dynamic
- ไม่ฝัง APK URL รุ่นใดรุ่นหนึ่งใน Update Checker หรือ Share App
- เปรียบเทียบ version แบบ numeric ไม่ใช่ string comparison
- ตรวจอัตโนมัติเมื่อเปิดแอปแบบไม่รบกวนผู้ใช้ พร้อม cooldown 24 ชั่วโมง
- ตรวจทันทีจาก Settings ได้เสมอ
- แสดง Settings: เวอร์ชันปัจจุบัน, เวอร์ชันล่าสุดที่พบ และสถานะ
- แสดง Update Dialog ภาษาไทยพร้อม `ดูรายละเอียด`, `อัปเดตเลย`, `ไว้ภายหลัง`
- แสดง Release Notes จาก `body` ของ GitHub Release จริงผ่าน `textContent`
- เปิด APK asset แบบปกติผ่าน browser flow และมี fallback ไปยัง URL ภายนอก
- Offline/API/invalid release ไม่ทำให้ Login, Calculator, Dashboard, History หรือ License flow พัง
- ใช้ `tbs_update_cache` และคง legacy key `lastUpdateCheck`; ปุ่มเคลียร์แคชล้างเฉพาะ update cache เพิ่มเติม
- ไม่เพิ่ม App PIN Lock, Biometric Lock หรือ secret ใน client

ขณะตรวจสอบ GitHub Releases ล่าสุดที่ public อยู่คือ `v1.5`; เนื่องจาก current version เป็น `1.9.0` ระบบจึงไม่แสดง update ซึ่งตรงกับเงื่อนไข current version สูงกว่า latest

## Android Build

| Artifact | ผล | SHA-256 |
|---|---|---|
| Debug APK | **BUILD PASS** — ใช้สำหรับติดตั้งทดสอบเท่านั้น | `be8f79e08f43d10d1592c9eb384f962f965d34dd2c9c83939d9a3c07f89cbb14` |
| Unsigned Release APK | **COMPILE PASS / NOT RELEASE-READY** | `cef8b03d4b341c4fe283a8618ca5de09d5a80fd37407fbc7e206752baad6d3b6` |

APK metadata ที่ตรวจด้วย `aapt`:

```text
package: com.cw.incentive
versionCode: 10
versionName: 1.9.0
compileSdkVersion: 35
```

## Signing Gate

**ไม่ผ่านและต้องหยุดก่อน Production Release**

- ไม่พบ keystore เดิมใน sandbox
- `CW_KEYSTORE_PATH`, `CW_KEYSTORE_PASSWORD`, `CW_KEY_ALIAS`, `CW_KEY_PASSWORD` ยัง unset
- `assembleRelease -PcwRequireSigning` หยุดตาม signing guard ที่ออกแบบไว้
- Release APK จึงเป็น unsigned และ `apksigner` ตรวจไม่ผ่าน
- Debug APK ใช้ debug certificate digest: `e2279d17fc88c38ddcd472523ace6d64fe665760af594a3ac837fc91b6360db5`
- ค่า production certificate ที่ต้องคงเดิมคือ: `e7ca66c9484db79772c1ea1e69858ac0fde3f31f94dcea844b78d3938f0da580`
- ห้ามใช้ debug certificate แทน และห้ามสร้าง certificate ใหม่

## GitHub Release

**NOT CREATED**

ยังไม่สร้าง tag `v1.9.0`, ยังไม่อัปโหลด APK และยังไม่ประกาศ Final เนื่องจาก signing gate ไม่ผ่านตามกฎใน development prompt

## Final Decision

> **V1.9.0 ยังไม่ใช่ FINAL Release**

Source implementation และ automated QA ผ่านแล้ว แต่ต้องมี keystore/signing identity เดิมที่ตรวจสอบกับ certificate SHA-256 ตามที่กำหนดก่อนจึงจะเซ็น APK, ทดสอบ upgrade install และสร้าง GitHub Release ได้

## Runtime QA ที่ยังต้องทำบนอุปกรณ์จริง

- Install Debug APK บนอุปกรณ์ทดสอบ
- ตรวจ Settings → ตรวจสอบการอัปเดตทั้ง online/offline
- ตรวจ Update Dialog, Changelog, รายละเอียด และ download flow
- ทดสอบ external browser fallback
- ทดสอบ upgrade install โดยใช้ APK ที่เซ็นด้วย identity เดิม โดยไม่ลบข้อมูล
- ตรวจ Login, License, Calculator 2W/4W, History, Dashboard, Profile, Settings และ back/edge-swipe บนอุปกรณ์จริง
