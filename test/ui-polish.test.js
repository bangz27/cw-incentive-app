const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const homeDashboard = fs.readFileSync('home-dashboard.js', 'utf8');
const calculator = fs.readFileSync('calculator.js', 'utf8');
const history = fs.readFileSync('history.js', 'utf8');

test('V1.8.1 UI polish keeps dashboard hierarchy and responsive presentation', () => {
  assert.match(html, /home-metric-grid/);
  assert.match(html, /id="home-net"/);
  assert.match(html, /id="home-trend-chart"/);
  assert.match(html, /id="home-recent"/);
  assert.match(html, /id="btn-calculate"/);
  assert.match(html, /id="history-search"/);
  assert.match(css, /--color-primary:#FF4B4B/);
  assert.match(css, /--bg:#FFE14A/);
  assert.match(html, /แดชบอร์ดรายได้/);
  assert.match(html, /รายได้ 7 วัน/);
  assert.match(html, /กิจกรรมล่าสุด/);
  assert.doesNotMatch(html, /Income Dashboard|7-Day Income|Recent Activity/);
  assert.match(css, /home-metric-grid/);
  assert.match(css, /home-chart-slot/);
  assert.match(css, /history-search/);
});

test('Home chart is presentation-only and reads normalized records without calculation changes', () => {
  assert.match(homeDashboard, /CWRecordModel\.readRecords/);
  assert.match(homeDashboard, /netIncentive/);
  assert.match(homeDashboard, /lastSevenKeys/);
  assert.doesNotMatch(homeDashboard, /calculate2W|calculate4W|sameAddressDeduction\s*=/);
});

test('Calculator and History controls are wired without changing their data engines', () => {
  assert.match(calculator, /btn-calculate.*addEventListener/);
  assert.match(history, /history-search/);
  assert.match(history, /readRecords\(userStorage\(\)\)/);
});
