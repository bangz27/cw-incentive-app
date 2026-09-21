# CW Incentive — Calculation Rules

สถานะ: Phase 1 Calculation Engine Lock
Repository: `bangz27/cw-incentive-app`
หลักการ: เอกสารนี้บันทึกกติกา calculation ที่ใช้เป็น contract ระหว่าง engine, UI, storage และ Android layer

## กติกาทั่วไป

การคำนวณเป็น Progressive Tier โดยขอบเขตของ Tier เป็นแบบ inclusive ค่าจำนวนพัสดุจะไม่ถูกลดลงจาก Same Address ก่อนนำไปคำนวณ Tier

ค่า `grossIncentive` คือรายได้รวมจาก Tier ค่า `sameAddressDeduction` คือเงินหักบ้านซ้ำ และ `netIncentive` คือคงเหลือหลังหักเงิน

```text
grossIncentive = ผลรวมจำนวนที่จัดสรรในแต่ละ Tier × rate
sameAddressDeduction = sameAddressCount × sameAddressRate
netIncentive = grossIncentive - sameAddressDeduction
```

## 2W Progressive Tier

2W ใช้จำนวน `parcel` หรือ `ส่งสำเร็จ` รวมหนึ่งค่า แล้วคำนวณตาม Zone 1–16 ดังตารางต่อไปนี้

| Zone | ช่วงจำนวน | Rate ต่อชิ้น |
|---|---:|---:|
| 1 | 0–4 | 0 |
| 1 | 5–14 | 8 |
| 1 | 15–49 | 9 |
| 1 | 50–64 | 11 |
| 1 | 65+ | 12 |
| 2 | 0–9 | 0 |
| 2 | 10–59 | 8 |
| 2 | 60–89 | 9 |
| 2 | 90+ | 11 |
| 3 | 0–14 | 0 |
| 3 | 15–54 | 7 |
| 3 | 55–94 | 8 |
| 3 | 95+ | 10 |
| 4 | 0–19 | 0 |
| 4 | 20–39 | 6 |
| 4 | 40–79 | 7 |
| 4 | 80–99 | 8 |
| 4 | 100+ | 9 |
| 5 | 0–29 | 0 |
| 5 | 30–49 | 6 |
| 5 | 50–89 | 7 |
| 5 | 90–109 | 8 |
| 5 | 110+ | 9 |
| 6 | 0–29 | 0 |
| 6 | 30–59 | 6 |
| 6 | 60–99 | 7 |
| 6 | 100+ | 8 |
| 7 | 0–49 | 0 |
| 7 | 50–69 | 6 |
| 7 | 70–129 | 7 |
| 7 | 130+ | 8 |
| 8 | 0–59 | 0 |
| 8 | 60–79 | 6 |
| 8 | 80–139 | 7 |
| 8 | 140+ | 8 |
| 9 | 0–69 | 0 |
| 9 | 70–89 | 6 |
| 9 | 90–179 | 7 |
| 9 | 180+ | 8 |
| 10 | 0–69 | 0 |
| 10 | 70–89 | 5 |
| 10 | 90–159 | 6 |
| 10 | 160+ | 7 |
| 11 | 0–69 | 0 |
| 11 | 70–149 | 5 |
| 11 | 150–209 | 6 |
| 11 | 210+ | 7 |
| 12 | 0–69 | 0 |
| 12 | 70–119 | 4 |
| 12 | 120–159 | 5 |
| 12 | 160+ | 6 |
| 13 | 0–69 | 0 |
| 13 | 70–169 | 4 |
| 13 | 170–209 | 5 |
| 13 | 210+ | 6 |
| 14 | 0–69 | 0 |
| 14 | 70–109 | 3 |
| 14 | 110–179 | 4 |
| 14 | 180+ | 5 |
| 15 | 0–69 | 0 |
| 15 | 70–149 | 3 |
| 15 | 150–189 | 4 |
| 15 | 190+ | 5 |
| 16 | 0–69 | 0 |
| 16 | 70–189 | 3 |
| 16 | 190–239 | 4 |
| 16 | 240+ | 5 |

การคำนวณเป็น progressive หมายถึงจำนวนพัสดุจะถูกกระจายเข้าแต่ละ Tier ตาม capacity ของ Tier นั้น ไม่ใช่การนำจำนวนทั้งหมดไปคูณ Rate ของ Tier สุดท้าย

## 4W Size S/L

4W ใช้ configuration เดิมใน `config.js` โดย Phase 1 ไม่เปลี่ยนแถว Tier หรือค่า `rateS`/`rateL` ใด ๆ

กติกาการจัดสรรที่ถูก lock คือ:

