# CW Incentive — Source Baseline

เอกสารนี้บันทึกการนำ Source Code เดิมจาก repository `bangz27/incentive-calculator` เข้า repository `bangz27/cw-incentive-app` เพื่อให้ TARGET เป็น source repository หลักของ CW Incentive

## ขอบเขตการนำเข้า

ไฟล์ด้านล่างถูกคัดลอกแบบ byte-for-byte จาก SOURCE โดยยังไม่ปรับ UI ไม่เปลี่ยน Calculation Logic ไม่เปลี่ยน Tier Configuration และไม่ลบข้อมูลหรือ Release APK เดิมของ TARGET

- SOURCE: `bangz27/incentive-calculator`
- SOURCE branch: `main`
- SOURCE commit: `9d00db0713339242051418d05e01f84f916651c2`
- TARGET baseline commit ก่อนนำเข้า: `21441861789efacb01f0b78bb28803e76c142097`
- วันที่จัดทำ baseline: 22 กันยายน 2026

## ไฟล์ที่นำเข้า

| ไฟล์ | SHA-256 ใน SOURCE | SHA-256 ใน TARGET | ผลตรวจสอบ |
|---|---|---|---|
| `index.html` | `8561b06fdc4b3e270d48290cce0f3541ab48180b4fba035ac4a8c47b624747f8` | `8561b06fdc4b3e270d48290cce0f3541ab48180b4fba035ac4a8c47b624747f8` | **ตรงกัน** |
| `style.css` | `3ba097dca5915c2d6e85da247064de1cac413a79a4c73adc8f684db74b7018d5` | `3ba097dca5915c2d6e85da247064de1cac413a79a4c73adc8f684db74b7018d5` | **ตรงกัน** |
| `app.js` | `a3215c7abf6464f9025416d66f4aa4d31b0e196b2d04441009b05aa4d6e91324` | `a3215c7abf6464f9025416d66f4aa4d31b0e196b2d04441009b05aa4d6e91324` | **ตรงกัน** |
| `calculator.js` | `5b24b342f93fcba726edaf3236a92b560879fac04abb320431eee68284ef699e` | `5b24b342f93fcba726edaf3236a92b560879fac04abb320431eee68284ef699e` | **ตรงกัน** |
| `config.js` | `299f440c726852295eb1e8c7aba6ea52ca16806db69fc49cdd940de32f1eab34` | `299f440c726852295eb1e8c7aba6ea52ca16806db69fc49cdd940de32f1eab34` | **ตรงกัน** |
| `dashboard.js` | `7b461afdc06f2701ae5fcf8b62c4c43755e1507a56a1ee61b44c26e68d8810b4` | `7b461afdc06f2701ae5fcf8b62c4c43755e1507a56a1ee61b44c26e68d8810b4` | **ตรงกัน** |
| `export.js` | `420adc45d3b430e093161b2a6fc7c738ee89f2a8c02e9ddfd9d3170a54be2104` | `420adc45d3b430e093161b2a6fc7c738ee89f2a8c02e9ddfd9d3170a54be2104` | **ตรงกัน** |
| `history.js` | `2592463de017f7b5cdfa0b096cabb1d40d9327671ecc16a2f63bb929f3edb145` | `2592463de017f7b5cdfa0b096cabb1d40d9327671ecc16a2f63bb929f3edb145` | **ตรงกัน** |
| `manifest.json` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | **ตรงกัน** |
| `service-worker.js` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | **ตรงกัน** |

## หน้าที่เบื้องต้น

- `index.html` — จุดเริ่มต้นของเว็บแอปและโครงสร้างหน้าจอ
- `style.css` — ธีม สี Layout Responsive และ Component styling
- `app.js` — Theme toggle และ Navigation ระหว่างหน้าจอ
- `calculator.js` — การคำนวณและแสดงผล 2W/4W แบบ Size S/L
- `config.js` — Zone 1–16 และ Tier/rate configuration
- `dashboard.js` — Summary และ Chart จาก LocalStorage
- `export.js` — Export PDF และ Excel
- `history.js` — บันทึก/อ่านประวัติด้วย LocalStorage และ Sync ไป Google Apps Script
- `manifest.json` — PWA manifest; baseline ปัจจุบันเป็นไฟล์ว่าง
- `service-worker.js` — Service Worker; baseline ปัจจุบันเป็นไฟล์ว่าง

## สิ่งที่ยังไม่ได้ทำ

การนำเข้าครั้งนี้เป็นเพียงการย้าย baseline เท่านั้น ยังไม่ได้เริ่ม UI Redesign และยังไม่ได้แปลงเว็บแอปเป็น Capacitor/Android project ไม่มีการสร้าง `package.json`, `capacitor.config.*`, `android/`, Gradle wrapper หรือ AAB build pipeline ในขั้นตอนนี้

## Release เดิมของ TARGET

Release `v1.0.0` และ APK เดิมของ TARGET ไม่ได้ถูกลบหรือแก้ไข การนำเข้า source เป็นการเพิ่มไฟล์เข้า branch `main` เท่านั้น
