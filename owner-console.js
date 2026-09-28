/* TBS Incentive V1.7.1 Owner License Console. All authorization and mutations are server-side RPCs. */
(function (global) {
  'use strict';
  const state = { isOwner: false, results: [], selected: null, audit: [], loading: false };
  const $ = id => document.getElementById(id);
  const client = () => global.TBSSupabaseAuth?.getClient?.() || null;
  const user = () => global.TBSSupabaseAuth?.getUser?.() || null;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const formatDate = value => value ? new Date(value).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const formatDateTime = value => value ? new Date(value).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const showToast = message => global.showToast?.(message);
  const errorText = error => error?.message || 'ดำเนินการไม่สำเร็จ';

  function setOwnerVisible(visible) {
    state.isOwner = Boolean(visible);
    $('owner-console-entry')?.classList.toggle('hidden', !state.isOwner);
  }
  function setMessage(text, tone = '') {
    const node = $('owner-console-message');
    if (!node) return;
    node.textContent = text || '';
    node.className = `owner-console-message${tone ? ` ${tone}` : ''}${text ? '' : ' hidden'}`;
  }
  function planLabel(plan) { return plan === 'LIFETIME' ? 'Lifetime' : plan === 'MONTHLY' ? 'Monthly' : plan || 'ยังไม่มี License'; }
  function renderResults() {
    const node = $('owner-search-results');
    if (!node) return;
    if (!state.results.length) { node.innerHTML = '<p class="muted owner-empty">ไม่พบลูกค้าที่ค้นหา</p>'; return; }
    node.innerHTML = state.results.map((row, index) => `<button type="button" class="owner-result-row" data-owner-result-index="${index}"><span class="owner-result-main"><b>${escapeHtml(row.email || 'ไม่มี Email')}</b><small>${escapeHtml(planLabel(row.plan))} · ${escapeHtml(row.status || 'ยังไม่มีสิทธิ์')}</small></span><span class="material-icons-round">chevron_right</span></button>`).join('');
  }
  function renderSelected() {
    const card = $('owner-selected-card');
    const row = state.selected;
    if (!card) return;
    card.classList.toggle('hidden', !row);
    if (!row) return;
    $('owner-selected-email').textContent = row.email || '—';
    $('owner-selected-user-id').textContent = row.target_user_id || '—';
    $('owner-selected-plan').textContent = planLabel(row.plan);
    $('owner-selected-status').textContent = row.status || 'ยังไม่มี License';
    $('owner-selected-started').textContent = formatDate(row.started_at);
    $('owner-selected-expires').textContent = row.plan === 'LIFETIME' ? 'ตลอดชีพ' : formatDate(row.expires_at);
    $('owner-selected-remaining').textContent = row.plan === 'LIFETIME' ? 'ตลอดชีพ' : `${row.remaining_days ?? 0} วัน`;
    document.querySelectorAll('[data-owner-action]').forEach(button => { button.disabled = !row; });
  }
  function renderAudit() {
    const node = $('owner-audit-list');
    if (!node) return;
    if (!state.audit.length) { node.innerHTML = '<p class="muted owner-empty">ยังไม่มีประวัติการเปลี่ยนแปลง</p>'; return; }
    node.innerHTML = state.audit.map(row => `<div class="owner-audit-row"><div><b>${escapeHtml(row.action)}</b><small>${formatDateTime(row.created_at)}</small></div><span>${escapeHtml(row.old_status || '—')} → ${escapeHtml(row.new_status || '—')}</span></div>`).join('');
  }
  async function callRpc(name, args = {}) {
    const db = client();
    if (!db || !user()?.id) throw new Error('ไม่พบ Auth Session ที่ยืนยันแล้ว');
    const { data, error } = await db.rpc(name, args);
    if (error) throw error;
    return Array.isArray(data) ? data : data ? [data] : [];
  }
  async function checkOwner() {
    try {
      const rows = await callRpc('owner_is_current_user');
      setOwnerVisible(rows[0]?.owner_is_current_user === true || rows[0]?.is_owner === true || rows[0] === true);
    } catch { setOwnerVisible(false); }
  }
  async function search() {
    const input = $('owner-search-email');
    const value = input?.value.trim() || '';
    if (!value) { setMessage('กรุณากรอก Email สำหรับค้นหา', 'error'); return; }
    setMessage('กำลังค้นหา...');
    try { state.results = await callRpc('owner_search_license_users', { p_email: value }); state.selected = null; renderResults(); renderSelected(); setMessage(`พบ ${state.results.length} บัญชี`, 'success'); }
    catch (error) { state.results = []; state.selected = null; renderResults(); renderSelected(); setMessage(errorText(error), 'error'); }
  }
  async function loadAudit() {
    if (!state.isOwner) return;
    try { state.audit = await callRpc('owner_get_license_audit', { p_target_user_id: state.selected?.target_user_id || null }); renderAudit(); }
    catch (error) { setMessage(errorText(error), 'error'); }
  }
  async function mutate(action, rpcName, label, price) {
    const row = state.selected;
    if (!row) return;
    const confirmed = global.confirm(`ยืนยัน${label}\n\nลูกค้า: ${row.email}\nราคา/สิทธิ์: ${price}\nการเปลี่ยนแปลง: ${label}`);
    if (!confirmed) return;
    setMessage(`กำลัง${label}...`);
    try {
      const rows = await callRpc(rpcName, { p_target_user_id: row.target_user_id });
      state.selected = rows[0] || row;
      const index = state.results.findIndex(item => item.target_user_id === row.target_user_id);
      if (index >= 0) state.results[index] = state.selected;
      renderResults(); renderSelected(); await loadAudit(); setMessage(`${label}สำเร็จ`, 'success');
    } catch (error) { setMessage(errorText(error), 'error'); }
  }
  function bindUi() {
    $('owner-search-button')?.addEventListener('click', search);
    $('owner-search-email')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); search(); } });
    $('owner-search-results')?.addEventListener('click', event => { const button = event.target.closest('[data-owner-result-index]'); if (!button) return; state.selected = state.results[Number(button.dataset.ownerResultIndex)] || null; renderSelected(); loadAudit(); });
    $('owner-audit-refresh')?.addEventListener('click', loadAudit);
    $('owner-console-back')?.addEventListener('click', () => global.dispatchEvent(new CustomEvent('showView', { detail: 'view-settings' })));
    document.querySelectorAll('[data-owner-action]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.ownerAction;
      if (action === 'monthly') mutate(action, 'owner_grant_monthly', 'เปิด/ต่อ Monthly', '49 บาท / 30 วัน');
      if (action === 'lifetime') mutate(action, 'owner_grant_lifetime', 'เปิด Lifetime', '79 บาท / ตลอดชีพ');
      if (action === 'suspend') mutate(action, 'owner_suspend_license', 'ระงับสิทธิ์', '—');
      if (action === 'activate') mutate(action, 'owner_activate_license', 'Activate', 'คง Plan และวันหมดอายุเดิม');
    }));
    renderResults(); renderSelected(); renderAudit();
  }
  async function init() { await checkOwner(); if (state.isOwner) loadAudit(); }
  global.TBSOwnerConsole = Object.freeze({ init, checkOwner, search, getState: () => ({ ...state }) });
  document.addEventListener('DOMContentLoaded', () => { bindUi(); setTimeout(init, 0); });
  global.addEventListener('userStorageReady', init);
})(window);
