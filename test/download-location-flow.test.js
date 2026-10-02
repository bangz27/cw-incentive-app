const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('download tracking is click-gated and does not write on GET/HEAD', () => {
  const source = read('supabase/functions/tbs-download-v15/index.ts');
  assert.match(source, /req\.method === "GET"/);
  assert.match(source, /req\.method === "HEAD"/);
  assert.match(source, /button\.addEventListener\("click"/);
  assert.match(source, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(source, /method: "POST"/);
  assert.match(source, /download_id/);
});

test('download tracking records permission outcomes and persists validated browser GPS coordinates', () => {
  const source = read('supabase/functions/tbs-download-v15/index.ts');
  assert.match(source, /granted.*denied.*timeout.*unavailable/s);
  assert.match(source, /location_permission: permission/);
  const eventBlock = source.match(/db\.from\("qr_scan_events"\)\.upsert\(([\s\S]*?)\}, \{ onConflict: "download_id"/)?.[1] || '';
  assert.match(source, /const gpsLatitude = permission === "granted" \? Number\(latitude\) : null/);
  assert.match(source, /const gpsLongitude = permission === "granted" \? Number\(longitude\) : null/);
  assert.match(eventBlock, /latitude:\s*gpsLatitude/);
  assert.match(eventBlock, /longitude:\s*gpsLongitude/);
});

test('server-side reverse geocoding follows Nominatim policy basics', () => {
  const source = read('supabase/functions/tbs-download-v15/index.ts');
  assert.match(source, /nominatim\.openstreetmap\.org\/reverse/);
  assert.match(source, /User-Agent/);
  assert.match(source, /Referer/);
  assert.match(source, /toFixed\(3\)/);
  assert.match(source, /qr_reverse_geocode_cache/);
  assert.match(source, /OpenStreetMap contributors/);
});

test('schema keeps old event rows compatible and adds idempotent location metadata', () => {
  const migration = read('supabase/migrations/20261002153000_browser_download_location.sql');
  for (const column of ['download_id', 'apk_version', 'download_source', 'location_permission', 'province', 'district', 'subdistrict']) {
    assert.match(migration, new RegExp(`add column if not exists ${column}`));
  }
  assert.match(migration, /qr_scan_events_download_id_uidx/);
  assert.match(migration, /qr_reverse_geocode_cache/);
  assert.match(migration, /enable row level security/);
});

test('dashboard exposes GPS, area, source/platform fields and newest-first ordering', () => {
  const dashboard = read('supabase/functions/tbs-download-dashboard/index.ts');
  assert.match(dashboard, /province,district,subdistrict/);
  assert.match(dashboard, /row\.province \|\| row\.region/);
  assert.match(dashboard, /row\.district \|\| row\.city/);
  assert.match(dashboard, /subdistrict/);
  assert.match(dashboard, /latitude: row\.latitude/);
  assert.match(dashboard, /longitude: row\.longitude/);
  assert.match(dashboard, /source: row\.download_source/);
  assert.match(dashboard, /platform: deviceOf\(row\.user_agent\)/);
  assert.match(dashboard, /order.*scanned_at\.desc/s);
  assert.match(dashboard, /\.sort\(\(left: any, right: any\)/);
});
