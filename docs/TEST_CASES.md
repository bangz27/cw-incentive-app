# CW Incentive — Phase 1 Test Cases

สถานะ: **PASS**
คำสั่งที่รัน: `node --test test/calculation-engine.test.js`
ผลรวม: 8 tests passed, 0 failed

## Test Case Summary

| Test ID | Test case | Input | Expected result | Actual result | Pass/Fail |
|---|---|---|---|---|---|
| 2W-Z1-BND | Zone 1 boundaries | parcel = 4, 5, 14, 15, 49, 50, 64, 65; zone = 1 | Gross = 0, 8, 80, 89, 395, 406, 560, 572 | ตรงตามค่าคาดหมายทั้งหมด | PASS |
| 2W-Z1-70 | Zone 1 / 70 parcels | parcel = 70; zone = 1 | Gross = 632 | Gross = 632 | PASS |
| 2W-NET-70 | Zone 1 / 70 parcels / Same Address 10 | parcel = 70; zone = 1; sameAddress = 10 | Gross = 632; Deduction = 15; Net = 617 | Gross = 632; Deduction = 15; Net = 617 | PASS |
| 2W-ALL-Z | All Zone boundaries | zones = 1–16; finite max and max + 1 | ทุก Zone คำนวณได้และ invariant ผ่าน | ผ่านทุก Zone 1–16 | PASS |
| 4W-S | Size S only | sizeS = 70; sizeL = 0; zones = 1–16 | S = 70, L = 0 และ breakdown sum = Gross | ผ่านทุก Zone 1–16 | PASS |
| 4W-L | Size L only | sizeS = 0; sizeL = 70; zones = 1–16 | S = 0, L = 70 และ breakdown sum = Gross | ผ่านทุก Zone 1–16 | PASS |
| 4W-MIX | Mixed S + L | sizeS = 35; sizeL = 35; zones = 1–16 | parcel = 70; breakdown sum = Gross | ผ่านทุก Zone 1–16 | PASS |
| 4W-ORDER | Size S allocated first | sizeS = 5; sizeL = 1; zone = 1 | First Tier = 4 S; next Tier = 1 S + 1 L; Gross = 37 | First Tier = 4 S; next Tier = 1 S + 1 L; Gross = 37 | PASS |
| SAME-2W | Same Address 2W | vehicleType = 2W; count = 10 | Rate = 1.5; Deduction = 15 | Rate = 1.5; Deduction = 15 | PASS |
| SAME-4W | Same Address 4W | vehicleType = 4W; count = 10 | Rate = 2.5; Deduction = 25 | Rate = 2.5; Deduction = 25 | PASS |
| NET | Net formula | gross = 632; deduction = 15 | Net = 617 | Net = 617 | PASS |
| VALID-EMPTY | Empty values | parcel = empty | Throws validation error | Throws validation error | PASS |
| VALID-NEG | Negative value | parcel = -1 or sizeL = -1 | Throws validation error | Throws validation error | PASS |
| VALID-ZONE | Invalid Zone | zone = 17 | Throws validation error | Throws validation error | PASS |
| VALID-SAME | Same Address > parcel | parcel = 1; sameAddress = 2 | Throws validation error | Throws validation error | PASS |
| ZERO | Zero parcels | parcel = 0 or sizeS = 0 and sizeL = 0 | Gross, Deduction and Net = 0; unified result shape | ได้ค่า 0 ครบและ shape ตรงกัน | PASS |

## Automated Test Coverage

ไฟล์ `test/calculation-engine.test.js` มีการทดสอบ 8 กลุ่ม:

1. Zone 1 boundary values
2. 2W Zone 1 / 70 parcels / Same Address 10
3. Boundary coverage ของ Zone 1–16
4. 4W S only, L only และ mixed S+L ครบ Zone 1–16
5. การจัดสรร Size S ก่อน Size L
6. Same Address rate และ Net formula
7. Validation ของ empty, negative, invalid Zone และ Same Address ที่เกิน parcel
8. Zero-parcel unified result

## Invariants

ทุก successful calculation ผ่านเงื่อนไขต่อไปนี้:

```text
netIncentive = grossIncentive - sameAddressDeduction
sum(tierBreakdown.amount) = grossIncentive
```

สำหรับ 4W:

```text
parcel = sizeS + sizeL
```

สำหรับ 2W ค่า `sizeS` และ `sizeL` ใน unified result เป็น 0 และ `parcel` เป็นจำนวนส่งสำเร็จที่ใช้คำนวณจริง

## Automated Test Command

```bash
node --test test/calculation-engine.test.js
```

## Validation Decision

Phase 1 เลือกให้ `sameAddressCount > parcel` เป็น validation error แบบ explicit เพื่อไม่ลดจำนวน Tier และไม่เดาพฤติกรรมทางธุรกิจ silently หากมี business rule อื่นในอนาคต ต้องเพิ่มเป็น decision และ test ใหม่ก่อนเปลี่ยน implementation
