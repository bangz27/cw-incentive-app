/**
 * =========================================================================
 * Incentive Calculator Pro - UI Adapter
 * =========================================================================
 * The business rules live in calculation-engine.js. This file only binds
 * those reusable functions to the existing calculator DOM.
 */

document.addEventListener('DOMContentLoaded', () => {
    const zoneSelect = document.getElementById('calc-zone');
    const sizeSInput = document.getElementById('calc-size-s');
    const sizeLInput = document.getElementById('calc-size-l');

    const resTotalParcel = document.getElementById('res-total-parcel');
    const resGrandTotal = document.getElementById('res-grand-total');
    const breakdownBody = document.getElementById('breakdown-body');
    const btnSave = document.getElementById('btn-save');
    const calculationEngine = window.CWCalculationEngine;

    const formInputs = [
        document.getElementById('calc-date'),
        zoneSelect,
        document.getElementById('calc-hub'),
        document.getElementById('calc-rider'),
        sizeSInput,
        sizeLInput
    ];

    function initZones() {
        zoneSelect.innerHTML = '<option value="" selected disabled>-- เลือกโซน --</option>';
        for (const zone in ZONES_CONFIG) {
            const option = document.createElement('option');
            option.value = zone;
            option.textContent = zone;
            zoneSelect.appendChild(option);
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function getNonNegativeInputValue(input) {
        const value = Number(input.value);
        return Number.isInteger(value) && value >= 0 ? value : null;
    }

    function calculateIncentive() {
        const zoneName = zoneSelect.value;
        const totalS = getNonNegativeInputValue(sizeSInput);
        const totalL = getNonNegativeInputValue(sizeLInput);
        const totalParcels = (totalS ?? 0) + (totalL ?? 0);

        resTotalParcel.textContent = totalParcels.toLocaleString();

        if (!calculationEngine || !zoneName || !ZONES_CONFIG[zoneName] || totalS === null || totalL === null || totalParcels === 0) {
            window.cwCurrentCalculation = null;
            resetResultUI();
            checkSaveButton();
            return;
        }

        const result = calculationEngine.calculate4W(totalS, totalL, zoneName, 0);
        window.cwCurrentCalculation = result;

        resGrandTotal.textContent = `฿${result.grossIncentive.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
        breakdownBody.innerHTML = result.tierBreakdown.map(tier => `
            <tr>
                <td class="fw-medium">${tier.label}</td>
                <td class="text-center text-primary">${tier.sizeS}</td>
                <td class="text-center text-warning">${tier.sizeL}</td>
                <td class="text-end text-muted">฿${tier.rateS} / ฿${tier.rateL}</td>
                <td class="text-end fw-bold">฿${tier.amount.toLocaleString()}</td>
            </tr>
        `).join('');

        checkSaveButton();
    }

    function resetResultUI() {
        resGrandTotal.textContent = '฿0.00';
        breakdownBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    กรอกจำนวนพัสดุเพื่อดูรายละเอียดการคำนวณแต่ละขั้น
                </td>
            </tr>
        `;
    }

    function checkSaveButton() {
        const isDateFilled = document.getElementById('calc-date').value !== '';
        const isZoneFilled = zoneSelect.value !== '';
        const isHubFilled = document.getElementById('calc-hub').value.trim() !== '';
        const isRiderFilled = document.getElementById('calc-rider').value.trim() !== '';
        const sizeS = getNonNegativeInputValue(sizeSInput);
        const sizeL = getNonNegativeInputValue(sizeLInput);
        const totalParcels = (sizeS ?? 0) + (sizeL ?? 0);

        btnSave.disabled = !(isDateFilled && isZoneFilled && isHubFilled && isRiderFilled && totalParcels > 0);
    }

    const liveCalculate = debounce(calculateIncentive, 150);
    formInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', liveCalculate);
            input.addEventListener('change', liveCalculate);
        }
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        document.getElementById('calculator-form').reset();
        sizeSInput.value = '0';
        sizeLInput.value = '0';
        resTotalParcel.textContent = '0';
        window.cwCurrentCalculation = null;
        resetResultUI();
        checkSaveButton();
        document.getElementById('calc-date').valueAsDate = new Date();
    });

    initZones();
    document.getElementById('calc-date').valueAsDate = new Date();
});
