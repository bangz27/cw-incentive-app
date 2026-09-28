const test = require('node:test');
const assert = require('node:assert/strict');
const checker = require('../update-checker');

function storageMock() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

function response(payload, ok = true, status = 200) {
  return { ok, status, json: async () => payload };
}

const release = (overrides = {}) => ({
  tag_name: 'v1.10.0',
  name: 'TBS Incentive V1.10.0',
  body: '- ปรับปรุงระบบ',
  html_url: 'https://github.com/bangz27/cw-incentive-app/releases/tag/v1.10.0',
  assets: [{ name: 'TBS-Incentive-v1.10.0.apk', browser_download_url: 'https://github.com/bangz27/cw-incentive-app/releases/download/v1.10.0/TBS-Incentive-v1.10.0.apk' }],
  ...overrides
});

test('version comparison uses numeric SemVer ordering', () => {
  assert.equal(checker.compareVersions('1.10.0', '1.9.0'), 1);
  assert.equal(checker.compareVersions('1.9.1', '1.9.0'), 1);
  assert.equal(checker.compareVersions('1.9.0', '1.9.0'), 0);
  assert.equal(checker.compareVersions('1.8.9', '1.9.0'), -1);
  assert.equal(checker.isNewerVersion('v1.10', '1.9.0'), true);
});

test('current version equal to latest does not request an update', async () => {
  const result = await checker.createChecker({
    currentVersion: '1.10.0',
    storage: storageMock(),
    fetchImpl: async () => response(release())
  }).check({ manual: true });
  assert.equal(result.status, 'latest');
});

test('current version lower than latest reports update available', async () => {
  const result = await checker.createChecker({
    currentVersion: '1.9.0',
    storage: storageMock(),
    fetchImpl: async () => response(release())
  }).check({ manual: true });
  assert.equal(result.status, 'update-available');
  assert.equal(result.release.apkUrl.endsWith('.apk'), true);
  assert.equal(result.release.body, '- ปรับปรุงระบบ');
});

test('current version higher than latest does not report an update', async () => {
  const result = await checker.createChecker({
    currentVersion: '1.11.0',
    storage: storageMock(),
    fetchImpl: async () => response(release())
  }).check({ manual: true });
  assert.equal(result.status, 'ahead');
});

test('GitHub API error is converted to a non-throwing error status', async () => {
  const result = await checker.createChecker({
    storage: storageMock(),
    fetchImpl: async () => response({}, false, 503)
  }).check({ manual: true });
  assert.equal(result.status, 'error');
  assert.ok(result.error instanceof Error);
});

test('offline check does not call the API and remains non-blocking', async () => {
  let calls = 0;
  const result = await checker.createChecker({
    storage: storageMock(),
    fetchImpl: async () => { calls += 1; return response(release()); }
  }).check({ manual: true, online: false });
  assert.equal(result.status, 'offline');
  assert.equal(calls, 0);
});

test('invalid release data does not crash the app', async () => {
  const result = await checker.createChecker({
    storage: storageMock(),
    fetchImpl: async () => response({ tag_name: 'not-a-version', assets: [] })
  }).check({ manual: true });
  assert.equal(result.status, 'error');
});

test('automatic checks respect cooldown while manual checks bypass it', async () => {
  const storage = storageMock();
  let now = 1000;
  let calls = 0;
  const instance = checker.createChecker({
    currentVersion: '1.9.0',
    storage,
    now: () => now,
    cooldownMs: 10000,
    fetchImpl: async () => { calls += 1; return response(release()); }
  });
  const first = await instance.check();
  const automatic = await instance.check();
  const manual = await instance.check({ manual: true });
  assert.equal(first.status, 'update-available');
  assert.equal(automatic.status, 'update-available');
  assert.equal(automatic.fromCache, true);
  assert.equal(manual.status, 'update-available');
  assert.equal(calls, 2);
  now += 10001;
});

test('release notes and release URL are taken from the actual release payload', () => {
  const normalized = checker.normalizeRelease(release({ body: 'REAL NOTES', name: 'Actual release' }));
  assert.equal(normalized.name, 'Actual release');
  assert.equal(normalized.body, 'REAL NOTES');
  assert.match(normalized.htmlUrl, /releases\/tag\/v1\.10\.0/);
});
