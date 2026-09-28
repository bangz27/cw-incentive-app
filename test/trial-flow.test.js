const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function createManager(sequence) {
  const values = new Map();
  const nodes = new Map();
  const node = () => ({ classList: { toggle() {}, add() {}, remove() {} }, textContent: '', dataset: {}, focus() {}, querySelector() { return null; }, addEventListener() {} });
  const document = {
    addEventListener() {},
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); },
    querySelectorAll() { return []; },
    documentElement: { classList: { toggle() {} } }
  };
  const window = {
    document,
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    addEventListener() {},
    dispatchEvent() {},
    TBSUserStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key)
    },
    TBSSupabaseAuth: {
      getUser: () => ({ id: 'account-1', email: 'user@example.com' }),
      getClient: () => ({ rpc: async name => sequence.shift() || { data: null, error: new Error(`unexpected ${name}`) } })
    },
    TBSShowToast() {}
  };
  const context = vm.createContext({ window, document, CustomEvent: window.CustomEvent });
  vm.runInContext(read('license-manager.js'), context);
  return window.TBSLicenseManager;
}

test('Package Selection is persistent after auth and does not auto-start Trial', () => {
  const html = read('index.html');
  const auth = read('supabase-auth.js');
  const manager = read('license-manager.js');
  assert.match(html, /data-package-selection/);
  assert.match(html, /id="package-gate-title"/);
  assert.match(html, /ยังไม่มีแพ็กเกจที่ใช้งานอยู่/);
  assert.match(html, /id="start-trial-button"[^>]*data-start-trial/);
  assert.match(html, /id="trial-confirm-dialog"/);
  assert.match(auth, /TBSLicenseManager\?\.loadLicense/);
  assert.doesNotMatch(auth, /TBSLicenseManager\?\.startTrial/);
  assert.match(manager, /if \(!serverLicense\)/);
  assert.match(manager, /canStartTrial/);
});

test('Trial activation is account-bound, server-side, one-time, and 14 days', () => {
  const sql = read('supabase/migrations/20260928220000_persistent_trial_activation.sql');
  assert.match(sql, /trial_started_at timestamptz/);
  assert.match(sql, /trial_ends_at timestamptz/);
  assert.match(sql, /trial_used_at timestamptz/);
  assert.match(sql, /create or replace function public\.start_my_trial\(\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /current_user_id uuid := auth\.uid\(\)/);
  assert.match(sql, /new_expires := new_started \+ interval '14 days'/);
  assert.match(sql, /trial already used/);
  assert.match(sql, /for update/);
  assert.match(sql, /grant execute on function public\.start_my_trial\(\) to authenticated/);
  assert.match(sql, /remaining_hours integer/);
  assert.match(sql, /server_now timestamptz/);
});

test('New account with no license can see Trial but cannot bypass confirmation state', async () => {
  const manager = createManager([
    { data: [], error: null },
    { data: [{ user_id: 'account-1', plan: 'TRIAL', status: 'ACTIVE', started_at: '2026-09-28T10:00:00Z', expires_at: '2026-10-12T10:00:00Z', remaining_days: 14, remaining_hours: 336, trial_used: true, is_active: true }], error: null }
  ]);
  await manager.loadLicense();
  assert.equal(manager.getLicense(), null);
  assert.equal(manager.getTrialState(), 'AVAILABLE');
  assert.equal(manager.canStartTrial(), true);
  const trial = await manager.startTrial();
  assert.equal(trial.plan, 'TRIAL');
  assert.equal(manager.canUseApp(), true);
  assert.equal(manager.canStartTrial(), false);
});

test('Lifetime account hides Trial and existing/expired Trial cannot be reused', async () => {
  const lifetime = createManager([{ data: [{ user_id: 'account-1', plan: 'LIFETIME', status: 'ACTIVE', remaining_days: null, remaining_hours: null, trial_used: false, is_active: true }], error: null }]);
  await lifetime.loadLicense();
  assert.equal(lifetime.getTrialState(), 'LIFETIME');
  assert.equal(lifetime.canStartTrial(), false);

  const expired = createManager([{ data: [{ user_id: 'account-1', plan: 'TRIAL', status: 'EXPIRED', expires_at: '2026-09-27T10:00:00Z', remaining_days: 0, remaining_hours: 0, trial_used: true, is_active: false }], error: null }]);
  await expired.loadLicense();
  assert.equal(expired.getTrialState(), 'USED');
  assert.equal(expired.canStartTrial(), false);
});

test('Trial countdown uses backend remaining hours when under 24 hours', async () => {
  const manager = createManager([{ data: [{ user_id: 'account-1', plan: 'TRIAL', status: 'ACTIVE', expires_at: '2026-09-29T04:00:00Z', remaining_days: 1, remaining_hours: 18, trial_used: true, is_active: true }], error: null }]);
  await manager.loadLicense();
  assert.equal(manager.getRemainingHours(), 18);
  assert.match(manager.statusText(), /18 ชั่วโมง/);
  assert.doesNotMatch(manager.statusText(), /18 วัน/);
});

test('LocalStorage/cache cannot create a new Trial without an online backend response', async () => {
  const manager = createManager([{ data: null, error: new Error('offline') }]);
  await manager.loadLicense();
  assert.equal(manager.canStartTrial(), false);
  assert.equal(manager.getTrialState(), 'AVAILABLE');
  assert.doesNotMatch(read('license-manager.js'), /Date\.now\(/);
});
