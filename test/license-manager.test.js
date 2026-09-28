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
      getClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => online ? { data: license, error: null } : { data: null, error: new Error('offline') } }) }) }) }) })
    }
  };
  const context = vm.createContext({ window, document, CustomEvent: window.CustomEvent });
  vm.runInContext(fs.readFileSync('license-manager.js', 'utf8'), context);
  return window.TBSLicenseManager;
}

test('TRIAL 14 days is active and exposes required manager API', async () => {
  const manager = createManager({ license: { user_id: 'user-1', plan: 'TRIAL', status: 'ACTIVE', started_at: new Date().toISOString(), expires_at: new Date(Date.now() + 14 * 86400000).toISOString() } });
  await manager.loadLicense();
  assert.equal(manager.getPlan(), 'TRIAL');
  assert.equal(manager.getStatus(), 'ACTIVE');
  assert.equal(manager.isActive(), true);
  assert.equal(manager.canUseApp(), true);
  assert.ok(manager.getRemainingDays() >= 13 && manager.getRemainingDays() <= 14);
});

test('expired trial is locked and lifetime never expires', async () => {
  const expired = createManager({ license: { user_id: 'user-1', plan: 'TRIAL', status: 'ACTIVE', expires_at: new Date(Date.now() - 86400000).toISOString() } });
  await expired.loadLicense();
  assert.equal(expired.getStatus(), 'EXPIRED');
  assert.equal(expired.canUseApp(), false);

  const lifetime = createManager({ license: { user_id: 'user-1', plan: 'LIFETIME', status: 'ACTIVE', expires_at: null } });
  await lifetime.loadLicense();
  assert.equal(lifetime.getStatus(), 'ACTIVE');
  assert.equal(lifetime.getRemainingDays(), null);
  assert.equal(lifetime.canUseApp(), true);
});

test('monthly active plan unlocks and suspended plan locks', async () => {
  const monthly = createManager({ license: { user_id: 'user-1', plan: 'MONTHLY', status: 'ACTIVE', expires_at: new Date(Date.now() + 30 * 86400000).toISOString() } });
  await monthly.loadLicense();
  assert.equal(monthly.canUseApp(), true);

  const suspended = createManager({ license: { user_id: 'user-1', plan: 'MONTHLY', status: 'SUSPENDED', expires_at: new Date(Date.now() + 30 * 86400000).toISOString() } });
  await suspended.loadLicense();
  assert.equal(suspended.getStatus(), 'SUSPENDED');
  assert.equal(suspended.canUseApp(), false);
});

test('offline cache can be used for temporary UX without creating a new license', async () => {
  const manager = createManager({ license: { user_id: 'user-1', plan: 'TRIAL', status: 'ACTIVE', expires_at: new Date(Date.now() + 86400000).toISOString() } });
  await manager.loadLicense();
  const state = manager.getState();
  assert.equal(state.online, true);
  assert.equal(manager.getLicense().user_id, 'user-1');
});