1. รับ `sizeS` และ `sizeL` เป็นจำนวนเต็มไม่ติดลบ
2. รวมจำนวนเป็น `parcel = sizeS + sizeL`
3. เดิน Tier จากต้นไปท้ายตาม Zone ที่เลือก
4. จัดสรร Size S ก่อนเสมอ
5. ให้ Size L เติม capacity ที่เหลือใน Tier เดียวกัน
6. คำนวณเงินของแต่ละ Tier จาก `allocatedS × rateS + allocatedL × rateL`
7. หยุดเมื่อจัดสรร S และ L ครบ

การจัดสรรนี้รักษาพฤติกรรมเดิมใน SOURCE และใช้ `config.js` เดิมเป็น source of truth สำหรับ 4W

## Same Address

Same Address ไม่ได้ลดจำนวน `parcel` ที่ใช้คำนวณ Tier แต่เป็นเงินหักหลังได้ Gross แล้ว

| ประเภทรถ | Rate |
|---|---:|
| 2W | ฿1.50 ต่อชิ้น |
| 4W | ฿2.50 ต่อชิ้น |

```text
2W: sameAddressDeduction = sameAddressCount × 1.50
4W: sameAddressDeduction = sameAddressCount × 2.50
```

ใน engine Phase 1 ถ้า `sameAddressCount` มากกว่า `parcel` จะถือเป็น validation error แบบ `RangeError` เพื่อไม่เดาพฤติกรรมทางธุรกิจแทนผู้ใช้ กฎนี้เป็น open decision ที่สามารถเปลี่ยนได้ในอนาคตเมื่อมี business approval แต่จะไม่ถูกเปลี่ยนเงียบ ๆ

## Net Incentive

```text
grossIncentive - sameAddressDeduction = netIncentive
```

ตัวอย่างที่ต้องผ่าน:

```json
{
  "vehicleType": "2W",
  "zone": 1,
  "parcel": 70,
  "grossIncentive": 632,
  "sameAddressCount": 10,
  "sameAddressDeduction": 15,
  "netIncentive": 617
}
```

## Unified Result Model

Calculation engine คืนผลลัพธ์โครงสร้างเดียวกันสำหรับ 2W และ 4W:

| Field | ความหมาย |
|---|---|
| `vehicleType` | `2W` หรือ `4W` |
| `zone` | Zone number 1–16 |
| `parcel` | จำนวนส่งสำเร็จรวม |
| `sizeS` | จำนวน Size S; 0 สำหรับ 2W |
| `sizeL` | จำนวน Size L; 0 สำหรับ 2W |
| `grossIncentive` | รายได้รวมจาก Tier |
| `sameAddressCount` | จำนวนบ้านซ้ำ |
| `sameAddressRate` | Rate ที่ใช้หัก |
| `sameAddressDeduction` | เงินหักบ้านซ้ำ |
| `netIncentive` | คงเหลือ |
| `tierBreakdown` | รายละเอียดการจัดสรรและเงินแต่ละ Tier |

Storage record ในขั้นถัดไปต้องเพิ่มข้อมูล profile snapshot และ `createdAt` โดยต้องรักษา record เดิมที่อยู่ใน `localStorage`

## Reusable Functions

`calculation-engine.js` แยก business logic ออกจาก DOM และเปิดฟังก์ชันต่อไปนี้:

```text
calculate2W(parcel, zone, sameAddressCount)
calculate4W(sizeS, sizeL, zone, sameAddressCount)
calculateSameAddressDeduction(vehicleType, sameAddressCount)
calculateNetIncentive(grossIncentive, sameAddressDeduction)
```

`calculator.js` ทำหน้าที่เป็น UI adapter และเรียก `calculate4W` โดยไม่ทำ algorithm ซ้ำ

## Validation Contract

- `parcel`, `sizeS`, `sizeL` ต้องเป็นจำนวนเต็มไม่ติดลบ
- `zone` ต้องอยู่ในช่วง 1–16 และรับได้ทั้ง `1` กับ `Zone 1`
- `vehicleType` ต้องเป็น `2W` หรือ `4W`
- `sameAddressCount` ต้องเป็นจำนวนเต็มไม่ติดลบ
- `sameAddressCount` มากกว่า `parcel` เป็น validation error
- ค่าว่างและค่าที่ไม่ใช่ตัวเลขเป็น validation error
- จำนวน 0 ให้ผลลัพธ์เป็นศูนย์และมี unified result shape

## ไฟล์ที่เกี่ยวข้อง

- `two-w-config.js` — 2W Zone 1–16 tier table
- `config.js` — 4W Size S/L configuration เดิม ไม่ถูกแก้
- `calculation-engine.js` — pure reusable calculation functions
- `calculator.js` — DOM/UI adapter เดิมที่เรียก engine
- `test/calculation-engine.test.js` — automated calculation tests
