const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const count = (text, needle) => text.split(needle).length - 1;

const html = read('index.html');
const app = read('app.js');
const css = read('style.css');
const build = read('scripts/build-web.cjs');
const bannerPath = path.join(root, 'tbs_banner.png');

const requiredPresets = ['today', '2w', '4w-mid', '4w-end'];
for (const preset of requiredPresets) {
  assert(html.includes(`data-range-preset="${preset}"`), `Missing Home preset: ${preset}`);
}
for (const legacy of ['data-range-preset="7"', 'data-range-preset="30"', 'data-range-preset="custom"']) {
  assert(!html.includes(legacy), `Legacy Home preset remains: ${legacy}`);
}
assert(app.includes("preset === '2w'"), '2W dynamic preset handler missing');
assert(app.includes("preset === '4w-mid'"), '4W mid-month dynamic preset handler missing');
assert(app.includes("preset === '4w-end'"), '4W month-end dynamic preset handler missing');
assert(app.includes("label: 'รอบจ่าย 2W'"), 'Home payment-cycle indicator missing');
assert(app.includes("label: 'รอบจ่ายกลางเดือน'"), 'Mid-month payment-cycle definition missing');
assert(app.includes("label: 'รอบจ่ายสิ้นเดือน'"), 'Month-end payment-cycle definition missing');

for (const definition of ['26(M-1) – 25(M0)', '11(M-1) – 25(M-1)', '26(M-1) – 10(M0)']) {
  assert(html.includes(definition), `Payment overview definition missing: ${definition}`);
}
for (const legacy of ['payday15', 'monthEnd', 'paymentDetailVehicle', 'paymentVehicleSwitch']) {
  assert(!app.includes(legacy) && !html.includes(legacy), `Legacy payment implementation remains: ${legacy}`);
}

assert(count(html, 'id="profile-contact"') === 1, 'Duplicate Contact Developer menu detected');
assert(!html.includes('Feedback') && !html.includes('ติชม'), 'Separate Feedback menu must not be added');
assert(html.includes('src="tbs_banner.png"'), 'Settings must use the new Banner Master');
assert(build.includes("'tbs_banner.png'"), 'Build asset list must include tbs_banner.png');
assert(!build.includes("'tbs_banner.jpg'"), 'Retired tbs_banner.jpg remains in build asset list');
assert(!fs.existsSync(path.join(root, 'tbs_banner.jpg')), 'Retired source banner still exists');
assert(fs.existsSync(bannerPath), 'New Banner Master is missing');
const banner = fs.readFileSync(bannerPath);
assert(banner.readUInt32BE(0) === 0x89504e47, 'Banner is not a PNG');
assert(banner.readUInt32BE(16) === 1200 && banner.readUInt32BE(20) === 400, 'Banner dimensions must remain 1200x400');
assert(css.includes('.settings-footer.card img') && css.includes('object-fit:contain'), 'Banner must preserve full artwork without cover cropping');

console.log('Update contract PASS: Home presets, dynamic payment definitions, Payment Details, Banner, and menu scope.');
console.log('Runtime Android checks: MANUAL REQUIRED (keyboard, scroll, Back, Edge Swipe, camera, permission).');
console.log('Upgrade/Fresh Install checks: MANUAL REQUIRED on a disposable Android device; do not clear data before Upgrade test.');
