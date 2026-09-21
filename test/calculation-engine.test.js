const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const twoWTiers = require('../two-w-config');
const calculationModule = require('../calculation-engine');

const fourWConfigSource = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
const fourWTiers = vm.runInNewContext(`${fourWConfigSource}\nZONES_CONFIG`, {});
const engine = calculationModule.createCalculationEngine({ twoWTiers, fourWTiers });

function sumBreakdown(result) {
    return result.tierBreakdown.reduce((sum, tier) => sum + tier.amount, 0);
}

function assertResultInvariant(result) {
    assert.equal(result.netIncentive, result.grossIncentive - result.sameAddressDeduction);
    assert.equal(sumBreakdown(result), result.grossIncentive);
    if (result.vehicleType === '4W') {
        assert.equal(result.parcel, result.sizeS + result.sizeL);
    } else {
        assert.equal(result.sizeS, 0);
        assert.equal(result.sizeL, 0);
    }
}

test('2W Zone 1 exact boundaries use inclusive progressive tiers', () => {
    const expected = new Map([
        [4, 0],
        [5, 8],
        [14, 80],
        [15, 89],
        [49, 395],
        [50, 406],
        [64, 560],
        [65, 572]
    ]);

    for (const [parcel, gross] of expected) {
        const result = engine.calculate2W(parcel, 1);
        assert.equal(result.grossIncentive, gross, `Zone 1 / ${parcel} parcels`);
        assertResultInvariant(result);
    }
});

test('2W Zone 1 / 70 parcels / Same Address 10 equals Gross 632 and Net 617', () => {
    const result = engine.calculate2W(70, 1, 10);
    assert.deepEqual(
        {
            vehicleType: result.vehicleType,
            zone: result.zone,
            parcel: result.parcel,
            grossIncentive: result.grossIncentive,
            sameAddressCount: result.sameAddressCount,
            sameAddressDeduction: result.sameAddressDeduction,
            netIncentive: result.netIncentive
        },
        {
            vehicleType: '2W',
            zone: 1,
            parcel: 70,
            grossIncentive: 632,
            sameAddressCount: 10,
            sameAddressDeduction: 15,
            netIncentive: 617
        }
    );
    assertResultInvariant(result);
});

test('2W all Zone 1–16 finite boundaries and the next tier value are calculable', () => {
    for (let zoneNumber = 1; zoneNumber <= 16; zoneNumber += 1) {
        const tiers = twoWTiers[`Zone ${zoneNumber}`];
        assert.ok(tiers, `missing Zone ${zoneNumber}`);
        const boundaryValues = new Set([0]);
        for (const tier of tiers) {
            if (Number.isFinite(tier.max)) {
                boundaryValues.add(tier.max);
                boundaryValues.add(tier.max + 1);
            }
        }
        for (const parcel of boundaryValues) {
            const result = engine.calculate2W(parcel, zoneNumber);
            assert.equal(result.zone, zoneNumber);
            assert.equal(result.parcel, parcel);
            assertResultInvariant(result);
        }
    }
});

test('4W supports Size S only, Size L only, and mixed parcels for every Zone', () => {
    for (let zoneNumber = 1; zoneNumber <= 16; zoneNumber += 1) {
        const sOnly = engine.calculate4W(70, 0, zoneNumber);
        const lOnly = engine.calculate4W(0, 70, zoneNumber);
        const mixed = engine.calculate4W(35, 35, zoneNumber);
        assert.equal(sOnly.sizeS, 70);
        assert.equal(sOnly.sizeL, 0);
        assert.equal(lOnly.sizeS, 0);
        assert.equal(lOnly.sizeL, 70);
        assert.equal(mixed.parcel, 70);
        assertResultInvariant(sOnly);
        assertResultInvariant(lOnly);
        assertResultInvariant(mixed);
    }
});

test('4W allocates Size S before Size L within a Tier', () => {
    const result = engine.calculate4W(5, 1, 1);
    assert.equal(result.grossIncentive, 37);
    assert.deepEqual(
        result.tierBreakdown.slice(0, 2).map(tier => ({ sizeS: tier.sizeS, sizeL: tier.sizeL })),
        [
            { sizeS: 4, sizeL: 0 },
            { sizeS: 1, sizeL: 1 }
        ]
    );
    assertResultInvariant(result);
});

test('Same Address rates and Net Incentive formula are exact', () => {
    assert.deepEqual(engine.calculateSameAddressDeduction('2W', 10), {
        vehicleType: '2W', sameAddressCount: 10, rate: 1.5, deduction: 15
    });
    assert.deepEqual(engine.calculateSameAddressDeduction('4W', 10), {
        vehicleType: '4W', sameAddressCount: 10, rate: 2.5, deduction: 25
    });
    assert.equal(engine.calculateNetIncentive(632, 15), 617);
    assert.equal(engine.calculateNetIncentive(100, 0), 100);
});

test('validation rejects empty, negative, invalid Zone, and excessive Same Address values', () => {
    assert.throws(() => engine.calculate2W('', 1), /parcel is required/);
    assert.throws(() => engine.calculate2W(-1, 1), /parcel must be a non-negative integer/);
    assert.throws(() => engine.calculate2W(1, 17), /zone must be an integer from 1 to 16/);
    assert.throws(() => engine.calculate2W(1, 1, 2), /sameAddressCount cannot be greater than parcel/);
    assert.throws(() => engine.calculate4W(1, -1, 1), /sizeL must be a non-negative integer/);
    assert.throws(() => engine.calculateSameAddressDeduction('3W', 1), /vehicleType must be 2W or 4W/);
});

test('zero parcels return a zero result while preserving a unified shape', () => {
    const result2W = engine.calculate2W(0, 1, 0);
    const result4W = engine.calculate4W(0, 0, 1, 0);
    for (const result of [result2W, result4W]) {
        assert.equal(result.grossIncentive, 0);
        assert.equal(result.sameAddressDeduction, 0);
        assert.equal(result.netIncentive, 0);
        assertResultInvariant(result);
    }
});
