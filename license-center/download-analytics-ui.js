(function (root) {
  'use strict';

  const core = root.TBSDownloadAnalytics;
  const state = {
    active: false,
    initialized: false,
    loading: false,
    timer: null,
    data: null,
    filters: { range: '7d', device: '', campaign: '', search: '' }
  };
  let api = null;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const formatNumber = value => new Intl.NumberFormat('en-US').format(Number(value) || 0);
  const text = value => String(value ?? '').trim() || '—';
  const locationText = row => [row.city, row.province, row.country].filter(Boolean).join(' · ') || 'ไม่ระบุพื้นที่';
  const sum = rows => (rows || []).reduce((total, row) => total + (Number(row.count) || 0), 0);

  function setLive(status, tone = 'live') {
    const el = $('analyticsLive');
    if (!el) return;
    el.className = `live-status ${tone}`;
    el.innerHTML = `<span class="live-dot"></span>${esc(status)}`;
  }

  function setError(message = '') {
    if ($('analyticsError')) $('analyticsError').textContent = message;
  }

  function currentFilters() {
    return {
      range: $('analyticsRange')?.value || state.filters.range,
      device: $('analyticsDevice')?.value || '',
      campaign: $('analyticsCampaign')?.value || '',
      search: $('analyticsSearch')?.value.trim() || ''
    };
  }

  function updateSelect(id, values, emptyLabel) {
    const select = $(id);
    if (!select) return;
    const selected = select.value;
    select.innerHTML = `<option value="">${esc(emptyLabel)}</option>${values.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}`;
    if (values.includes(selected)) select.value = selected;
  }

  function renderEmpty(id, message = 'ยังไม่มีข้อมูล') {
    const target = $(id);
    if (target) target.innerHTML = `<div class="analytics-empty">${esc(message)}</div>`;
  }

  function renderStats(data) {
    $('analyticsTotal').textContent = formatNumber(data.totalScans);
    $('analyticsToday').textContent = formatNumber(data.todayScans);
    $('analyticsWeek').textContent = formatNumber(data.weekScans);
    $('analyticsMonth').textContent = formatNumber(data.monthScans);
  }

  function renderBars(rows) {
    const target = $('analyticsDevices');
    if (!target) return;
    const sorted = [...rows].sort((a, b) => b.count - a.count).slice(0, 8);
    if (!sorted.length) return renderEmpty('analyticsDevices');
    const max = Math.max(...sorted.map(row => row.count), 1);
    target.innerHTML = sorted.map(row => `<div class="analytics-bar-row">
      <div class="analytics-bar-label"><span>${esc(text(row.label))}</span><b>${formatNumber(row.count)}</b></div>
      <div class="analytics-bar-track"><i style="width:${Math.max(4, (row.count / max) * 100)}%"></i></div>
    </div>`).join('');
  }

  function mapPoint(row, index) {
    const hasCoordinates = Number.isFinite(row.latitude) && Number.isFinite(row.longitude) && row.latitude !== 0 && row.longitude !== 0;
    if (hasCoordinates) {
      return {
        x: Math.max(8, Math.min(92, ((row.longitude - 97) / 8) * 100)),
        y: Math.max(8, Math.min(92, ((21 - row.latitude) / 10) * 100))
      };
    }
    return { x: 12 + ((index * 29) % 76), y: 18 + ((index * 43) % 64) };
  }

  function renderMap(rows) {
    const target = $('analyticsMap');
    if (!target) return;
    const sorted = [...rows].sort((a, b) => b.count - a.count).slice(0, 40);
    if (!sorted.length) return renderEmpty('analyticsMap', 'ยังไม่มี location data');
    const points = sorted.map((row, index) => {
      const point = mapPoint(row, index);
      const radius = Math.max(3, Math.min(12, 3 + Math.sqrt(row.count)));
      const label = `${text(row.label)} · ${formatNumber(row.count)}`;
      return `<g class="map-point"><title>${esc(label)}</title><circle cx="${point.x}" cy="${point.y}" r="${radius / 2}"/><circle class="map-point-ring" cx="${point.x}" cy="${point.y}" r="${radius}"/></g>`;
    }).join('');
    target.innerHTML = `<svg viewBox="0 0 100 100" role="img" aria-label="Download map แบบตำแหน่งโดยประมาณ">
      <defs><linearGradient id="analyticsMapGradient" x1="0" x2="1"><stop offset="0" stop-color="#fff7ed"/><stop offset="1" stop-color="#ffedd5"/></linearGradient></defs>
      <rect width="100" height="100" rx="5" fill="url(#analyticsMapGradient)"/>
      <path class="map-contour" d="M8 28 C20 16 31 24 39 17 C49 9 61 18 67 14 C78 7 90 17 94 29 C85 36 91 47 83 55 C76 65 81 77 68 84 C58 91 44 82 36 87 C27 91 17 81 18 70 C7 61 13 51 7 42 C4 36 5 31 8 28Z"/>
      <path class="map-grid" d="M10 25H90 M7 50H93 M10 75H90 M25 10V90 M50 7V93 M75 10V90"/>
      ${points}
    </svg><div class="analytics-map-note">จุดแสดงตำแหน่งโดยประมาณจาก IP geolocation เท่านั้น</div>`;
  }

  function renderTimeline(rows, range) {
    const target = $('analyticsTimeline');
    if (!target) return;
    const sorted = [...rows].sort((a, b) => String(a.timestamp || a.label).localeCompare(String(b.timestamp || b.label))).slice(-30);
    if (!sorted.length) return renderEmpty('analyticsTimeline');
    const width = 640;
    const height = 210;
    const padX = 28;
    const padY = 24;
    const max = Math.max(...sorted.map(row => row.count), 1);
    const points = sorted.map((row, index) => {
      const x = sorted.length === 1 ? width / 2 : padX + (index / (sorted.length - 1)) * (width - padX * 2);
      const y = height - padY - (row.count / max) * (height - padY * 2);
      return { row, x, y };
    });
    const line = points.map(point => `${point.x},${point.y}`).join(' ');
    const dots = points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="3"><title>${esc(text(point.row.label || point.row.timestamp))}: ${formatNumber(point.row.count)}</title></circle>`).join('');
    const first = text(sorted[0].label || sorted[0].timestamp);
    const last = text(sorted[sorted.length - 1].label || sorted[sorted.length - 1].timestamp);
    $('analyticsTimelineHint').textContent = `${range} · ${first} → ${last}`;
    target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Downloads over time">
      <path class="chart-axis" d="M${padX} ${padY}V${height - padY}H${width - padX}"/>
      <polyline class="chart-line" points="${line}"/>
      ${dots}
    </svg>`;
  }

  function renderLocations(rows) {
    const target = $('analyticsLocations');
    if (!target) return;
    const sorted = [...rows].sort((a, b) => b.count - a.count).slice(0, 8);
    if (!sorted.length) return renderEmpty('analyticsLocations');
    target.innerHTML = sorted.map((row, index) => `<div class="analytics-list-row">
      <span class="analytics-rank">${index + 1}</span><div><b>${esc(text(row.label))}</b><small>${esc(locationText(row))}</small></div><strong>${formatNumber(row.count)}</strong>
    </div>`).join('');
  }

  function renderEvents(rows) {
    const target = $('analyticsEvents');
    if (!target) return;
    const sorted = [...rows].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, 12);
    if (!sorted.length) return renderEmpty('analyticsEvents');
    target.innerHTML = sorted.map(row => `<div class="analytics-event-row">
      <div class="analytics-event-icon">↓</div><div><b>${esc(locationText(row))}</b><small>${esc(text(row.campaign || row.label))} · ${esc(text(row.device))}</small></div><time>${esc(text(row.timestamp))}</time><strong>${formatNumber(row.count)}</strong>
    </div>`).join('');
  }

  function render(data) {
    const filtered = core.filterData(data, state.filters);
    renderStats(data);
    updateSelect('analyticsDevice', core.uniqueLabels(data.devices), 'ทุกอุปกรณ์');
    updateSelect('analyticsCampaign', core.uniqueLabels(data.campaigns), 'ทุก Campaign');
    $('analyticsRange').value = state.filters.range;
    $('analyticsDevice').value = state.filters.device;
    $('analyticsCampaign').value = state.filters.campaign;
    $('analyticsSearch').value = state.filters.search;
    renderMap(filtered.locations);
    renderBars(filtered.devices);
    renderTimeline(filtered.timeline, state.filters.range);
    renderLocations(filtered.locations);
    renderEvents(filtered.events);
  }

  async function load({ silent = false } = {}) {
    if (!api || state.loading) return;
    state.loading = true;
    setLive(silent ? 'SYNC… · 10s' : 'SYNC…', 'syncing');
    try {
      state.data = await api.fetchDashboard(state.filters);
      setError('');
      render(state.data);
      setLive('LIVE · 10s', 'live');
    } catch (error) {
      const message = error?.message === 'SESSION_REQUIRED' ? 'กรุณาเข้าสู่ระบบ Owner ก่อนดู Download Analytics' : `โหลด analytics ไม่สำเร็จ: ${error?.message || 'ตรวจสอบสิทธิ์หรือ API'}`;
      setError(message);
      setLive('OFFLINE', 'offline');
      if (!state.data) {
        ['analyticsMap', 'analyticsDevices', 'analyticsTimeline', 'analyticsLocations', 'analyticsEvents'].forEach(id => renderEmpty(id));
      }
    } finally {
      state.loading = false;
    }
  }

  function startPolling() {
    if (state.timer || !state.active || document.visibilityState === 'hidden') return;
    state.timer = window.setInterval(() => load({ silent: true }), core.POLL_MS);
  }

  function stopPolling() {
    if (state.timer) window.clearInterval(state.timer);
    state.timer = null;
  }

  function bind() {
    const reload = () => {
      state.filters = currentFilters();
      load();
    };
    ['analyticsRange', 'analyticsDevice', 'analyticsCampaign'].forEach(id => $(id)?.addEventListener('change', reload));
    let searchTimer = null;
    $('analyticsSearch')?.addEventListener('input', () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(reload, 250);
    });
    $('analyticsRefresh')?.addEventListener('click', () => { state.filters = currentFilters(); load(); });
    $('analyticsExport')?.addEventListener('click', () => {
      if (!state.data) return setError('ยังไม่มีข้อมูลสำหรับ Export');
      const rows = core.filterData(state.data, state.filters).events;
      const blob = new Blob([core.eventsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tbs-download-analytics-${state.filters.range}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
    document.addEventListener('visibilitychange', () => {
      if (!state.active) return;
      if (document.visibilityState === 'hidden') stopPolling();
      else { startPolling(); load({ silent: true }); }
    });
  }

  function init() {
    if (state.initialized || !core || !root.TBSLicenseCenter) return;
    const center = root.TBSLicenseCenter;
    api = core.createApi({
      apiUrl: core.API_URL,
      publishableKey: center.config.publishableKey,
      getAccessToken: async () => {
        const { data: { session } } = await center.db.auth.getSession();
        return session?.access_token || '';
      }
    });
    bind();
    state.initialized = true;
  }

  function activate() {
    init();
    if (!state.initialized) return;
    state.active = true;
    startPolling();
    if (!state.data) load();
  }

  function deactivate() {
    state.active = false;
    stopPolling();
  }

  root.TBSDownloadAnalyticsUI = Object.freeze({ init, activate, deactivate, load, state });
  init();
})(typeof globalThis !== 'undefined' ? globalThis : window);
