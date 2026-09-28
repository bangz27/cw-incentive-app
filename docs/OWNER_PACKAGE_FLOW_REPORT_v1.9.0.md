# TBS Incentive V1.9.0 — Owner Package Selection Flow Report

วันที่ตรวจสอบ: 28 กันยายน 2026
Branch: `feature/v1.9`
Package: `com.cw.incentive`
Version: `1.9.0`
Version Code: `10`

## Implementation Status

ปรับเฉพาะ New User License Flow ตาม Owner Requirement:

- Login สำเร็จและไม่มี Active License แสดงหน้า Package Selection
- Package Selection ค้างอยู่จนกว่าผู้ใช้จะเลือกเอง
- ลำดับการ์ด: LIFETIME → STARTER → ทดลองใช้ 14 วัน
- LIFETIME: 79 บาท พร้อมปุ่ม `เลือกแพ็กเกจ`
- STARTER: 49 บาท พร้อมปุ่ม `เลือกแพ็กเกจ`
- Trial: 14 วัน พร้อม Confirmation Dialog และไม่ Auto-start
- Trial เรียก Backend RPC `start_my_trial()` หลังผู้ใช้กดยืนยันเท่านั้น
- Trial Expired กลับมาที่ Package Selection และแสดง `เลือกแพ็กเกจเพื่อใช้งานต่อ`
- Trial ใหม่เริ่มซ้ำไม่ได้
- Lifetime Active ไม่แสดงทางเลือกเริ่ม Trial
- Android Back ไม่สามารถ bypass Package Selection ได้เมื่อยังไม่มีสิทธิ์

## Trial Security

- Account-bound ด้วย `auth.uid()`: PASS
- Backend timestamp ด้วย `now()`: PASS
- Trial duration 14 วัน: PASS
- One-time activation และ row locking: PASS
- Trial reuse prevention: PASS
- LocalStorage ไม่ใช่ Source of Truth: PASS
- Clear LocalStorage ไม่ reset Trial: PASS ตาม architecture
- Uninstall/Reinstall ไม่ reset Trial: PASS ตาม server persistence architecture
- Unauthenticated `start_my_trial()`: FAIL ตามที่ควรเป็น

## QA Matrix

| Scenario | Result |
|---|---|
| New User → Login → No License → Package Selection | PASS — automated contract |
| Package Selection stays until user action | PASS — license gate + no auto navigation |
| No Auto Start Trial | PASS |
| Lifetime 79 บาท / purchase flow เดิม | PASS |
| Starter 49 บาท / purchase flow เดิม | PASS |
| Trial 14 วัน / confirmation ก่อนเริ่ม | PASS |
| Lifetime Active → App Access | PASS — existing license logic preserved |
| Starter Active → App Access | PASS — existing license logic preserved |
| Lifetime Active → Trial unavailable | PASS |
| Trial Active → countdown / App Access | PASS |
| Trial Already Used → Trial ใหม่ไม่ได้ | PASS |
| Trial Expired → Package Selection | PASS |
| Trial Expired → purchase options | PASS |
| Android Back cannot bypass gate | PASS — native back guard added; runtime device test pending |
| Clear LocalStorage persistence | PASS — server-side design and contract |
| Uninstall/Reinstall persistence | PASS — server-side design; runtime reinstall test pending |
| Unauthenticated trial call | PASS — backend rejects |

## Regression Protection

- Calculation Engine: PASS — protected baseline unchanged
- Incentive Tier / Zone Rate: PASS — protected baseline unchanged
- Same Address / RTS / History / Record Model: PASS
- Modern Selector: PASS
- Update Checker: PASS
- Existing License Owner Logic: PASS
- Existing Supabase Account and entitlement data: preserved
- Package name: unchanged
- Version: unchanged
- Production signing configuration: unchanged

## Automated QA

- Automated tests: **60 PASS / 0 FAIL**
- JavaScript syntax: **PASS — 49 files**
- Update contract: **PASS**
- Platform validation: **PASS**
- npm audit: **0 vulnerabilities**
- Git diff check: **PASS**

## Production Build

- Signed APK: **PASS**
- Signed AAB: **PASS**
- Package: `com.cw.incentive`
- Version: `1.9.0`
- Version Code: `10`
- Certificate SHA-256: `D8:B2:D5:44:B0:F2:3F:DE:EA:E9:79:F6:68:66:0D:21:93:52:81:E4:B0:E9:92:E8:28:65:6A:DE:C1:14:DE:CD`
- APK signature v1/v2/v3: **PASS**
- APK SHA-256: `905ee503688cc8ccdd0c32446886d0c882ff57fbbf82dbbbe2f346fc579292c9`
- AAB SHA-256: `c359a586a6df4d13778c8ee6837cd9b42b739f9c72acacd43bcea0749c6ba677`

## Runtime Limitation

ยังไม่ได้ติดตั้งและทดสอบบน Android device/emulator ในรอบนี้ เนื่องจาก environment ไม่มี device ที่เชื่อมต่อ และไม่เริ่ม emulator ตามขอบเขตการทำงานที่กำหนดไว้ก่อนหน้า

จึงยังไม่อ้างว่าได้ยืนยัน runtime จริงในรายการต่อไปนี้:

- Upgrade install ทับ V1.8.x
- Clear LocalStorage ผ่าน Android WebView จริง
- Uninstall/Reinstall จริง
- Physical Android Back event

## Release Status

- GitHub Release: **NO**
- Google Play: **NO**
- Public Deployment: **NO**
- Push: **NO**
- Commit หลัง Owner Requirement fix: **NOT CREATED** จนกว่าจะมี runtime device/emulator verification ตามข้อกำหนด

## Final Status

**IMPLEMENTATION READY — STATIC QA PASS — RUNTIME DEVICE QA PENDING**
