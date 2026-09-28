const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createManager({ license, online = true } = {}) {
  const values = new Map();
  const nodes = new Map();
  const document = {
    addEventListener() {},
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, { classList: { toggle() {} }, textContent: '', dataset: {} }); return nodes.get(id); },
    querySelectorAll() { return []; }
  };
  const window = {
    document,
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    addEventListener() {},
    dispatchEvent() {},
    TBSUserStorage: { getItem: key => values.get(`tbs:${key}`) ?? null, setItem: (key, value) => values.set(`tbs:${key}`, String(value)) },
    TBSSupabaseAuth: {
      getUser: () => ({ id: license?.user_id || 'user-1' }),
      getClient: () => ({ rpc: async () => online ? { data: [license], error: null } : { data: null, error: new Error('offline') } })
    }
  };
  const context = vm.createContext({ window, document, CustomEvent: window.CustomEvent });
  vm.runInContext(fs.readFileSync('license-manager.js', 'utf8'), context);
  return window.TBSLicenseManager;
}

test('TRIAL 14 days is active and exposes required manager API', async () => {
  const manager = createManager({ license: { plan: 'TRIAL', status: 'ACTIVE', started_at: '2026-09-28T08:00:00Z', expires_at: '2026-10-12T08:00:00Z', remaining_days: 14, is_active: true } });
  await manager.loadLicense();
  assert.equal(manager.getPlan(), 'TRIAL');
  assert.equal(manager.getStatus(), 'ACTIVE');
  assert.equal(manager.isActive(), true);
  assert.equal(manager.canUseApp(), true);
  assert.ok(manager.getRemainingDays() >= 13 && manager.getRemainingDays() <= 14);
});

test('expired trial is locked and lifetime never expires', async () => {
  const expired = createManager({ license: { plan: 'TRIAL', status: 'EXPIRED', expires_at: '2026-09-27T08:00:00Z', remaining_days: 0, is_active: false } });
  await expired.loadLicense();
  assert.equal(expired.getStatus(), 'EXPIRED');
  assert.equal(expired.canUseApp(), false);

  const lifetime = createManager({ license: { plan: 'LIFETIME', status: 'ACTIVE', expires_at: null, remaining_days: null, is_active: true } });
  await lifetime.loadLicense();
  assert.equal(lifetime.getStatus(), 'ACTIVE');
  assert.equal(lifetime.getRemainingDays(), null);
  assert.equal(lifetime.canUseApp(), true);
});

test('monthly active plan unlocks and suspended plan locks', async () => {
  const monthly = createManager({ license: { plan: 'MONTHLY', status: 'ACTIVE', expires_at: '2026-10-28T08:00:00Z', remaining_days: 30, is_active: true } });
  await monthly.loadLicense();
  assert.equal(monthly.canUseApp(), true);

  const suspended = createManager({ license: { plan: 'MONTHLY', status: 'SUSPENDED', expires_at: '2026-10-28T08:00:00Z', remaining_days: 30, is_active: false } });
  await suspended.loadLicense();
  assert.equal(suspended.getStatus(), 'SUSPENDED');
  assert.equal(suspended.canUseApp(), false);
});

test('offline cache can be used for temporary UX without creating a new license', async () => {
  const manager = createManager({ license: { plan: 'TRIAL', status: 'ACTIVE', expires_at: '2026-09-29T08:00:00Z', remaining_days: 1, is_active: true } });
  await manager.loadLicense();
  const state = manager.getState();
  assert.equal(state.online, true);
  assert.equal(manager.getLicense().user_id, 'user-1');
});

test('license access decisions do not use device Date.now', () => {
  const source = fs.readFileSync('license-manager.js', 'utf8');
  assert.doesNotMatch(source, /Date\.now\(/);
  assert.match(source, /rpc\('get_my_license_status'\)/);
  assert.match(source, /remaining_days/);
  assert.match(source, /is_active/);
});
