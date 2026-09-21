# Profile Photo และ Google Login Preparation

## รูปโปรไฟล์

หน้าโปรไฟล์มี Avatar placeholder ที่กดเพื่อเลือกรูปจากเครื่องได้ รองรับ JPG, JPEG และ PNG พร้อมแสดง Preview ทันที ผู้ใช้สามารถเปลี่ยนรูปหรือลบรูปกลับเป็น Default Avatar ได้

ก่อนจัดเก็บ ระบบตรวจชนิดไฟล์และขนาดไฟล์ไม่เกิน 12 MB จากนั้นใช้ Canvas resize ด้านที่ยาวที่สุดไม่เกิน 512px และบีบอัดเป็น JPEG quality 0.78 การจัดเก็บใช้ LocalStorage key `cw_profile` ใน field `photo` จึงไม่ต้องใช้ Cloud และรูปจะคงอยู่หลังปิดและเปิดแอปใหม่

รูปจะแสดงใน Profile, Home และ Calculator profile chip โดยใช้ `object-fit: cover`, ขนาดคงที่ และ overflow hidden เพื่อป้องกันรูปทำให้ Layout ล้นจอ

การลบรูปจะลบเฉพาะ field `photo` ของ profile ปัจจุบัน ไม่กระทบ `incentive_history` หรือข้อมูลการคำนวณเดิม

## Google Login Preparation

เพิ่มปุ่ม `ดำเนินการด้วย Google` เป็นโครงสร้าง UI เตรียมไว้เท่านั้น เมื่อกดปุ่มจะแจ้งว่ายังไม่เปิดใช้งาน Authentication

รอบนี้ไม่มี Firebase dependency, ไม่มี OAuth configuration, ไม่มี `google-services.json` และไม่มีการส่งข้อมูลไปยัง Google การออกแบบยังคงใช้ `cw_profile` และ LocalStorage เดิม ดังนั้นสามารถเพิ่ม authentication adapter ภายหลังโดยไม่ต้องรื้อ Profile หรือ Local Data

## การตรวจสอบ

Syntax, calculation/data tests 10 รายการ, Capacitor platform validation และ signed Android Release APK/AAB build ผ่านแล้ว ส่วน Android runtime จริงยังต้องทดสอบบนอุปกรณ์หรือ emulator ที่เชื่อมต่อ
