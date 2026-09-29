const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const analytics = require('../license-center/download-analytics.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Download Analytics normalizes metrics and never exposes raw IP fields', () => {
  const data = analytics.normalizePayload({
    total_scans: 12,
    today_scans: 2,
    week_scans: 8,
    month_scans: 12,
    locations: [{ city: 'Bangkok', country: 'Thailand', count: 7, ip: '203.0.113.10' }],
    events: [{ created_at: '2026-09-29T03:00:00Z', city: 'Bangkok', campaign: 'poster', device: 'Android', ip_address: '203.0.113.10' }]
  });
  assert.equal(data.totalScans, 12);
  assert.equal(data.locations[0].city, 'Bangkok');
  assert.equal(data.locations[0].count, 7);
  assert.equal(Object.hasOwn(data.locations[0], 'ip'), false);
  assert.equal(Object.hasOwn(data.events[0], 'ip_address'), false);
  assert.doesNotMatch(analytics.eventsToCsv(data.events), /203\.0\.113\.10/);
});

test('Download Analytics API sends the Supabase access token as Bearer JWT', async () => {
  let request;
  const api = analytics.createApi({
    apiUrl: 'https://example.test/functions/v1/tbs-download-dashboard',
    publishableKey: 'sb_publishable_test',
    getAccessToken: async () => 'jwt-owner-token',
    fetchImpl: async (url, options) => {
      request = { url: String(url), options };
      return { ok: true, status: 200, json: async () => ({ total_scans: 1 }) };
    }
  });
  await api.fetchDashboard({ range: '30d', device: 'Android', campaign: 'poster', search: 'Bangkok' });
  assert.match(request.url, /range=30d/);
  assert.match(request.url, /device=Android/);
  assert.match(request.url, /campaign=poster/);
  assert.match(request.url, /search=Bangkok/);
  assert.equal(request.options.headers.Authorization, 'Bearer jwt-owner-token');
  assert.equal(request.options.headers.apikey, 'sb_publishable_test');
});

test('Download Analytics rejects requests without an authenticated session token', async () => {
  const api = analytics.createApi({ getAccessToken: async () => '' });
  await assert.rejects(() => api.fetchDashboard(), /SESSION_REQUIRED/);
});

test('Download Analytics filters by device, campaign and search text', () => {
  const data = analytics.normalizePayload({
    events: [
      { created_at: new Date().toISOString(), city: 'Bangkok', campaign: 'poster', device: 'Android' },
      { created_at: new Date().toISOString(), city: 'Chiang Mai', campaign: 'line', device: 'iOS' }
    ]
  });
  const filtered = analytics.filterData(data, { range: '90d', device: 'Android', campaign: 'poster', search: 'bangkok' });
  assert.equal(filtered.events.length, 1);
  assert.equal(filtered.events[0].city, 'Bangkok');
});

test('License Center wires analytics page, owner session and protected endpoint', () => {
  const html = read('license-center/index.html');
  const app = read('license-center/app.js');
  const api = read('license-center/download-analytics.js');
  const ui = read('license-center/download-analytics-ui.js');
  const edge = read('supabase/functions/tbs-download-dashboard/index.ts');
  assert.match(html, /data-page="analytics"/);
  assert.match(html, /id="pageAnalytics"/);
  assert.match(html, /download-analytics-ui\.js/);
  assert.match(app, /owner_is_current_user/);
  assert.doesNotMatch(app, /ownerUid|97a8b8ef-53f4-422b-abf0-39247036a072/);
  assert.match(app, /TBSDownloadAnalyticsUI/);
  assert.match(api, /tbs-download-dashboard/);
  assert.match(api, /Authorization: `Bearer \$\{token\}`/);
  assert.match(ui, /core\.POLL_MS/);
  assert.doesNotMatch(ui, /JSON\.stringify\([^)]*row/);
  assert.match(edge, /admin\.auth\.getUser\(token\)/);
  assert.match(edge, /userDb\.rpc\("owner_is_current_user"\)/);
  assert.match(edge, /Owner access required/);
  assert.match(edge, /return json\(\{ error: "Unauthorized" \}, 401\)/);
  assert.match(edge, /Owner authorization unavailable/);
  assert.doesNotMatch(edge, /authenticated_user_id/);
});
