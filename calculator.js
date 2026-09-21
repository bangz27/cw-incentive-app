/**
 * =========================================================================
 * Incentive Calculator Pro - Core Calculation Logic (Fixed)
 * =========================================================================
 * รับผิดชอบการคำนวณค่ารอบตามขั้น (Tier-based) และอัปเดต UI แบบ Real-time
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. ดึง Elements ที่ต้องใช้งาน
    const zoneSelect = document.getElementById('calc-zone');
    const sizeSInput = document.getElementById('calc-size-s');
    const sizeLInput = document.getElementById('calc-size-l');
    
    const resTotalParcel = document.getElementById('res-total-parcel');
    const resGrandTotal = document.getElementById('res-grand-total');
    const breakdownBody = document.getElementById('breakdown-body');
    const btnSave = document.getElementById('btn-save');

    const formInputs = [
        document.getElementById('calc-date'),
        zoneSelect,
        document.getElementById('calc-hub'),
        document.getElementById('calc-rider'),
        sizeSInput,
        sizeLInput
    ];

    // 2. ฟังก์ชันเริ่มต้น: โหลดรายชื่อโซนจาก config.js ลงใน Dropdown
    function initZones() {
        zoneSelect.innerHTML = '<option value="" selected disabled>-- เลือกโซน --</option>';
        for (const zone in ZONES_CONFIG) {
            const option = document.createElement('option');
            option.value = zone;
            option.textContent = zone;
            zoneSelect.appendChild(option);
        }
    }

    // 3. ฟังก์ชัน Debounce เพื่อลดการคำนวณซ้ำซ้อน
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

    // 4. อัลกอริทึมการคำนวณหลัก (แก้ไขลอจิกความจุ Tier แล้ว)
    function calculateIncentive() {
        const zoneName = zoneSelect.value;
        const totalS = parseInt(sizeSInput.value) || 0;
        const totalL = parseInt(sizeLInput.value) || 0;
        const totalParcels = totalS + totalL;

        // อัปเดตยอดรวมชิ้น
        resTotalParcel.textContent = totalParcels.toLocaleString();

        // ตรวจสอบความถูกต้อง
        if (!zoneName || !ZONES_CONFIG[zoneName] || totalParcels === 0) {
            resetResultUI();
            checkSaveButton();
            return;
        }

        const tiers = ZONES_CONFIG[zoneName];
        let remainingS = totalS;
        let remainingL = totalL;
        let grandTotal = 0;
        let breakdownHTML = '';

        // ลูปคำนวณแต่ละขั้น (Tier)
        for (let i = 0; i < tiers.length; i++) {
            const tier = tiers[i];
            
            // [FIXED]: คำนวณความจุของขั้นให้ถูกต้อง
            // ถ้าเริ่มที่ 0 (เช่น 0-4) ความจุคือ 4 ชิ้น
            // ถ้าเริ่มเลขอื่น (เช่น 5-69) ความจุคือ 69 - 5 + 1 = 65 ชิ้น
            let tierCapacity = Infinity;
            if (tier.max !== Infinity) {
                tierCapacity = tier.min === 0 ? tier.max : (tier.max - tier.min + 1);
            }
            
            let allocatedS = 0;
            let allocatedL = 0;

            // กฎข้อ 1: ยัด Size S ลงไปก่อนเสมอ
            if (remainingS > 0) {
                allocatedS = Math.min(remainingS, tierCapacity);
                remainingS -= allocatedS;
                tierCapacity -= allocatedS;
            }

            // กฎข้อ 2: ถ้าโควต้าขั้นนี้ยังไม่เต็ม และมี Size L เหลือ ให้เอา Size L มายัดต่อ
            if (remainingL > 0 && tierCapacity > 0) {
                allocatedL = Math.min(remainingL, tierCapacity);
                remainingL -= allocatedL;
                tierCapacity -= allocatedL;
            }

            // ถ้าขั้นนี้มีการจัดสรรพัสดุลงไป ให้คำนวณเงินและสร้างตาราง
            if (allocatedS > 0 || allocatedL > 0) {
                const moneyS = allocatedS * tier.rateS;
                const moneyL = allocatedL * tier.rateL;
                const tierMoney = moneyS + moneyL;
                grandTotal += tierMoney;

                const tierLabel = tier.max === Infinity ? `${tier.min}+` : `${tier.min}-${tier.max}`;

                breakdownHTML += `
                    <tr>
                        <td class="fw-medium">${tierLabel}</td>
                        <td class="text-center text-primary">${allocatedS}</td>
                        <td class="text-center text-warning">${allocatedL}</td>
                        <td class="text-end text-muted">฿${tier.rateS} / ฿${tier.rateL}</td>
                        <td class="text-end fw-bold">฿${tierMoney.toLocaleString()}</td>
                    </tr>
                `;
            }

            // ถ้าจัดสรรพัสดุหมดแล้ว ให้หยุดลูป
            if (remainingS === 0 && remainingL === 0) {
                break;
            }
        }

        // แสดงผลลัพธ์ออกทางหน้าจอ
        resGrandTotal.textContent = `฿${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        breakdownBody.innerHTML = breakdownHTML;
        
        checkSaveButton();
    }

    // 5. ฟังก์ชันล้างค่า UI
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

    // 6. ตรวจสอบว่ากรอกข้อมูลครบเพื่อเปิดปุ่มบันทึก
    function checkSaveButton() {
        const isDateFilled = document.getElementById('calc-date').value !== '';
        const isZoneFilled = zoneSelect.value !== '';
        const isHubFilled = document.getElementById('calc-hub').value.trim() !== '';
        const isRiderFilled = document.getElementById('calc-rider').value.trim() !== '';
        const totalParcels = (parseInt(sizeSInput.value) || 0) + (parseInt(sizeLInput.value) || 0);

        btnSave.disabled = !(isDateFilled && isZoneFilled && isHubFilled && isRiderFilled && totalParcels > 0);
    }

    // 7. จัดการ Events
    const liveCalculate = debounce(calculateIncentive, 150);
    
    formInputs.forEach(input => {
        if(input) {
            input.addEventListener('input', liveCalculate);
            input.addEventListener('change', liveCalculate);
        }
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        document.getElementById('calculator-form').reset();
        sizeSInput.value = '0';
        sizeLInput.value = '0';
        resTotalParcel.textContent = '0';
        resetResultUI();
        checkSaveButton();
        document.getElementById('calc-date').valueAsDate = new Date();
    });

    // เริ่มต้นทำงาน
    initZones();
    document.getElementById('calc-date').valueAsDate = new Date();
});