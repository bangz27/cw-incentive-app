/**
 * =========================================================================
 * Incentive Calculator Pro - Export Logic
 * =========================================================================
 * จัดการการส่งออกผลการคำนวณเป็นไฟล์ PDF และ Excel (XLSX)
 */

document.addEventListener('DOMContentLoaded', () => {
    const btnExportPdf = document.getElementById('export-pdf');
    const btnExportExcel = document.getElementById('export-excel');
    const exportContainer = document.getElementById('export-container');

    // ตรวจสอบว่ามีข้อมูลพร้อมส่งออกหรือไม่ (เช็คจากโซนว่าถูกเลือกหรือยัง)
    function canExport() {
        const zone = document.getElementById('calc-zone').value;
        const grandTotal = document.getElementById('res-grand-total').textContent;
        if (!zone || grandTotal === '฿0.00') {
            alert('กรุณากรอกข้อมูลและคำนวณค่ารอบก่อนทำการส่งออก');
            return false;
        }
        return true;
    }

    // ==========================================
    // 1. ส่งออกเป็น PDF
    // ==========================================
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', (e) => {
            e.preventDefault();
            if (!canExport()) return;

            // ซ่อนปุ่ม Dropdown ชั่วคราวเพื่อไม่ให้ติดไปในไฟล์ PDF
            const dropdown = exportContainer.querySelector('.dropdown');
            if (dropdown) dropdown.style.display = 'none';

            // ตั้งค่า PDF
            const riderName = document.getElementById('calc-rider').value || 'Unknown';
            const dateStr = document.getElementById('calc-date').value || 'Date';
            const fileName = `Incentive_${riderName}_${dateStr}.pdf`;

            const opt = {
                margin:       [10, 10, 10, 10], // top, left, bottom, right
                filename:     fileName,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true,
                    // บังคับให้พื้นหลังเป็นสีขาวเสมอ แม้จะเปิด Dark Mode อยู่
                    backgroundColor: '#ffffff' 
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // แปลงและดาวน์โหลด PDF
            html2pdf().set(opt).from(exportContainer).save().then(() => {
                // แสดงปุ่ม Dropdown กลับมาเหมือนเดิมหลังจากโหลดเสร็จ
                if (dropdown) dropdown.style.display = 'block';
            }).catch(err => {
                console.error('PDF Export Error:', err);
                alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
                if (dropdown) dropdown.style.display = 'block';
            });
        });
    }


    // ==========================================
    // 2. ส่งออกเป็น Excel (.xlsx)
    // ==========================================
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', (e) => {
            e.preventDefault();
            if (!canExport()) return;

            // 2.1 ดึงข้อมูลพื้นฐานจากฟอร์ม
            const date = document.getElementById('calc-date').value;
            const zone = document.getElementById('calc-zone').value;
            const hub = document.getElementById('calc-hub').value;
            const rider = document.getElementById('calc-rider').value;
            const grandTotal = document.getElementById('res-grand-total').textContent;

            // 2.2 สร้างโครงสร้างข้อมูลสำหรับ Excel (Array of Arrays)
            const wsData = [
                ["Incentive Calculator Pro - สรุปค่ารอบพัสดุ"], // แถวที่ 1
                [], // แถวว่าง
                ["วันที่", date, "", "โซน (Zone)", zone],
                ["ฮับ (Hub)", hub, "", "ชื่อไรเดอร์", rider],
                [],
                ["รายละเอียดการคำนวณแต่ละขั้น (Tier Breakdown)"]
            ];

            // 2.3 ดึงข้อมูลหัวตาราง
            const table = document.getElementById('breakdown-table');
            const thead = table.querySelectorAll('thead th');
            const headers = Array.from(thead).map(th => th.innerText);
            wsData.push(headers);

            // 2.4 ดึงข้อมูลในแต่ละแถวของตาราง
            const tbody = table.querySelectorAll('tbody tr');
            tbody.forEach(tr => {
                const row = Array.from(tr.querySelectorAll('td')).map(td => td.innerText);
                wsData.push(row);
            });

            // 2.5 สรุปยอดรวมด้านล่าง
            wsData.push([]);
            wsData.push(["ยอดสุทธิ (Grand Total)", "", "", "", grandTotal]);

            // 2.6 สร้าง Workbook และ Worksheet ผ่านไลบรารี SheetJS (XLSX)
            try {
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(wsData);

                // ปรับความกว้างของคอลัมน์ Excel ให้สวยงาม
                const wscols = [
                    {wch: 20}, // คอลัมน์ A (Tier)
                    {wch: 15}, // คอลัมน์ B (Size S)
                    {wch: 15}, // คอลัมน์ C (Size L)
                    {wch: 20}, // คอลัมน์ D (Rate)
                    {wch: 20}  // คอลัมน์ E (Money)
                ];
                ws['!cols'] = wscols;

                XLSX.utils.book_append_sheet(wb, ws, "IncentiveResult");

                // ดาวน์โหลดไฟล์
                const fileName = `Incentive_${rider || 'Unknown'}_${date || 'Date'}.xlsx`;
                XLSX.writeFile(wb, fileName);

            } catch (err) {
                console.error('Excel Export Error:', err);
                alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel');
            }
        });
    }
});