/**
 * =========================================================================
 * Incentive Calculator Pro - History & Storage Adapter
 * =========================================================================
 * Stores unified records in LocalStorage and normalizes legacy records on read
 * without deleting or mutating the existing stored data.
 */

document.addEventListener('DOMContentLoaded', () => {
    const btnSave = document.getElementById('btn-save');
    const historyBody = document.getElementById('history-body');
    const btnSync = document.getElementById('btn-sync-history');

    loadHistory();

    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const date = document.getElementById('calc-date').value;
            const zone = document.getElementById('calc-zone').value;
            const hub = document.getElementById('calc-hub').value.trim();
            const rider = document.getElementById('calc-rider').value.trim();
            const result = window.cwCurrentCalculation;

            if (!result || !window.CWRecordModel) {
                alert('กรุณากรอกข้อมูลและคำนวณค่ารอบก่อนบันทึก');
                return;
            }

            const record = window.CWRecordModel.createRecord({
                id: Date.now(),
                date,
                fullName: rider,
                hub,
                driverId: '',
                result,
                createdAt: new Date().toISOString()
            });
            record.synced = false;

            saveRecord(record);

            const originalText = btnSave.innerHTML;
            btnSave.innerHTML = '<span class="material-icons-round fs-5 align-middle">check_circle</span> บันทึกสำเร็จ!';
            btnSave.classList.replace('btn-primary', 'btn-success');

            setTimeout(() => {
                btnSave.innerHTML = originalText;
                btnSave.classList.replace('btn-success', 'btn-primary');
                document.getElementById('btn-reset').click();
            }, 1500);
        });
    }

    function saveRecord(record) {
        const history = window.CWRecordModel.readRawRecords(localStorage);
        history.unshift(record);
        localStorage.setItem('incentive_history', JSON.stringify(history));
        loadHistory();
        window.dispatchEvent(new Event('historyUpdated'));
    }

    function loadHistory() {
        if (!historyBody || !window.CWRecordModel) return;
        const history = window.CWRecordModel.readRecords(localStorage);

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
            const dateObj = new Date(item.date);
            const formattedDate = dateObj.toLocaleDateString('th-TH', {
                year: 'numeric', month: 'short', day: 'numeric'
            });

            const syncIcon = item.synced
                ? '<span class="material-icons-round text-success align-middle fs-6 ms-1" title="ซิงค์แล้ว">cloud_done</span>'
                : '<span class="material-icons-round text-warning align-middle fs-6 ms-1" title="รอซิงค์">cloud_queue</span>';

            html += `
                <tr>
                    <td class="text-nowrap">${formattedDate} ${syncIcon}</td>
                    <td><span class="badge bg-secondary bg-opacity-25 text-dark">${item.zone}</span></td>
                    <td>${item.hub}</td>
                    <td>${item.fullName}</td>
                    <td class="text-center text-primary fw-medium">${item.sizeS}</td>
                    <td class="text-center text-warning fw-medium">${item.sizeL}</td>
                    <td class="text-center fw-bold">${item.parcel}</td>
                    <td class="text-end fw-bold text-success">฿${item.netIncentive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
            `;
        });

        historyBody.innerHTML = html;
    }

    if (btnSync) {
        btnSync.addEventListener('click', async () => {
            const rawHistory = window.CWRecordModel.readRawRecords(localStorage);
            const history = rawHistory.map(window.CWRecordModel.toUnifiedRecord);
            const unsyncedRecords = history.filter(item => !item.synced);

            if (unsyncedRecords.length === 0) {
                alert('ข้อมูลทั้งหมดถูกซิงค์เรียบร้อยแล้ว ไม่พบรายการค้างส่ง');
                return;
            }

            if (!APP_CONFIG.GOOGLE_SCRIPT_URL) {
                alert('ระบบยังไม่พร้อมใช้งาน: กรุณาตั้งค่า GOOGLE_SCRIPT_URL ในไฟล์ config.js ก่อนเพื่อใช้งานฟีเจอร์นี้');
                return;
            }

            const originalHtml = btnSync.innerHTML;
            btnSync.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> กำลังซิงค์...';
            btnSync.disabled = true;

            try {
                const rawById = new Map(rawHistory.map(item => [item.id, item]));
                const syncPayload = unsyncedRecords.map(item => {
                    const raw = rawById.get(item.id);
                    return raw && Object.prototype.hasOwnProperty.call(raw, 'grandTotal') ? raw : item;
                });

                await fetch(APP_CONFIG.GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'saveHistory', data: syncPayload })
                });

                const unsyncedIds = new Set(unsyncedRecords.map(item => item.id));
                const updatedRawHistory = rawHistory.map(item => (
                    unsyncedIds.has(item.id) ? { ...item, synced: true } : item
                ));
                localStorage.setItem('incentive_history', JSON.stringify(updatedRawHistory));

                loadHistory();
                alert(`ซิงค์ข้อมูลขึ้น Google Sheets สำเร็จจำนวน ${unsyncedRecords.length} รายการ`);
            } catch (error) {
                console.error('Sync Error:', error);
                alert('การซิงค์ล้มเหลว โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
            } finally {
                btnSync.innerHTML = originalHtml;
                btnSync.disabled = false;
            }
        });
    }
});
