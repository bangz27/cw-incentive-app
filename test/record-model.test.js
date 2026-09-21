const test = require('node:test');
const assert = require('node:assert/strict');
const recordModel = require('../record-model');

test('createRecord returns the unified record structure', () => {
    const record = recordModel.createRecord({
        id: 7,
        date: '2026-09-22',
        fullName: 'สมชาย ใจดี',
        hub: 'BKK-01',
        driverId: 'DR-7',
        result: {
            vehicleType: '2W',
            zone: 1,
            parcel: 70,
            sizeS: 0,
            sizeL: 0,
            grossIncentive: 632,
            sameAddressCount: 10,
            sameAddressRate: 1.5,
            sameAddressDeduction: 15,
            netIncentive: 617,
            tierBreakdown: [{ label: '65+', amount: 60 }]
        },
        createdAt: '2026-09-22T00:00:00.000Z'
    });

    assert.deepEqual(record, {
        id: 7,
        date: '2026-09-22',
        fullName: 'สมชาย ใจดี',
        hub: 'BKK-01',
        driverId: 'DR-7',
        vehicleType: '2W',
        zone: 1,
        parcel: 70,
        sizeS: 0,
        sizeL: 0,
        grossIncentive: 632,
        sameAddressCount: 10,
        sameAddressDeduction: 15,
        netIncentive: 617,
        tierBreakdown: [{ label: '65+', amount: 60 }],
        createdAt: '2026-09-22T00:00:00.000Z'
    });
});

test('legacy records normalize without mutating the raw payload', () => {
    const legacy = {
        id: 8,
        timestamp: '2026-09-22T01:00:00.000Z',
        date: '2026-09-22',
        zone: 'Zone 1',
        hub: 'BKK-01',
        rider: 'สมหญิง ใจดี',
        sizeS: 20,
        sizeL: 50,
        totalParcels: 70,
        grandTotal: 632,
        synced: false
    };
    const storage = {
        getItem(key) {
            assert.equal(key, 'incentive_history');
            return JSON.stringify([legacy]);
        }
    };

    const raw = recordModel.readRawRecords(storage);
    const normalized = recordModel.readRecords(storage);

    assert.deepEqual(raw[0], legacy);
    assert.equal(normalized[0].vehicleType, '4W');
    assert.equal(normalized[0].fullName, 'สมหญิง ใจดี');
    assert.equal(normalized[0].parcel, 70);
    assert.equal(normalized[0].grossIncentive, 632);
    assert.equal(normalized[0].sameAddressDeduction, 0);
    assert.equal(normalized[0].netIncentive, 632);
});
