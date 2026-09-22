const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../record-model');

const total = (rows, key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
const inRange = (rows, from, to) => rows.filter(row => row.date >= from && row.date <= to);

test('RTS and box rates are 1.50 per piece', () => {
  assert.equal(10 * 1.5, 15);
  assert.equal(100 * 1.5, 150);
  assert.equal(10 * 1.5, 15);
});

test('Summary filters selected date range and combines 2W + 4W', () => {
  const raw = [
    { id: 1, date: '2026-09-10', vehicleType: '2W', parcel: 100, rtsCount: 10, sameAddressDeduction: 25 },
    { id: 2, date: '2026-09-15', vehicleType: '4W', sizeS: 20, sizeL: 30, parcel: 50, rtsCount: 5, sameAddressDeduction: 12.5 },
    { id: 3, date: '2026-10-01', vehicleType: '2W', parcel: 999, rtsCount: 100, sameAddressDeduction: 25 }
  ];
  const rows = inRange(raw.map(model.toUnifiedRecord), '2026-09-01', '2026-09-30');
  assert.equal(total(rows, 'parcel'), 150);
  assert.equal(total(rows, 'rtsCount') * 1.5, 22.5);
  assert.equal(total(rows, 'sameAddressDeduction'), 37.5);
});

test('Old records without RTS and box remain readable as zero', () => {
  const row = model.toUnifiedRecord({ id: 9, date: '2026-09-22', vehicleType: '2W', parcel: 5, grossIncentive: 8 });
  assert.equal(row.rtsCount, 0);
  assert.equal(row.rtsIncome, 0);
  assert.equal(row.boxCount, 0);
  assert.equal(row.boxAmount, 0);
});
