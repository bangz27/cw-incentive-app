const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Help Center is a card-based searchable guide with required customer topics', () => {
  const html = read('index.html');
  const controller = read('help-center.js');
  const build = read('scripts/build-web.cjs');
  assert.match(html, /id="view-guide" class="view-section settings-view help-center-view"/);
  assert.match(html, /id="help-search" type="search"/);
  assert.match(html, /id="help-search-clear"/);
  assert.match(html, /data-help-title="วิธีคำนวณ Incentive 2W"/);
  assert.match(html, /data-help-title="วิธีคำนวณ Incentive 4W"/);
  assert.match(html, /data-help-title="License สิทธิ์การใช้งาน"/);
  assert.match(html, /data-help-title="FAQ คำถามที่พบบ่อย"/);
  assert.match(html, /data-line-contact/);
  assert.match(html, /data-help-keywords=/);
  assert.match(controller, /haystack\.includes\(query\)/);
  assert.match(controller, /help-search-clear/);
  assert.match(build, /'help-center\.js'/);
});

test('Help Center search covers title, description and keywords without fake screenshots', () => {
  const html = read('index.html');
  const controller = read('help-center.js');
  assert.match(html, /data-help-description=/);
  assert.match(html, /data-help-keywords=/);
  assert.match(html, /help-steps/);
  assert.match(html, /help-flow/);
  assert.match(html, /help-faq/);
  assert.doesNotMatch(html, /screenshot|ปลอม/i);
  assert.match(controller, /classList\.toggle\('hidden', !match\)/);
});
