/**
 * CW Incentive — Reusable Calculation Engine
 *
 * The engine contains business rules only. It does not read or update the DOM.
 * It can run in the browser and in Node-based automated tests.
 */
(function (root, factory) {
    const browserDefaults = {
        twoWTiers: root.CW_TWO_W_TIERS || null,
        // config.js declares ZONES_CONFIG as a top-level const. A later classic
        // script can access that lexical binding even though it is not on window.
        fourWTiers: typeof ZONES_CONFIG !== 'undefined' ? ZONES_CONFIG : (root.ZONES_CONFIG || null)
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = factory(browserDefaults);
    } else {
        root.CWCalculationEngine = factory(browserDefaults);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaults) {
    const SAME_ADDRESS_RATES = Object.freeze({
        '2W': 1.5,
        '4W': 2.5
    });

    function createError(message, ErrorType = Error) {
        return new ErrorType(message);
    }

    function normalizeNonNegativeInteger(value, fieldName) {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            throw createError(`${fieldName} is required`, TypeError);
        }

        const number = typeof value === 'number' ? value : Number(value);
        if (!Number.isInteger(number) || number < 0) {
            throw createError(`${fieldName} must be a non-negative integer`, RangeError);
        }
        return number;
    }

    function normalizeVehicleType(vehicleType) {
        if (vehicleType !== '2W' && vehicleType !== '4W') {
            throw createError('vehicleType must be 2W or 4W', TypeError);
        }
        return vehicleType;
    }

    function normalizeZone(zone) {
        const text = String(zone ?? '').trim();
        const match = text.match(/^(?:zone\s*)?(\d+)$/i);
        const zoneNumber = match ? Number(match[1]) : NaN;
        if (!Number.isInteger(zoneNumber) || zoneNumber < 1 || zoneNumber > 16) {
            throw createError('zone must be an integer from 1 to 16', RangeError);
        }
        return {
            number: zoneNumber,
            key: `Zone ${zoneNumber}`
        };
    }

    function getTierConfig(config, zone) {
        if (!config || typeof config !== 'object') {
            throw createError('tier configuration is required', TypeError);
        }
        const normalizedZone = normalizeZone(zone);
        const tiers = config[normalizedZone.key];
        if (!Array.isArray(tiers) || tiers.length === 0) {
            throw createError(`tier configuration is missing for ${normalizedZone.key}`, Error);
        }
        return { zone: normalizedZone, tiers };
    }

    function tierCapacity(tier) {
        if (tier.max === Infinity) return Infinity;
        // The first row 0–N represents counts 1 through N. The next row's
        // capacity is inclusive: max - min + 1.
        return tier.min === 0 ? tier.max : tier.max - tier.min + 1;
    }

    function calculate2W(parcel, zone, sameAddressCount = 0, config = defaults.twoWTiers) {
        const totalParcels = normalizeNonNegativeInteger(parcel, 'parcel');
        const sameAddress = normalizeNonNegativeInteger(sameAddressCount, 'sameAddressCount');
        if (sameAddress > totalParcels) {
            throw createError('sameAddressCount cannot be greater than parcel', RangeError);
        }

        const { zone: normalizedZone, tiers } = getTierConfig(config, zone);
        let remaining = totalParcels;
        let grossIncentive = 0;
        const tierBreakdown = [];

        for (const tier of tiers) {
            if (remaining === 0) break;

            const capacity = tierCapacity(tier);
            const allocated = Math.min(remaining, capacity);
            remaining -= allocated;
            const amount = allocated * tier.rate;
            grossIncentive += amount;

            tierBreakdown.push({
                min: tier.min,
                max: tier.max,
                label: tier.max === Infinity ? `${tier.min}+` : `${tier.min}-${tier.max}`,
                parcel: allocated,
                rate: tier.rate,
                amount
            });
        }

        return buildResult({
            vehicleType: '2W',
            zone: normalizedZone.number,
            parcel: totalParcels,
            sizeS: 0,
            sizeL: 0,
            grossIncentive,
            sameAddressCount: sameAddress,
            tierBreakdown
        });
    }

    function calculate4W(sizeS, sizeL, zone, sameAddressCount = 0, config = defaults.fourWTiers) {
        const totalS = normalizeNonNegativeInteger(sizeS, 'sizeS');
        const totalL = normalizeNonNegativeInteger(sizeL, 'sizeL');
        const sameAddress = normalizeNonNegativeInteger(sameAddressCount, 'sameAddressCount');
        const totalParcels = totalS + totalL;
        if (sameAddress > totalParcels) {
            throw createError('sameAddressCount cannot be greater than parcel', RangeError);
        }

        const { zone: normalizedZone, tiers } = getTierConfig(config, zone);
        let remainingS = totalS;
        let remainingL = totalL;
        let grossIncentive = 0;
        const tierBreakdown = [];

        // This preserves the existing SOURCE behavior: Size S is allocated
        // first, then Size L fills the remaining capacity in each Tier.
        for (const tier of tiers) {
            if (remainingS === 0 && remainingL === 0) break;

            let capacity = tierCapacity(tier);
            const allocatedS = Math.min(remainingS, capacity);
            remainingS -= allocatedS;
            capacity -= allocatedS;

            const allocatedL = capacity > 0 ? Math.min(remainingL, capacity) : 0;
            remainingL -= allocatedL;
            capacity -= allocatedL;

            if (allocatedS === 0 && allocatedL === 0) continue;

            const amount = allocatedS * tier.rateS + allocatedL * tier.rateL;
            grossIncentive += amount;
            tierBreakdown.push({
                min: tier.min,
                max: tier.max,
                label: tier.max === Infinity ? `${tier.min}+` : `${tier.min}-${tier.max}`,
                sizeS: allocatedS,
                sizeL: allocatedL,
                rateS: tier.rateS,
                rateL: tier.rateL,
                amount
            });
        }

        return buildResult({
            vehicleType: '4W',
            zone: normalizedZone.number,
            parcel: totalParcels,
            sizeS: totalS,
            sizeL: totalL,
            grossIncentive,
            sameAddressCount: sameAddress,
            tierBreakdown
        });
    }

    function calculateSameAddressDeduction(vehicleType, sameAddressCount) {
        const normalizedVehicleType = normalizeVehicleType(vehicleType);
        const count = normalizeNonNegativeInteger(sameAddressCount, 'sameAddressCount');
        const rate = SAME_ADDRESS_RATES[normalizedVehicleType];
        return {
            vehicleType: normalizedVehicleType,
            sameAddressCount: count,
            rate,
            deduction: roundCurrency(count * rate)
        };
    }

    function calculateNetIncentive(grossIncentive, sameAddressDeduction) {
        const gross = normalizeMoney(grossIncentive, 'grossIncentive');
        const deduction = normalizeMoney(sameAddressDeduction, 'sameAddressDeduction');
        return roundCurrency(gross - deduction);
    }

    function normalizeMoney(value, fieldName) {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            throw createError(`${fieldName} is required`, TypeError);
        }
        const number = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(number) || number < 0) {
            throw createError(`${fieldName} must be a non-negative number`, RangeError);
        }
        return number;
    }

    function roundCurrency(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    function buildResult({ vehicleType, zone, parcel, sizeS, sizeL, grossIncentive, sameAddressCount, tierBreakdown }) {
        const deduction = calculateSameAddressDeduction(vehicleType, sameAddressCount);
        const gross = roundCurrency(grossIncentive);
        return {
            vehicleType,
            zone,
            parcel,
            sizeS,
            sizeL,
            grossIncentive: gross,
            sameAddressCount: deduction.sameAddressCount,
            sameAddressRate: deduction.rate,
            sameAddressDeduction: deduction.deduction,
            netIncentive: calculateNetIncentive(gross, deduction.deduction),
            tierBreakdown
        };
    }

    function createCalculationEngine(config = {}) {
        const twoWTiers = config.twoWTiers || defaults.twoWTiers;
        const fourWTiers = config.fourWTiers || defaults.fourWTiers;
        return {
            calculate2W: (parcel, zone, sameAddressCount = 0) => calculate2W(parcel, zone, sameAddressCount, twoWTiers),
            calculate4W: (sizeS, sizeL, zone, sameAddressCount = 0) => calculate4W(sizeS, sizeL, zone, sameAddressCount, fourWTiers),
            calculateSameAddressDeduction,
            calculateNetIncentive,
            roundCurrency,
            sameAddressRates: { ...SAME_ADDRESS_RATES }
        };
    }

    const defaultEngine = createCalculationEngine();
    return {
        ...defaultEngine,
        createCalculationEngine
    };
});
