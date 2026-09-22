from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
index = root / 'index.html'
s = index.read_text()
s, removed = re.subn(r'\n\s*<section id="view-summary".*?</section>\s*\n', '\n', s, count=1, flags=re.S)
if removed != 1:
    raise SystemExit(f'expected one Summary section, removed={removed}')
nav = '''  <nav class="bottom-nav"><button class="nav-item active" data-target="view-home"><span class="material-icons-round">home</span><span>หน้าหลัก</span></button><button class="nav-item" data-target="view-calculator"><span class="material-icons-round">calculate</span><span>คำนวณ</span></button><button class="nav-item" data-target="view-profile"><span class="material-icons-round">person</span><span>โปรไฟล์</span></button><button class="nav-item" data-target="view-history"><span class="material-icons-round">receipt_long</span><span>รายการ</span></button><button class="nav-item" data-target="view-settings"><span class="material-icons-round">settings</span><span>ตั้งค่า</span></button></nav>'''
s, replaced = re.subn(r'\s*<nav class="bottom-nav">.*?</nav>', '\n' + nav, s, count=1, flags=re.S)
if replaced != 1:
    raise SystemExit(f'expected one bottom nav, replaced={replaced}')
s = s.replace('<script src="summary.js"></script>', '')
s = s.replace('<label class="field"><span>งาน RTS (ชิ้น)</span><input type="number" id="calc-rts" min="0" value="0" inputmode="numeric"><small>อัตรางาน RTS ฿1.50 / ชิ้น</small></label>', '<label class="field rts-field"><span class="rts-label"><span class="material-icons-round">info</span>งาน RTS (ชิ้น)</span><input type="number" id="calc-rts" min="0" value="0" inputmode="numeric"><small>ใช้สำหรับคำนวณกล่อง<br>อัตราค่ากล่อง ฿1.50 / ชิ้น</small></label>')
s = s.replace('TBS Incentive · Version 1.0', 'TBS Incentive · Version 1.2')
index.write_text(s)

package = root / 'package.json'
package.write_text(package.read_text().replace('"version": "1.1.0"', '"version": "1.2.0"', 1))
lock = root / 'package-lock.json'
if lock.exists():
    lock.write_text(lock.read_text().replace('"version": "1.1.0"', '"version": "1.2.0"', 2))
gradle = root / 'android/app/build.gradle'
gradle.write_text(gradle.read_text().replace("versionName '1.1.0'", "versionName '1.2'", 1))
app = root / 'app.js'
app.write_text(app.read_text().replace('/releases/download/v1.1/CW-Incentive.apk', '/releases/download/v1.2/CW-Incentive.apk'))
