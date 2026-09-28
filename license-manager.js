/* TBS Incentive V1.9 License Manager. Supabase app_licenses remains the source of truth. */
(function (global) {
  'use strict';
  const PLANS = Object.freeze({
    TRIAL: Object.freeze({ key: 'TRIAL', label: 'ทดลองใช้ฟรี', price: 'ฟรี', duration: '14 วัน' }),
    MONTHLY: Object.freeze({ key: 'MONTHLY', label: 'STARTER', price: '49 บาท', duration: '30 วัน' }),
    LIFETIME: Object.freeze({ key: 'LIFETIME', label: 'LIFETIME', price: '79 บาท', duration: 'ตลอดชีพ' })
  });
  const STATUSES = Object.freeze({ ACTIVE: 'ACTIVE', EXPIRED: 'EXPIRED', SUSPENDED: 'SUSPENDED' });
  const LINE_OA_URL = 'https://lin.ee/7WsyQ6W';
  const CACHE_KEY = 'license-cache';
  const state = { license: null, userId: null, online: false, loading: false, error: null, loadedAt: 0 };
  const $ = id => global.document?.getElementById(id);
  const storage = () => global.TBSUserStorage;
  const parseJson = value => { try { return JSON.parse(value); } catch { return null; } };
  const normalize = value => {
    if (!value || typeof value !== 'object') return null;
    const plan = String(value.plan || '').toUpperCase();
    const status = String(value.status || '').toUpperCase();
    if (!PLANS[plan] || !STATUSES[status] || !value.user_id) return null;
    return {
      user_id: String(value.user_id), email: String(value.email || ''), plan, status,
      started_at: value.started_at || null, expires_at: value.expires_at || null,
      granted_at: value.granted_at || null, updated_at: value.updated_at || null,
      remaining_days: Number.isInteger(value.remaining_days) ? value.remaining_days : null,
      remaining_hours: Number.isInteger(value.remaining_hours) ? value.remaining_hours : null,
      server_now: value.server_now || null,
      trial_used: value.trial_used === true || plan === 'TRIAL',
      trial_started_at: value.trial_started_at || null, trial_ends_at: value.trial_ends_at || null,
      is_active: value.is_active === true
    };
  };
  const currentUser = () => global.TBSSupabaseAuth?.getUser?.() || null;
  const client = () => global.TBSSupabaseAuth?.getClient?.() || null;
  const scopedGet = key => storage()?.getItem?.(key) || null;
  const scopedSet = (key, value) => storage()?.setItem?.(key, value);
  const scopedRemove = key => storage()?.removeItem?.(key);
  function cacheLicense(license) {
    const current = currentUser();
    if (!current?.id || !license || String(license.user_id) !== String(current.id)) return;
    scopedSet(CACHE_KEY, JSON.stringify({ license, fetchedAt: new Date().toISOString() }));
  }
  function readCachedLicense() {
    const current = currentUser();
    const cached = parseJson(scopedGet(CACHE_KEY));
    const license = normalize(cached?.license);
    return current?.id && license?.user_id === String(current.id) ? license : null;
  }
  function setState(license, details = {}) {
    state.license = normalize(license);
    state.userId = state.license?.user_id || currentUser()?.id || null;
    Object.assign(state, details);
    render();
    global.dispatchEvent(new CustomEvent('licenseChanged', { detail: getLicense() }));
    return state.license;
  }
  function isExpired(license = state.license) { return license?.status === STATUSES.EXPIRED; }
  function getStatus() {
    if (!state.license) return 'UNKNOWN';
    if (state.license.status === STATUSES.SUSPENDED) return STATUSES.SUSPENDED;
    if (state.license.status === STATUSES.EXPIRED || isExpired()) return STATUSES.EXPIRED;
    return state.license.status;
  }
  function getRemainingDays() {
    const license = state.license;
    if (!license || license.plan === 'LIFETIME' || !license.expires_at) return license?.plan === 'LIFETIME' ? null : 0;
    return Number.isInteger(license.remaining_days) ? Math.max(0, license.remaining_days) : 0;
  }
  function getRemainingHours() {
    const license = state.license;
    if (!license || license.plan === 'LIFETIME' || !license.expires_at) return null;
    return Number.isInteger(license.remaining_hours) ? Math.max(0, license.remaining_hours) : null;
  }
  function getExpiryDate() { return state.license?.expires_at ? new Date(state.license.expires_at) : null; }
  function isActive() { return Boolean(state.license && getStatus() === STATUSES.ACTIVE && state.license.is_active === true); }
  function canUseApp() { return isActive(); }
  function getPlan() { return state.license?.plan || null; }
  function getLicense() { return state.license ? { ...state.license } : null; }
  function isTrialUsed(license = state.license) { return Boolean(license?.trial_used || license?.trial_used_at || license?.plan === 'TRIAL'); }
  function getTrialState() {
    if (state.license?.plan === 'LIFETIME') return 'LIFETIME';
    if (isTrialUsed()) return getStatus() === STATUSES.ACTIVE ? 'ACTIVE' : 'USED';
    return 'AVAILABLE';
  }
  function canStartTrial() {
    return state.online === true && !state.loading && !isTrialUsed() && state.license?.plan !== 'LIFETIME' && getStatus() !== STATUSES.SUSPENDED && !isActive();
  }
  function formatDate(value) { if (!value) return ''; const date = value instanceof Date ? value : new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  function planTitle(license) { if (!license) return 'ยังไม่มีแพ็กเกจที่ใช้งานอยู่'; if (license.plan === 'LIFETIME') return 'Lifetime'; if (license.plan === 'MONTHLY') return 'แพ็กเกจ 30 วัน'; return 'ทดลองใช้ฟรี'; }
  function statusText(license = state.license) {
    const status = getStatus();
    if (!license) return 'ยังไม่มีแพ็กเกจที่ใช้งานอยู่';
    if (status === STATUSES.SUSPENDED) return 'สิทธิ์ถูกระงับชั่วคราว';
    if (status === STATUSES.EXPIRED) return license.plan === 'TRIAL' ? 'การทดลองใช้สิ้นสุดแล้ว' : 'สิทธิ์หมดอายุแล้ว';
    if (license.plan === 'LIFETIME') return 'ใช้งานได้ตลอดชีพ';
    if (license.plan === 'TRIAL') {
      const hours = getRemainingHours();
      return hours !== null && hours < 24 ? `ทดลองใช้ · เหลือ ${hours} ชั่วโมง` : `ทดลองใช้ฟรี · เหลือ ${getRemainingDays()} วัน`;
    }
    return `แพ็กเกจ 30 วัน · เหลือ ${getRemainingDays()} วัน`;
  }
  async function loadLicense() {
    const user = currentUser();
    if (!user?.id) return setState(null, { online: false, loading: false, error: new Error('ยังไม่ได้เข้าสู่ระบบ') });
    if (state.loading && state.userId === String(user.id)) return state.license;
    state.loading = true; state.userId = String(user.id); state.error = null;
    try {
      const db = client();
      if (!db) throw new Error('ไม่พบ Supabase Client');
      const { data, error } = await db.rpc('get_my_license_status');
      if (error) throw error;
      const serverLicense = Array.isArray(data) ? data[0] : data;
      if (!serverLicense) {
        scopedRemove(CACHE_KEY);
        return setState(null, { online: true, loading: false, loadedAt: null, error: null });
      }
      const license = normalize({ ...serverLicense, user_id: user.id, email: user.email || '' });
      if (!license) throw new Error('ข้อมูล License ของบัญชีนี้ไม่ถูกต้อง');
      cacheLicense(license);
      return setState(license, { online: true, loading: false, loadedAt: null, error: null });
    } catch (error) {
      const cached = readCachedLicense();
      return setState(cached, { online: false, loading: false, error, loadedAt: null });
    } finally { state.loading = false; }
  }
  async function startTrial() {
    if (!canStartTrial()) throw new Error('บัญชีนี้ไม่สามารถเริ่มทดลองใช้ได้');
    const user = currentUser(); const db = client();
    if (!user?.id || !db) throw new Error('ไม่พบ Auth Session ที่ยืนยันแล้ว');
    const { data, error } = await db.rpc('start_my_trial');
    if (error) throw error;
    const serverLicense = Array.isArray(data) ? data[0] : data;
    const license = normalize({ ...serverLicense, user_id: user.id, email: user.email || '' });
    if (!license || license.plan !== 'TRIAL') throw new Error('ระบบไม่สามารถเริ่ม Trial ได้');
    cacheLicense(license);
    setState(license, { online: true, loadedAt: null, error: null });
    global.TBSShowToast?.('เริ่มทดลองใช้ 14 วันสำเร็จ', 'success');
    return license;
  }
  function setText(id, value) { const node = $(id); if (node) node.textContent = value; }
  function openLineContact() {
    const opened = global.open?.(LINE_OA_URL, '_blank', 'noopener,noreferrer');
    if (!opened) global.location?.assign?.(LINE_OA_URL);
  }
  function openTrialConfirm() {
    if (!canStartTrial()) { render(); return; }
    const dialog = $('trial-confirm-dialog'); const message = $('trial-confirm-message');
    message?.classList.add('hidden'); if (message) message.textContent = '';
    dialog?.classList.remove('hidden'); $('trial-confirm-button')?.focus?.();
  }
  function closeTrialConfirm() { $('trial-confirm-dialog')?.classList.add('hidden'); }
  function render() {
    const license = state.license;
    const status = getStatus();
    const displayStatus = license?.plan === 'TRIAL' && status === STATUSES.ACTIVE ? 'TRIAL' : status;
    const active = canUseApp();
    document?.documentElement?.classList.toggle('license-active', active);
    document?.documentElement?.classList.toggle('license-locked', !active);
    setText('license-plan-name', planTitle(license)); setText('license-status-text', statusText(license));
    const activeDot = $('[data-license-active-dot]'); activeDot?.classList.toggle('hidden', status !== STATUSES.ACTIVE);
    const renewalMessage = $('expired-renewal-message'); renewalMessage?.classList.toggle('hidden', status !== STATUSES.EXPIRED);
    setText('license-expiry', license?.plan === 'LIFETIME' ? 'ใช้งานได้ตลอดชีพ' : `หมดอายุ ${formatDate(getExpiryDate())}`);
    setText('license-remaining', license?.plan === 'LIFETIME' ? 'ตลอดชีพ' : getRemainingHours() !== null && getRemainingHours() < 24 ? `${getRemainingHours()} ชั่วโมง` : `${getRemainingDays()} วัน`);
    const warning = $('trial-warning'); warning?.classList.toggle('hidden', !(license?.plan === 'TRIAL' && status === STATUSES.ACTIVE && getRemainingDays() <= 3));
    if (warning && license?.plan === 'TRIAL') warning.textContent = statusText(license);
    const gate = $('license-gate'); const suspended = $('suspended-gate'); const packageGate = $('expired-gate');
    const showPackage = !active && status !== STATUSES.SUSPENDED;
    gate?.classList.toggle('hidden', active);
    suspended?.classList.toggle('hidden', status !== STATUSES.SUSPENDED);
    packageGate?.classList.toggle('hidden', !showPackage);
    const title = !license ? 'เลือกแพ็กเกจ / สิทธิ์การใช้งาน' : license.plan === 'TRIAL' && status === STATUSES.EXPIRED ? 'การทดลองใช้สิ้นสุดแล้ว' : 'เลือกแพ็กเกจ / สิทธิ์การใช้งาน';
    const message = !license ? 'ยังไม่มีแพ็กเกจที่ใช้งานอยู่' : license.plan === 'TRIAL' && status === STATUSES.EXPIRED ? 'ต้องมีสิทธิ์ Lifetime เพื่อใช้งานต่อ' : 'เลือกวิธีเริ่มใช้งานด้วยตัวเอง';
    setText('package-gate-title', title); setText('package-gate-message', message);
    const trialCard = $('trial-pricing-card'); const trialButton = $('start-trial-button');
    const trialAllowed = canStartTrial();
    trialCard?.classList.toggle('hidden', license?.plan === 'LIFETIME' || status === STATUSES.SUSPENDED);
    trialCard?.classList.toggle('pricing-card-disabled', !trialAllowed);
    if (trialButton) { trialButton.disabled = !trialAllowed; trialButton.textContent = trialAllowed ? 'เริ่มทดลองใช้' : 'ทดลองใช้ไปแล้ว'; }
    document.querySelectorAll('[data-license-status]').forEach(node => { node.textContent = displayStatus; node.dataset.status = displayStatus; });
  }
  function bindUi() {
    global.addEventListener('licenseChanged', render);
    document.addEventListener('click', event => {
      const lineTarget = event.target.closest?.('[data-line-contact]');
      if (lineTarget) { event.preventDefault(); openLineContact(); return; }
      const trialTarget = event.target.closest?.('[data-start-trial]');
      if (trialTarget) { event.preventDefault(); openTrialConfirm(); return; }
      const target = event.target.closest?.('[data-license-refresh], [data-license-pricing]');
      if (!target) return;
      event.preventDefault();
      if (target.dataset.licenseRefresh !== undefined) loadLicense();
      else document.getElementById('license-pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('trial-confirm-cancel')?.addEventListener('click', closeTrialConfirm);
    $('trial-confirm-dialog')?.querySelector('[data-trial-confirm-dismiss]')?.addEventListener('click', closeTrialConfirm);
    $('trial-confirm-button')?.addEventListener('click', async () => {
      const button = $('trial-confirm-button'); const message = $('trial-confirm-message');
      button.disabled = true;
      try { await startTrial(); closeTrialConfirm(); }
      catch (error) { if (message) { message.textContent = error?.message || 'เริ่มทดลองใช้ไม่สำเร็จ'; message.classList.remove('hidden'); } }
      finally { button.disabled = false; }
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeTrialConfirm(); });
    document.addEventListener('click', event => {
      const nav = event.target.closest?.('[data-target]');
      const mutation = event.target.closest?.('#btn-save, [data-edit-record], [data-delete-record]');
      if (mutation && !canUseApp()) { event.preventDefault(); event.stopImmediatePropagation(); render(); return; }
      if (!nav || canUseApp()) return;
      const allowed = new Set(['view-profile', 'view-settings', 'view-owner-console', 'view-payment-details', 'view-payment-detail', 'view-support', 'view-about', 'view-contact']);
      if (!allowed.has(nav.dataset.target)) { event.preventDefault(); event.stopImmediatePropagation(); render(); }
    }, true);
    render();
  }
  global.TBSLicenseManager = Object.freeze({
    PLANS, STATUSES, loadLicense, startTrial, canStartTrial, getTrialState, isTrialUsed,
    getLicense, getPlan, getStatus, getRemainingDays, getRemainingHours, getExpiryDate, isActive, canUseApp,
    isExpired, formatDate, planTitle, statusText, getState: () => ({ ...state }), render
  });
  document.addEventListener('DOMContentLoaded', bindUi);
})(window);
