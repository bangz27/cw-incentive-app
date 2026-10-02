(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TBSDownloadAnalytics = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  'use strict';

  const API_URL = 'https://cqzuhwzvxrmlezfkbpwv.supabase.co/functions/v1/tbs-download-dashboard';
  const POLL_MS = 10000;
  const RANGE_MS = { '24h': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000, '30d': 30 * 24 * 60 * 60 * 1000, '90d': 90 * 24 * 60 * 60 * 1000 };
  const NUMBER_KEYS = ['count', 'total', 'scans', 'downloads', 'value', 'events', 'download_count', 'scan_count'];
  const THAILAND_TIME_ZONE = 'Asia/Bangkok';

  function asRows(value) {
    if (Array.isArray(value)) return value.filter(row => row && typeof row === 'object');
    if (value && typeof value === 'object') {
      if (Array.isArray(value.data)) return asRows(value.data);
      return Object.entries(value).map(([label, row]) => {
        if (row && typeof row === 'object') return { label, ...row };
        return { label, count: row };
      });
    }
    return [];
  }

  function read(row, keys) {
    for (const key of keys) {
      const parts = key.split('.');
      let value = row;
      for (const part of parts) value = value && typeof value === 'object' ? value[part] : undefined;
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return '';
  }

  function text(value) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return '';
    return String(value).trim();
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function rowCount(row) {
    for (const key of NUMBER_KEYS) {
      const value = number(read(row, [key]));
      if (value > 0) return value;
    }
    return 1;
  }

  function normalizeRow(row, kind) {
    const location = read(row, ['location', 'geo', 'geolocation']);
    const source = location && typeof location === 'object' ? { ...row, ...location } : row;
    const country = text(read(source, ['country', 'country_name', 'countryName']));
    const province = text(read(source, ['province', 'region', 'state', 'region_name']));
    const district = text(read(source, ['district', 'amphoe', 'city_district', 'county']));
    const subdistrict = text(read(source, ['subdistrict', 'tambon', 'suburb', 'village']));
    const city = text(read(source, ['city', 'city_name', 'town'])) || district;
    const campaign = text(read(row, ['campaign', 'campaign_name', 'campaignName', 'source']));
    const device = text(read(row, ['device', 'device_type', 'deviceType', 'platform', 'user_device']));
    const label = text(read(row, kind === 'device' ? ['device', 'device_type', 'deviceType', 'platform', 'name', 'label'] : kind === 'campaign' ? ['campaign', 'campaign_name', 'campaignName', 'name', 'label'] : ['label', 'name', 'subdistrict', 'district', 'city', 'province', 'country'])) || subdistrict || district || city || province || country || 'ไม่ระบุ';
    const timestamp = text(read(row, ['created_at', 'timestamp', 'scanned_at', 'date', 'datetime', 'time', 'occurred_at']));
    const rawLatitude = read(source, ['latitude', 'lat']);
    const rawLongitude = read(source, ['longitude', 'lng', 'lon']);
    const latitude = rawLatitude === '' ? null : number(rawLatitude);
    const longitude = rawLongitude === '' ? null : number(rawLongitude);
    return Object.freeze({
      label,
      count: rowCount(row),
      campaign,
      device,
      country,
      province,
      district,
      subdistrict,
      city,
      locationPermission: text(read(row, ['location_permission', 'permission'])),
      downloadSource: text(read(row, ['download_source', 'source'])),
      source: text(read(row, ['source', 'download_source'])),
      apkVersion: text(read(row, ['apk_version', 'version'])),
      platform: device,
      timestamp,
      latitude,
      longitude,
      kind
    });
  }

  function normalizeRows(value, kind) {
    return asRows(value).map(row => normalizeRow(row, kind));
  }

  function metric(source, keys) {
    return number(read(source, keys));
  }

  function normalizePayload(payload) {
    const source = payload && payload.data && !Array.isArray(payload.data) ? payload.data : (payload || {});
    return Object.freeze({
      totalScans: metric(source, ['total_scans', 'total_downloads', 'total']),
      todayScans: metric(source, ['today_scans', 'today_downloads', 'today']),
      weekScans: metric(source, ['week_scans', 'seven_day_scans', 'week']),
      monthScans: metric(source, ['month_scans', 'thirty_day_scans', 'month']),
      locations: normalizeRows(source.locations, 'location'),
      campaigns: normalizeRows(source.campaigns, 'campaign'),
      devices: normalizeRows(source.devices, 'device'),
      timeline: normalizeRows(source.timeline, 'timeline'),
      events: normalizeRows(source.events, 'event'),
      fetchedAt: new Date().toISOString()
    });
  }

  function rowSearchText(row) {
    return [row.label, row.campaign, row.device, row.country, row.province, row.district, row.subdistrict, row.city].join(' ').toLowerCase();
  }

  function matches(row, filters, start) {
    if (filters.device && row.device && row.device !== filters.device) return false;
    if (filters.campaign && row.campaign && row.campaign !== filters.campaign) return false;
    if (filters.search && !rowSearchText(row).includes(filters.search.toLowerCase())) return false;
    if (start && row.timestamp) {
      const time = Date.parse(row.timestamp);
      if (Number.isFinite(time) && time < start) return false;
    }
    return true;
  }

  function filterData(data, filters = {}) {
    const range = filters.range || '7d';
    const start = RANGE_MS[range] ? Date.now() - RANGE_MS[range] : 0;
    const filter = rows => (data?.[rows] || []).filter(row => matches(row, filters, start));
    return {
      locations: filter('locations'),
      campaigns: filter('campaigns'),
      devices: filter('devices'),
      timeline: filter('timeline'),
      events: filter('events')
    };
  }

  function uniqueLabels(rows) {
    return [...new Set((rows || []).map(row => row.label).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function formatThailandDateTime(value) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return '—';
    const parts = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
      timeZone: THAILAND_TIME_ZONE,
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `📅 ${values.day}-${values.month}-${values.year} 🕟 ${values.hour}:${values.minute} 🇹🇭`;
  }

  function csvCell(value) {
    let cell = String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
    if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
    return `"${cell.replace(/"/g, '""')}"`;
  }

  function eventsToCsv(events) {
    const header = ['Download Time', 'Country', 'Province', 'District', 'Subdistrict', 'City', 'Campaign', 'Device', 'Location Permission', 'APK Version', 'Download Source', 'Count'];
    const rows = (events || []).map(row => [row.timestamp, row.country, row.province, row.district, row.subdistrict, row.city, row.campaign, row.device, row.locationPermission, row.apkVersion, row.downloadSource, row.count]);
    return [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }

  function queryString(filters = {}) {
    const params = new URLSearchParams();
    if (filters.range) params.set('range', filters.range);
    if (filters.device) params.set('device', filters.device);
    if (filters.campaign) params.set('campaign', filters.campaign);
    if (filters.search) params.set('search', filters.search);
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  function createApi({ apiUrl = API_URL, publishableKey, getAccessToken, fetchImpl = root.fetch } = {}) {
    if (typeof getAccessToken !== 'function') throw new Error('getAccessToken is required');
    return {
      async fetchDashboard(filters = {}) {
        const token = await getAccessToken();
        if (!token) throw new Error('SESSION_REQUIRED');
        const response = await fetchImpl(`${apiUrl}${queryString(filters)}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            apikey: publishableKey || '',
            Authorization: `Bearer ${token}`
          }
        });
        let body = null;
        try { body = await response.json(); } catch (_) { body = null; }
        if (!response.ok) {
          const message = body?.message || body?.error || `HTTP_${response.status}`;
          throw new Error(message);
        }
        return normalizePayload(body);
      }
    };
  }

  return Object.freeze({ API_URL, POLL_MS, RANGE_MS, normalizePayload, filterData, uniqueLabels, formatThailandDateTime, eventsToCsv, queryString, createApi });
});
