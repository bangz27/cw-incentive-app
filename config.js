/**
 * =========================================================================
 * Incentive Calculator Pro - Configuration File
 * =========================================================================
 * ไฟล์นี้ใช้สำหรับตั้งค่าข้อมูล Zone และ Tier ของการคำนวณค่ารอบทั้งหมด
 * หากในอนาคตมีการเพิ่มโซนใหม่ หรือเปลี่ยนเรทราคา ให้แก้ไขที่ไฟล์นี้เท่านั้น
 * 
 * โครงสร้างแต่ละขั้น (Tier):
 * min: จำนวนพัสดุเริ่มต้นของขั้นนั้น
 * max: จำนวนพัสดุสูงสุดของขั้นนั้น (ใช้ Infinity สำหรับเครื่องหมาย + เช่น 70+)
 * rateL: ราคาต่อชิ้นสำหรับ Size L ในขั้นนั้น
 * rateS: ราคาต่อชิ้นสำหรับ Size S ในขั้นนั้น
 * =========================================================================
 */

const ZONES_CONFIG = {
    "Zone 1": [
        { min: 0, max: 4, rateL: 0, rateS: 0 },
        { min: 5, max: 69, rateL: 23, rateS: 14 },
        { min: 70, max: Infinity, rateL: 24, rateS: 14 }
    ],
    "Zone 2": [
        { min: 0, max: 9, rateL: 0, rateS: 0 },
        { min: 10, max: 79, rateL: 21, rateS: 13 },
        { min: 80, max: Infinity, rateL: 22, rateS: 13 }
    ],
    "Zone 3": [
        { min: 0, max: 14, rateL: 0, rateS: 0 },
        { min: 15, max: 89, rateL: 19, rateS: 11 },
        { min: 90, max: Infinity, rateL: 20, rateS: 12 }
    ],
    "Zone 4": [
        { min: 0, max: 19, rateL: 0, rateS: 0 },
        { min: 20, max: 59, rateL: 17, rateS: 10 },
        { min: 60, max: Infinity, rateL: 18, rateS: 11 }
    ],
    "Zone 5": [
        { min: 0, max: 24, rateL: 0, rateS: 0 },
        { min: 25, max: 79, rateL: 16, rateS: 10 },
        { min: 80, max: Infinity, rateL: 17, rateS: 10 }
    ],
    "Zone 6": [
        { min: 0, max: 29, rateL: 0, rateS: 0 },
        { min: 30, max: 119, rateL: 15, rateS: 9 },
        { min: 120, max: Infinity, rateL: 16, rateS: 10 }
    ],
    "Zone 7": [
        { min: 0, max: 34, rateL: 0, rateS: 0 },
        { min: 35, max: 129, rateL: 14, rateS: 8 },
        { min: 130, max: Infinity, rateL: 15, rateS: 9 }
    ],
    "Zone 8": [
        { min: 0, max: 39, rateL: 0, rateS: 0 },
        { min: 40, max: 94, rateL: 13, rateS: 8 },
        { min: 95, max: Infinity, rateL: 14, rateS: 8 }
    ],
    "Zone 9": [
        { min: 0, max: 44, rateL: 0, rateS: 0 },
        { min: 45, max: 99, rateL: 12, rateS: 7 },
        { min: 100, max: Infinity, rateL: 13, rateS: 8 }
    ],
    "Zone 10": [
        { min: 0, max: 49, rateL: 0, rateS: 0 },
        { min: 50, max: 79, rateL: 11, rateS: 7 },
        { min: 80, max: Infinity, rateL: 12, rateS: 7 }
    ],
    "Zone 11": [
        { min: 0, max: 49, rateL: 0, rateS: 0 },
        { min: 50, max: 99, rateL: 10, rateS: 6 },
        { min: 100, max: Infinity, rateL: 11, rateS: 7 }
    ],
    "Zone 12": [
        { min: 0, max: 49, rateL: 0, rateS: 0 },
        { min: 50, max: 99, rateL: 9, rateS: 5 },
        { min: 100, max: 179, rateL: 10, rateS: 6 },
        { min: 180, max: Infinity, rateL: 10, rateS: 7 }
    ],
    "Zone 13": [
        { min: 0, max: 49, rateL: 0, rateS: 0 },
        { min: 50, max: 79, rateL: 8, rateS: 5 },
        { min: 80, max: 189, rateL: 9, rateS: 5 },
        { min: 190, max: Infinity, rateL: 10, rateS: 6 }
    ],
    "Zone 14": [
        { min: 0, max: 49, rateL: 0, rateS: 0 },
        { min: 50, max: 169, rateL: 8, rateS: 5 },
        { min: 170, max: 254, rateL: 9, rateS: 5 },
        { min: 255, max: Infinity, rateL: 10, rateS: 6 }
    ],
    "Zone 15": [
        { min: 0, max: 49, rateL: 0, rateS: 0 },
        { min: 50, max: 119, rateL: 7, rateS: 4 },
        { min: 120, max: 209, rateL: 8, rateS: 5 },
        { min: 210, max: Infinity, rateL: 9, rateS: 5 }
    ],
    "Zone 16": [
        { min: 0, max: 49, rateL: 0, rateS: 0 },
        { min: 50, max: 199, rateL: 7, rateS: 4 },
        { min: 200, max: 299, rateL: 8, rateS: 5 },
        { min: 300, max: Infinity, rateL: 9, rateS: 5 }
    ]
};

// เผื่อใช้งานกรณีต้องการตั้งค่า Google Apps Script Web App URL ล่วงหน้า
const APP_CONFIG = {
    // ใส่ URL ของ Google Apps Script หลังจาก Deploy แล้วที่นี่ เพื่อให้ระบบบันทึกลง Google Sheets
    GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycby2zQhFAgZcnqsphw1sRNe1MgbhmZjUqRgylpBpll2Xo4iGyfvEU4jcmxV7w3JWWTYZQQ/exec" 
};