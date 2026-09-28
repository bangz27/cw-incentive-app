const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('owner console uses server-side RPCs and does not expose a client-side owner allowlist', () => {
  const source = read('owner-console.js');
  assert.match(source, /owner_is_current_user/);
  assert.match(source, /owner_search_license_users/);
  assert.match(source, /owner_grant_monthly/);
  assert.match(source, /owner_grant_lifetime/);
  assert.match(source, /owner_grant_custom/);
  assert.match(source, /p_duration_days/);
  assert.match(source, /owner_get_license_audit_v2/);
  assert.match(source, /owner_suspend_license/);
  assert.match(source, /owner_activate_license/);
  assert.doesNotMatch(source, /97a8b8ef-53f4-422b-abf0-39247036a072/);
  assert.doesNotMatch(source, /app_licenses/);
});

test('owner console is packaged and protected by the existing license gate', () => {
  const html = read('index.html');
  const build = read('scripts/build-web.cjs');
  const gate = read('license-manager.js');
  assert.match(html, /id="view-owner-console"/);
  assert.match(html, /src="owner-console\.js"/);
  assert.match(build, /'owner-console\.js'/);
  assert.match(gate, /view-owner-console/);
});

test('owner migration binds the single owner UID and keeps audit tables inaccessible to clients', () => {
  const sql = read('supabase/migrations/20260928170200_owner_license_console.sql');
  assert.match(sql, /97a8b8ef-53f4-422b-abf0-39247036a072/);
  assert.match(sql, /alter table public\.license_console_owners enable row level security/);
  assert.match(sql, /alter table public\.license_audit_log enable row level security/);
  assert.match(sql, /revoke all on table public\.license_audit_log from anon, authenticated/);
  assert.match(sql, /using errcode = '42501'/);
  assert.match(sql, /security definer/);
});

test('custom duration accepts only integer days from 1 through 3650 and uses server time', () => {
  const source = read('owner-console.js');
  const sql = read('supabase/migrations/20260928184000_owner_custom_license.sql');
  const html = read('index.html');
  assert.match(html, /id="owner-custom-card" class="card owner-console-card hidden"/);
  assert.match(html, /id="owner-custom-duration" type="number"[^>]*min="1" max="3650" step="1"/);
  assert.match(source, /!\/\^\\d\+\$\/.test\(raw\)/);
  assert.match(source, /days < 1 \|\| days > 3650/);
  assert.match(sql, /p_duration_days integer/);
  assert.match(sql, /new_started := now\(\)/);
  assert.match(sql, /make_interval\(days => p_duration_days\)/);
  assert.match(sql, /'GRANT_CUSTOM'/);
  assert.match(sql, /duration_days/);
});

test('owner password control has eye toggle, strong-password validation, and no persistence/logging', () => {
  const html = read('index.html');
  const source = read('owner-console.js');
  assert.match(html, /id="owner-new-password" type="password"/);
  assert.match(html, /id="owner-password-toggle"[^>]*aria-label=/);
  assert.match(source, /input\.type === 'text'/);
  assert.match(source, /updateUser\(\{ password \}\)/);
  assert.match(source, /if \(input\) input\.value = ''/);
  assert.doesNotMatch(source, /console\.log\(.*password/i);
  assert.doesNotMatch(source, /localStorage.*password/i);
});
