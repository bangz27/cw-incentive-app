const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('all purchase/contact actions use the exact LINE OA URL and external opener', () => {
  const html = read('index.html');
  const manager = read('license-manager.js');
  assert.equal((html.match(/data-line-contact/g) || []).length, 5);
  assert.match(manager, /https:\/\/lin\.ee\/7WsyQ6W/);
  assert.match(manager, /global\.open\?\./);
  assert.match(manager, /global\.location\?\.assign\?\./);
});

test('lifetime pricing and LINE actions have dedicated UI classes without changing prices', () => {
  const html = read('index.html');
  const css = read('style.css');
  assert.match(html, /pricing-card-lifetime/);
  assert.match(html, /79 บาท/);
  assert.match(html, /49 บาท/);
  assert.match(css, /pricing-card-lifetime/);
  assert.match(css, /#16A34A/);
  assert.match(css, /#BBF7D0/);
  assert.match(css, /#06C755/);
});

test('active dot is shown only when the server-reported status is ACTIVE', () => {
  const html = read('index.html');
  const manager = read('license-manager.js');
  assert.match(html, /data-license-active-dot/);
  assert.match(html, /status-dot status-active hidden/);
  assert.match(manager, /status !== STATUSES\.ACTIVE/);
  assert.match(manager, /activeDot\?\.classList\.toggle\('hidden'/);
});

test('expired renewal message is shown only for EXPIRED status', () => {
  const html = read('index.html');
  const manager = read('license-manager.js');
  assert.match(html, /id="expired-renewal-message"[^>]*class="expired-renewal-message hidden"/);
  assert.match(html, /หมดอายุแล้ว ต่ออายุเหอะ เพื่อผู้พัฒนา ❤️/);
  assert.match(manager, /renewalMessage\?\.classList\.toggle\('hidden', status !== STATUSES\.EXPIRED\)/);
  assert.doesNotMatch(manager, /renewalMessage.*STATUSES\.ACTIVE/);
  assert.doesNotMatch(manager, /renewalMessage.*STATUSES\.SUSPENDED/);
});
