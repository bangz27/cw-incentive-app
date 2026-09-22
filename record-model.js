/**
 * CW Incentive — Unified Record Model
 *
 * This module creates the Phase 1 record shape and reads legacy records
 * without mutating or deleting the existing LocalStorage payload.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CWRecordModel = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const VEHICLE_TYPES = new Set(['2W', '4W']);

    function assertVehicleType(vehicleType) {
        if (!VEHICLE_TYPES.has(vehicleType)) {
            throw new TypeError('vehicleType must be 2W or 4W');
        }
    }

    function numericOrZero(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function createRecord({
        id = Date.now(),
        date = '',
        fullName = '',
        hub = '',
        driverId = '',
        result,
        createdAt = new Date().toISOString()
    }) {
        if (!result || typeof result !== 'object') {
            throw new TypeError('result is required');
        }
        assertVehicleType(result.vehicleType);

        return {
            id,
            date,
            fullName: String(fullName).trim(),
            hub: String(hub).trim(),
            driverId: String(driverId).trim(),
            vehicleType: result.vehicleType,
            zone: result.zone,
            parcel: numericOrZero(result.parcel),
            sizeS: numericOrZero(result.sizeS),
            sizeL: numericOrZero(result.sizeL),
            grossIncentive: numericOrZero(result.grossIncentive),
            sameAddressCount: numericOrZero(result.sameAddressCount),
            sameAddressDeduction: numericOrZero(result.sameAddressDeduction),
            netIncentive: numericOrZero(result.netIncentive),
            boxCount: numericOrZero(result.boxCount),
            boxRate: numericOrZero(result.boxRate || 1.5),
            boxAmount: numericOrZero(result.boxAmount),
            rtsCount: numericOrZero(result.rtsCount),
            rtsRate: numericOrZero(result.rtsRate || 1.5),
            rtsIncome: numericOrZero(result.rtsIncome),
            tierBreakdown: Array.isArray(result.tierBreakdown) ? result.tierBreakdown : [],
            createdAt
        };
    }

    function inferVehicleType(raw) {
        if (raw.vehicleType === '2W' || raw.vehicleType === '4W') return raw.vehicleType;
        // The migrated legacy UI has S/L fields, so its records are treated as
        // legacy 4W records without changing their stored payload.
        if (raw.sizeS !== undefined || raw.sizeL !== undefined) return '4W';
        return '2W';
    }

    function toUnifiedRecord(raw) {
        const item = raw && typeof raw === 'object' ? raw : {};
        const sizeS = numericOrZero(item.sizeS);
        const sizeL = numericOrZero(item.sizeL);
        const gross = numericOrZero(item.grossIncentive ?? item.grandTotal);
        const sameAddressCount = numericOrZero(item.sameAddressCount);
        const deduction = numericOrZero(item.sameAddressDeduction);
        const vehicleType = inferVehicleType(item);
        const parcel = numericOrZero(item.parcel ?? item.totalParcels ?? (sizeS + sizeL));

        return {
            id: item.id ?? null,
            date: item.date ?? '',
            fullName: String(item.fullName ?? item.rider ?? '').trim(),
            hub: String(item.hub ?? '').trim(),
            driverId: String(item.driverId ?? '').trim(),
            vehicleType,
            zone: item.zone ?? '',
            parcel,
            sizeS,
            sizeL,
            grossIncentive: gross,
            sameAddressCount,
            sameAddressDeduction: deduction,
            netIncentive: numericOrZero(item.netIncentive ?? (gross - deduction)),
            boxCount: numericOrZero(item.boxCount),
            boxRate: numericOrZero(item.boxRate ?? 1.5),
            boxAmount: numericOrZero(item.boxAmount ?? (numericOrZero(item.boxCount) * 1.5)),
            rtsCount: numericOrZero(item.rtsCount),
            rtsRate: numericOrZero(item.rtsRate ?? 1.5),
            rtsIncome: numericOrZero(item.rtsIncome ?? (numericOrZero(item.rtsCount) * 1.5)),
            tierBreakdown: Array.isArray(item.tierBreakdown) ? item.tierBreakdown : [],
            createdAt: item.createdAt ?? item.timestamp ?? null,
            synced: Boolean(item.synced)
        };
    }

    function readRawRecords(storage) {
        try {
            const parsed = JSON.parse(storage.getItem('incentive_history') || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function readRecords(storage) {
        return readRawRecords(storage).map(toUnifiedRecord);
    }

    return {
        createRecord,
        toUnifiedRecord,
        readRawRecords,
        readRecords
    };
});
