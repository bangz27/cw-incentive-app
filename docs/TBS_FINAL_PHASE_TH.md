# TBS Incentive — Final Phase (ส่วนที่ทำได้โดยไม่ใช้ Firebase)

## สถานะ

ดำเนินการต่อจาก Repository เดิม `bangz27/cw-incentive-app` โดยเปลี่ยนเฉพาะ User-facing branding และเพิ่มระบบ Profile แบบ Local หลายรายการ ไม่ได้สร้างแอปหรือ Repository ใหม่

## Branding

เปลี่ยนชื่อที่ผู้ใช้เห็นเป็น **TBS Incentive** ใน Web/PWA, Capacitor configuration และ Android application label โดยคง Package Name เป็น `com.cw.incentive` และคง LocalStorage keys กับโครงสร้าง Incentive Record เดิม

## Multiple Local Profiles

เพิ่ม Local Profile Store ใน `profile-store.js` โดยใช้ `cw_profiles` และ `cw_active_profile_id` พร้อม migration แบบ backward-compatible จาก `cw_profile` เดิม ระบบรองรับการสร้าง, เลือก, แก้ไข, ลบ Profile ที่ไม่ได้ใช้งาน และตั้ง Active Profile ซึ่งคงอยู่หลังปิดและเปิดแอปใหม่

ข้อมูล Profile รองรับ `profileId`, `firebaseUid`, `email`, `displayName`, `photoURL`, `customPhoto`, `fullName`, `hub`, `position`, `employeeId`, `driverId`, `createdAt`, `updatedAt` และ `isActive`

การแก้ไข Active Profile จะไม่เปลี่ยนแปลง Incentive records เก่า เพราะแต่ละ Record เก็บข้อมูลคนขับ ณ เวลาที่บันทึกแยกอยู่แล้ว

## Calculator และ Offline

Calculator 2W และ 4W อ่านชื่อ, Hub และข้อมูล Active Profile จาก Profile Store แบบ Read-only โดยยังเรียก Calculation Engine เดิมทั้งหมด ไม่ได้แก้ Tier, Rate, Zone, Progressive Calculation, Same Address หรือ Net Incentive

Profile, Calculator, History และ Dashboard ยังคงทำงานจาก LocalStorage และไม่ต้องใช้อินเทอร์เน็ตหลังติดตั้ง

## Profile Photo

ลำดับรูปที่ใช้คือ `customPhoto` → `photoURL` → Default Avatar รูป Custom ถูก resize ไม่เกิน 512px และบีบอัดเก็บในเครื่อง ไม่อัปโหลดไป Server

## QR สนับสนุนค่ากาแฟ

เพิ่มรายการ **สนับสนุนค่ากาแฟ** ท้ายหน้า Profile และหน้าจออ่านอย่างเดียว พร้อมใช้ QR ต้นฉบับจากไฟล์ผู้ใช้เดิม โดย crop เฉพาะพื้นที่ QR และ quiet zone ด้วยพิกเซลต้นฉบับ ไม่สร้าง QR ใหม่ ไม่วางข้อความหรือโลโก้ทับ และแสดงที่ขนาด 200px บนมือถือ

## Firebase Authentication

รอบนี้ยังไม่เปิดใช้ Google Authentication จริง เนื่องจากไม่มี Firebase configuration และ `google-services.json` ระบบจึงเตรียม boundary ใน `firebase-auth.js` เท่านั้น และไม่เพิ่ม Firebase dependency หรือสร้าง Fake Login

การเปิดใช้จริงต้องมี:

1. Firebase Project ของเจ้าของแอป
2. Android App package `com.cw.incentive`
3. `google-services.json` จาก Firebase Console
4. เปิด Firebase Authentication → Google provider
5. เพิ่ม SHA-1 ของ signing certificate
6. เพิ่ม SHA-256 ของ signing certificate
7. ทดสอบ Google Sign-In, cancellation, failure, expired session และ offline behavior ด้วย Firebase Project จริง

## ไอคอน Android

ใช้ไฟล์ `5604.webp` ที่ผู้ใช้แนบเป็น source artwork โดยแปลงเป็น PNG เฉพาะทางเทคนิคสำหรับ Android density resources และใช้เป็น legacy launcher icon, round icon และ adaptive icon โดยไม่ออกแบบหรือวาดโลโก้ใหม่

## ขอบเขตที่ยังไม่เสร็จ

Google Login จริง, Firebase session, Login persistence และ Logout จริงยังรอ Firebase configuration จึงยังไม่รายงานว่า Google Login เสร็จสมบูรณ์
