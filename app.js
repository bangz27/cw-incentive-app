/**
 * =========================================================================
 * Incentive Calculator Pro - Main UI & App Logic
 * =========================================================================
 * จัดการการเปลี่ยนหน้าจอ (Navigation), ระบบ Dark/Light Mode
 * และพฤติกรรม UI ต่างๆ ของผู้ใช้
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. ระบบจัดการธีม (Dark / Light Mode)
    // ==========================================
    const htmlElement = document.documentElement;
    const themeToggles = document.querySelectorAll('.theme-toggle');
    const themeIcons = document.querySelectorAll('.theme-icon');
    const themeTexts = document.querySelectorAll('.theme-text');

    // ตรวจสอบค่าธีมที่เคยบันทึกไว้ หรือดูจากระบบปฏิบัติการ
    const savedTheme = localStorage.getItem('incentive_theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (systemDark) {
        setTheme('dark');
    }

    // ผูก Event ให้ปุ่มสลับธีม (มีทั้งบน Sidebar และ Mobile Header)
    themeToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    });

    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('incentive_theme', theme);
        
        // อัปเดตไอคอนและข้อความบนปุ่ม
        themeIcons.forEach(icon => {
            icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        });
        
        themeTexts.forEach(text => {
            text.textContent = theme === 'dark' ? 'โหมดสว่าง' : 'โหมดกลางคืน';
        });
    }


    // ==========================================
    // 2. ระบบนำทาง (Navigation) เปลี่ยนหน้าจอ
    // ==========================================
    const navLinks = document.querySelectorAll('.nav-link, .bottom-nav .nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');

            // 2.1 ซ่อนทุกหน้าจอ และลบสถานะ Active ออกจากเมนูทั้งหมด
            viewSections.forEach(section => section.classList.remove('active'));
            navLinks.forEach(nav => nav.classList.remove('active'));

            // 2.2 แสดงหน้าจอที่เลือก และตั้งสถานะ Active ให้เมนูที่ถูกกด
            document.getElementById(targetId).classList.add('active');
            
            // หาเมนูทั้งหมดที่ชี้ไปยังหน้าจอเดียวกัน (เช่น กดมือถือ แต่อยากให้ Sidebar Active ด้วย)
            const activeLinks = document.querySelectorAll(`[data-target="${targetId}"]`);
            activeLinks.forEach(activeNav => activeNav.classList.add('active'));

            // 2.3 เลื่อนหน้าจอกลับไปด้านบนสุดเมื่อเปลี่ยนหน้า
            document.querySelector('.main-content').scrollTop = 0;
            
            // 2.4 ปรับข้อความ Header ของมือถือให้ตรงกับหน้าจอ
            const mobileHeaderTitle = document.querySelector('.header-title');
            if (mobileHeaderTitle) {
                if (targetId === 'view-calculator') mobileHeaderTitle.textContent = 'คำนวณค่ารอบ';
                else if (targetId === 'view-dashboard') mobileHeaderTitle.textContent = 'ภาพรวมสถิติ';
                else if (targetId === 'view-history') mobileHeaderTitle.textContent = 'ประวัติย้อนหลัง';
            }
        });
    });


    // ==========================================
    // 3. ปุ่ม FAB (Floating Action Button) บนมือถือ
    // ==========================================
    const mobileFab = document.getElementById('mobile-fab');
    if (mobileFab) {
        mobileFab.addEventListener('click', () => {
            // สั่งกดปุ่มเมนู "คำนวณ" (ลัดกลับไปหน้าคำนวณทันที)
            const calcNav = document.querySelector('.bottom-nav .nav-item[data-target="view-calculator"]');
            if (calcNav) {
                calcNav.click();
                // สั่งโฟกัสไปที่ช่องใส่จำนวน Size S เพื่อให้คีย์บอร์ดเด้งขึ้นมาพร้อมพิมพ์ (UX)
                setTimeout(() => {
                    document.getElementById('calc-size-s').focus();
                }, 300);
            }
        });
    }
});