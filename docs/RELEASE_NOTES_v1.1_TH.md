# CW Incentive v1.1

## รายการเปลี่ยนแปลง

- อัปเดต Android `versionName` เป็น `1.1.0`
- อัปเดต Android `versionCode` เป็น `2`
- คง `applicationId` เดิมเป็น `com.cw.incentive`
- ใช้ Mobile-first UI ของ Phase 4
- รองรับหน้าหลัก คำนวณ รายการ และโปรไฟล์
- รองรับโหมดคำนวณ 2W/4W และ Same Address
- ปรับลิงก์แชร์ APK ให้ชี้ไปยัง GitHub release `v1.1`
- คง Calculation Engine, Tier, Rate และ LocalStorage schema เดิม

## การตรวจสอบ

- JavaScript syntax ผ่าน
- Automated calculation/data tests 10 รายการผ่าน
- Capacitor platform validation ผ่าน
- Debug APK build ผ่าน
- Release APK build ผ่าน
- Release AAB build ผ่าน

## หมายเหตุ

ไฟล์ Release APK/AAB ที่แนบใน release นี้เซ็นด้วย CW Incentive release keystore และตรวจสอบด้วย `apksigner verify` แล้ว จึงสามารถติดตั้ง APK ได้. สำหรับการเผยแพร่ผ่าน Google Play ควรใช้ production signing policy/keystore ของเจ้าของแอป
