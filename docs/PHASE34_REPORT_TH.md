# รายงาน Phase 3–4 — CW Incentive

## สถานะ

Phase 3 และ Phase 4 ดำเนินการต่อบน repository เดิม `bangz27/cw-incentive-app` โดยไม่สร้าง application หรือ repository ใหม่ และไม่เริ่ม Phase 5

## Phase 3 — Android Build

โครงสร้าง Capacitor จาก Phase 2 ถูกใช้ต่อ โดยมีค่า `applicationId=com.cw.incentive`, `versionName=1.0.0`, `versionCode=1`, Capacitor `7.6.9`, compile/target SDK 35 และ Java 21

สร้างและตรวจสอบแล้ว:

- Debug APK
- Release APK แบบ unsigned
- Release AAB แบบ unsigned
- Web assets ภายใน APK/AAB ตรงกับ source หลัง `cap sync`
- Package, activity และ version metadata ถูกต้อง
- Source-of-truth guard ผ่าน

คำสั่ง build:

```bash
npm run android:debug
npm run android:release
npm run android:aab
```

Release APK/AAB ยังไม่ใช่ production release เพราะยังไม่ได้ใช้ production keystore. ไม่ได้แก้หรือลบ Release v1.0.0 ที่มีอยู่ใน GitHub

## Phase 4 — UI Redesign

ปรับหน้าจอจาก desktop-heavy baseline เป็น mobile-first Android-style UI ตาม Visily reference โดยใช้พื้นหลัง `#F7F7F7`, card สีขาว, SPX Orange `#F97316`, ขอบบาง, มุมโค้ง 16–20px และ fixed bottom navigation 4 รายการ:

1. หน้าหลัก
2. คำนวณ
3. รายการ
4. โปรไฟล์

เพิ่ม/ปรับ:

- Home summary และรายการล่าสุด
- Vehicle cards สำหรับ 2W และ 4W
- Calculator mode 2W/4W
- ช่อง Zone, Parcel หรือ Size S/L และ Same Address
- แสดงรายได้รวม, บ้านซ้ำ, เงินหัก และคงเหลือ
- Profile ที่เก็บใน LocalStorage และเติมชื่อ/Hub ให้รายการใหม่
- Compact record cards สำหรับมือถือ
- Dashboard cards และ charts เดิมยังมี hook อยู่
- safe-area padding และ fixed navigation
- ไม่มี Emoji เป็น functional icon
- ไม่ใช้ชื่อหรือข้อมูลตัวอย่างจาก mockup เป็นข้อมูลจริง

UI calculator เรียก `CWCalculationEngine.calculate2W()` และ `calculate4W()` โดยตรง ไม่มีการทำ Tier หรือ Rate ซ้ำใน UI

## Data compatibility

ไฟล์ต่อไปนี้ยังเป็น source of truth และตรวจ byte-identical กับ Phase 1 commit `12a80d9`:

- `calculation-engine.js`
- `two-w-config.js`
- `config.js`
- `record-model.js`
- `test/calculation-engine.test.js`
- `test/record-model.test.js`

ยังใช้ LocalStorage key `incentive_history` และ legacy normalization เดิม ไม่มีการ reset, delete หรือ rewrite raw legacy payload

Profile UI ใช้ key แยก `cw_profile` จึงไม่กระทบข้อมูล record เดิม

## Test result

```text
JavaScript syntax: PASS
Calculation/data tests: 10 passed, 0 failed
Platform configuration: PASS
Packaged asset validation: PASS
Android Gradle build: PASS
```

## Known limitations

ยังไม่มี Android device หรือ emulator เชื่อมต่อใน sandbox จึงยังไม่ยืนยัน runtime จริงในหัวข้อ install/open, Android Back Button, keyboard, force-stop/relaunch และ LocalStorage persistence ผ่าน `connectedDebugAndroidTest`

CDN dependencies เดิม เช่น Chart.js, SheetJS, html2pdf และ Google Fonts ยังอยู่ตาม baseline จึงยังไม่อ้างว่า UI ทั้งหมดทำงาน Offline โดยไม่มี cache/Internet

ยังไม่ทำ Google Play Store, Play Console, Store Listing, Closed Testing, Production Release หรือ Phase 5
