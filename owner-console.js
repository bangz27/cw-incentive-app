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
    $('owner-custom-card')?.classList.toggle('hidden', !state.isOwner);
    $('owner-password-card')?.classList.toggle('hidden', !state.isOwner);
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
    node.innerHTML = state.audit.map(row => `<div class="owner-audit-row"><div><b>${escapeHtml(row.action)}${row.duration_days ? ` · ${escapeHtml(row.duration_days)} วัน` : ''}</b><small>${formatDateTime(row.created_at)}</small></div><span>${escapeHtml(row.old_status || '—')} → ${escapeHtml(row.new_status || '—')}</span></div>`).join('');
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
    try { state.audit = await callRpc('owner_get_license_audit_v2', { p_target_user_id: state.selected?.target_user_id || null }); renderAudit(); }
    catch (error) { setMessage(errorText(error), 'error'); }
  }
  function parseDuration() {
    const input = $('owner-custom-duration');
    const raw = input?.value.trim() || '';
    if (!/^\d+$/.test(raw)) throw new Error('กรุณากรอกจำนวนวันเป็นจำนวนเต็ม 1–3650 วัน');
    const days = Number(raw);
    if (!Number.isSafeInteger(days) || days < 1 || days > 3650) throw new Error('จำนวนวันต้องอยู่ระหว่าง 1–3650 วัน');
    return days;
  }
  async function grantCustom() {
    const row = state.selected;
    if (!row) { setMessage('กรุณาค้นหาและเลือกลูกค้าก่อน', 'error'); return; }
    let days;
    try { days = parseDuration(); } catch (error) { setMessage(error.message, 'error'); return; }
    if (!global.confirm(`ยืนยันให้สิทธิ์ Custom ${days} วัน\n\nลูกค้า: ${row.email}`)) return;
    setMessage(`กำลังให้สิทธิ์ Custom ${days} วัน...`);
    try {
      const rows = await callRpc('owner_grant_custom', { p_target_user_id: row.target_user_id, p_duration_days: days });
      state.selected = rows[0] || row;
      const index = state.results.findIndex(item => item.target_user_id === row.target_user_id);
      if (index >= 0) state.results[index] = state.selected;
      renderResults(); renderSelected(); await loadAudit(); setMessage(`ให้สิทธิ์ Custom ${days} วันสำเร็จ`, 'success');
    } catch (error) { setMessage(errorText(error), 'error'); }
  }
  function passwordIsStrong(password) { return typeof password === 'string' && password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password); }
  function randomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    if (!global.crypto?.getRandomValues) throw new Error('อุปกรณ์ไม่รองรับ Secure Password Generator');
    const values = new Uint32Array(12);
    global.crypto.getRandomValues(values);
    let password = 'Aa7';
    for (let i = 3; i < 12; i += 1) password += chars[values[i] % chars.length];
    return password;
  }
  function togglePassword() {
    const input = $('owner-new-password'); const button = $('owner-password-toggle');
    if (!input || !button) return;
    const visible = input.type === 'text'; input.type = visible ? 'password' : 'text';
    button.setAttribute('aria-label', visible ? 'แสดงรหัสผ่าน' : 'ซ่อนรหัสผ่าน'); button.title = visible ? 'แสดงรหัสผ่าน' : 'ซ่อนรหัสผ่าน';
    const icon = button.querySelector('.material-icons-round'); if (icon) icon.textContent = visible ? 'visibility' : 'visibility_off';
  }
  async function updateOwnerPassword() {
    const input = $('owner-new-password'); const password = input?.value || '';
    if (!passwordIsStrong(password)) { setMessage('Password ต้องมีอย่างน้อย 8 ตัว มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข', 'error'); return; }
    if (!global.confirm('ยืนยันอัปเดตรหัสผ่าน Owner?')) return;
    try {
      const db = client(); if (!db?.auth?.updateUser) throw new Error('ไม่พบ Auth Client');
      const { error } = await db.auth.updateUser({ password }); if (error) throw error;
      if (input) input.value = '';
      setMessage('อัปเดตรหัสผ่านสำเร็จ และไม่ได้บันทึกรหัสผ่านไว้ในระบบ', 'success');
    } catch (error) { setMessage(errorText(error), 'error'); }
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
    $('owner-custom-grant')?.addEventListener('click', grantCustom);
    $('owner-password-toggle')?.addEventListener('click', togglePassword);
    $('owner-password-generate')?.addEventListener('click', () => { try { const input = $('owner-new-password'); if (input) { input.value = randomPassword(); input.type = 'text'; $('owner-password-toggle')?.setAttribute('aria-label', 'ซ่อนรหัสผ่าน'); } } catch (error) { setMessage(error.message, 'error'); } });
    $('owner-password-update')?.addEventListener('click', updateOwnerPassword);
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
