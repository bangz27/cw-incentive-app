/**
 * =========================================================================
 * Incentive Calculator Pro - Dashboard & Analytics Logic
 * =========================================================================
 * คำนวณสถิติภาพรวม (ยอดวันนี้, ยอดเดือนนี้) และวาดกราฟด้วย Chart.js
 */

document.addEventListener('DOMContentLoaded', () => {
    // ตัวแปรสำหรับเก็บ Instance ของกราฟ เพื่อให้สามารถเคลียร์และวาดใหม่ได้
    let trendChartInstance = null;
    let zoneChartInstance = null;

    // ฟังก์ชันหลักสำหรับอัปเดตหน้า Dashboard ทั้งหมด
    function updateDashboard() {
        const history = JSON.parse(localStorage.getItem('incentive_history')) || [];
        
        updateSummaryCards(history);
        updateCharts(history);
    }

    // ฟังก์ชันคำนวณและอัปเดตตัวเลขใน Card ทั้ง 4 ใบ
    function updateSummaryCards(history) {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0]; // รูปแบบ YYYY-MM-DD
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let todayTotal = 0;
        let monthlyTotal = 0;
        let allTimeTotal = 0;
        let uniqueDays = new Set(); // ใช้หาจำนวนวันที่มีการวิ่งงาน เพื่อหาค่าเฉลี่ยรายวัน

        history.forEach(item => {
            const itemDate = new Date(item.date);
            const amount = parseFloat(item.grandTotal) || 0;

            // ยอดรวมทั้งหมด
            allTimeTotal += amount;
            uniqueDays.add(item.date);

            // ยอดวันนี้
            if (item.date === todayString) {
                todayTotal += amount;
            }

            // ยอดเดือนนี้
            if (itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear) {
                monthlyTotal += amount;
            }
        });

        // คำนวณค่าเฉลี่ยต่อวัน (รวมทุกเวลา หารด้วย จำนวนวันที่เคยวิ่งงาน)
        const avgPerDay = uniqueDays.size > 0 ? (allTimeTotal / uniqueDays.size) : 0;

        // อัปเดตขึ้นหน้าจอ
        document.getElementById('dash-today').textContent = `฿${todayTotal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;
        document.getElementById('dash-monthly').textContent = `฿${monthlyTotal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;
        document.getElementById('dash-average').textContent = `฿${avgPerDay.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;
        document.getElementById('dash-count').textContent = history.length.toLocaleString();
    }

    // ฟังก์ชันประมวลผลข้อมูลและวาดกราฟ
    function updateCharts(history) {
        if (history.length === 0) return; // ถ้าไม่มีข้อมูลไม่ต้องวาดกราฟ

        // -----------------------------------------
        // 1. กราฟแนวโน้มรายวัน (Bar Chart) ย้อนหลัง 7 วันล่าสุด
        // -----------------------------------------
        const dailyData = {};
        history.forEach(item => {
            // รวมยอดเงินตามวันที่
            if (!dailyData[item.date]) dailyData[item.date] = 0;
            dailyData[item.date] += parseFloat(item.grandTotal);
        });

        // เรียงวันที่จากเก่าไปใหม่ และเลือกแค่ 7 วันล่าสุด
        const sortedDates = Object.keys(dailyData).sort();
        const last7Dates = sortedDates.slice(-7);
        const trendLabels = last7Dates.map(date => {
            const d = new Date(date);
            return `${d.getDate()}/${d.getMonth() + 1}`; // รูปแบบ วัน/เดือน
        });
        const trendValues = last7Dates.map(date => dailyData[date]);

        const ctxTrend = document.getElementById('trendChart').getContext('2d');
        if (trendChartInstance) trendChartInstance.destroy(); // เคลียร์กราฟเก่าก่อน
        
        trendChartInstance = new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: 'ยอดอินเซนทีฟรายวัน (บาท)',
                    data: trendValues,
                    backgroundColor: 'rgba(238, 77, 45, 0.8)', // สีส้ม SPX
                    borderRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // -----------------------------------------
        // 2. กราฟสัดส่วนโซน (Doughnut Chart)
        // -----------------------------------------
        const zoneData = {};
        history.forEach(item => {
            if (!zoneData[item.zone]) zoneData[item.zone] = 0;
            zoneData[item.zone] += parseFloat(item.grandTotal);
        });

        const zoneLabels = Object.keys(zoneData);
        const zoneValues = Object.values(zoneData);
        
        // ชุดสีสำหรับกราฟโดนัท
        const bgColors = [
            '#EE4D2D', '#FF7A59', '#FF9B85', '#FFBDB0', '#FFDFD9', 
            '#2E7D32', '#4CAF50', '#81C784', '#1976D2', '#64B5F6'
        ];

        const ctxZone = document.getElementById('zoneChart').getContext('2d');
        if (zoneChartInstance) zoneChartInstance.destroy();

        zoneChartInstance = new Chart(ctxZone, {
            type: 'doughnut',
            data: {
                labels: zoneLabels,
                datasets: [{
                    data: zoneValues,
                    backgroundColor: bgColors.slice(0, zoneLabels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }
                }
            }
        });
    }

    // เรียกใช้อัปเดต Dashboard เมื่อเปิดหน้าเว็บครั้งแรก
    updateDashboard();

    // ดักฟัง Event 'historyUpdated' ที่เราเขียนปล่อยมาจากไฟล์ history.js
    // เพื่อให้อัปเดตกราฟแบบ Real-time เวลาผู้ใช้กดเซฟการคำนวณใหม่
    window.addEventListener('historyUpdated', updateDashboard);
});