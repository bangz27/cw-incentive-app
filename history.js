/**
 * =========================================================================
 * Incentive Calculator Pro - History & Storage Logic
 * =========================================================================
 * จัดการการบันทึกข้อมูลลง LocalStorage, แสดงผลประวัติ, 
 * และเตรียมการส่งข้อมูล (Sync) ขึ้น Google Sheets
 */

document.addEventListener('DOMContentLoaded', () => {
    const btnSave = document.getElementById('btn-save');
    const historyBody = document.getElementById('history-body');
    const btnSync = document.getElementById('btn-sync-history');

    // 1. โหลดประวัติขึ้นมาแสดงทันทีเมื่อเปิดแอป
    loadHistory();

    // 2. ดักจับเหตุการณ์เมื่อผู้ใช้กดปุ่ม "บันทึก" ในหน้าคำนวณ
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const date = document.getElementById('calc-date').value;
            const zone = document.getElementById('calc-zone').value;
            const hub = document.getElementById('calc-hub').value.trim();
            const rider = document.getElementById('calc-rider').value.trim();
            const sizeS = parseInt(document.getElementById('calc-size-s').value) || 0;
            const sizeL = parseInt(document.getElementById('calc-size-l').value) || 0;
            const totalParcels = sizeS + sizeL;
            
            // ดึงตัวเลขยอดเงินสุทธิจาก UI (ลบตัวอักษร ฿ และลูกน้ำออกเพื่อแปลงเป็นตัวเลข)
            const grandTotalText = document.getElementById('res-grand-total').textContent;
            const grandTotal = parseFloat(grandTotalText.replace(/[^0-9.-]+/g,"")) || 0;

            // สร้าง Object ข้อมูลเตรียมบันทึก
            const record = {
                id: Date.now(), // ใช้ Timestamp เป็น ID ไม่ซ้ำกัน
                timestamp: new Date().toISOString(),
                date: date,
                zone: zone,
                hub: hub,
                rider: rider,
                sizeS: sizeS,
                sizeL: sizeL,
                totalParcels: totalParcels,
                grandTotal: grandTotal,
                synced: false // สถานะการส่งขึ้น Google Sheets
            };

            // บันทึกลง LocalStorage
            saveRecord(record);

            // เอฟเฟกต์ปุ่มตอบสนองว่าบันทึกสำเร็จ
            const originalText = btnSave.innerHTML;
            btnSave.innerHTML = '<span class="material-icons-round fs-5 align-middle">check_circle</span> บันทึกสำเร็จ!';
            btnSave.classList.replace('btn-primary', 'btn-success');
            
            // หน่วงเวลา 1.5 วินาที ค่อยคืนค่าปุ่มและล้างฟอร์ม
            setTimeout(() => {
                btnSave.innerHTML = originalText;
                btnSave.classList.replace('btn-success', 'btn-primary');
                document.getElementById('btn-reset').click(); // สั่งกดปุ่มรีเซ็ตเพื่อล้างฟอร์ม
            }, 1500);
        });
    }

    // ฟังก์ชันบันทึกข้อมูลลง LocalStorage
    function saveRecord(record) {
        let history = JSON.parse(localStorage.getItem('incentive_history')) || [];
        history.unshift(record); // ดันข้อมูลใหม่ให้อยู่แถวบนสุด (Index 0)
        localStorage.setItem('incentive_history', JSON.stringify(history));
        
        loadHistory(); // รีเฟรชตารางประวัติ
        
        // ส่ง Event ไปบอกหน้า Dashboard ให้อัปเดตกราฟและตัวเลข
        window.dispatchEvent(new Event('historyUpdated'));
    }

    // ฟังก์ชันโหลดข้อมูลมาสร้างตาราง HTML
    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('incentive_history')) || [];
        
        if (history.length === 0) {
            historyBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-5">
                        <span class="material-icons-round fs-1 text-light mb-2" style="font-size: 3rem !important;">inbox</span><br>
                        ยังไม่มีข้อมูล ประวัติจะแสดงเมื่อคุณกดบันทึกการคำนวณ
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        history.forEach(item => {
            // ปรับฟอร์แมตวันที่ให้สวยงาม (เช่น 13 ก.ค. 2569)
            const dateObj = new Date(item.date);
            const formattedDate = dateObj.toLocaleDateString('th-TH', { 
                year: 'numeric', month: 'short', day: 'numeric' 
            });

            // ไอคอนสถานะ Sync
            const syncIcon = item.synced 
                ? '<span class="material-icons-round text-success align-middle fs-6 ms-1" title="ซิงค์แล้ว">cloud_done</span>' 
                : '<span class="material-icons-round text-warning align-middle fs-6 ms-1" title="รอซิงค์">cloud_queue</span>';

            html += `
                <tr>
                    <td class="text-nowrap">${formattedDate} ${syncIcon}</td>
                    <td><span class="badge bg-secondary bg-opacity-25 text-dark">${item.zone}</span></td>
                    <td>${item.hub}</td>
                    <td>${item.rider}</td>
                    <td class="text-center text-primary fw-medium">${item.sizeS}</td>
                    <td class="text-center text-warning fw-medium">${item.sizeL}</td>
                    <td class="text-center fw-bold">${item.totalParcels}</td>
                    <td class="text-end fw-bold text-success">฿${item.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
            `;
        });

        historyBody.innerHTML = html;
    }

    // 3. ระบบ Sync ข้อมูลไป Google Apps Script (ทำงานเมื่อกดปุ่ม ดึงข้อมูล)
    if (btnSync) {
        btnSync.addEventListener('click', async () => {
            const history = JSON.parse(localStorage.getItem('incentive_history')) || [];
            const unsyncedRecords = history.filter(item => !item.synced);

            if (unsyncedRecords.length === 0) {
                alert('ข้อมูลทั้งหมดถูกซิงค์เรียบร้อยแล้ว ไม่พบรายการค้างส่ง');
                return;
            }

            if (!APP_CONFIG.GOOGLE_SCRIPT_URL) {
                alert("ระบบยังไม่พร้อมใช้งาน: กรุณาตั้งค่า GOOGLE_SCRIPT_URL ในไฟล์ config.js ก่อนเพื่อใช้งานฟีเจอร์นี้");
                return;
            }

            // เปลี่ยนปุ่มเป็นสถานะกำลังโหลด
            const originalHtml = btnSync.innerHTML;
            btnSync.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> กำลังซิงค์...';
            btnSync.disabled = true;

            try {
                // จำลองการส่ง HTTP POST ไปยัง Google Apps Script
                const response = await fetch(APP_CONFIG.GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors', // เลี่ยงปัญหา CORS Block จาก Browser
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        action: 'saveHistory', 
                        data: unsyncedRecords 
                    })
                });

                // อัปเดตสถานะของข้อมูลทั้งหมดใน LocalStorage ให้เป็น "ซิงค์แล้ว"
                const updatedHistory = history.map(item => ({ ...item, synced: true }));
                localStorage.setItem('incentive_history', JSON.stringify(updatedHistory));
                
                loadHistory(); // โหลดตารางใหม่ (เปลี่ยนไอคอนเป็นติ๊กถูก)
                alert(`ซิงค์ข้อมูลขึ้น Google Sheets สำเร็จจำนวน ${unsyncedRecords.length} รายการ`);

            } catch (error) {
                console.error("Sync Error:", error);
                alert("การซิงค์ล้มเหลว โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
            } finally {
                // คืนค่าปุ่มกลับเหมือนเดิม
                btnSync.innerHTML = originalHtml;
                btnSync.disabled = false;
            }
        });
    }
});