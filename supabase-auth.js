/* TBS Incentive V1.6 Supabase Authentication + user-scoped local sync. */
(function (global) {
  'use strict';
  const config = global.TBSSupabaseConfig;
  const supabaseLib = global.supabase;
  const authState = { client: null, user: null, session: null, ready: false, syncing: false, activation: null };
  const $ = id => document.getElementById(id);
  const storage = () => global.TBSUserStorage;
  const show = (id, visible) => $(id)?.classList.toggle('hidden', !visible);
  const message = (text, tone = 'error') => { const node = $('auth-message'); if (!node) return; node.textContent = text || ''; node.className = `auth-message ${tone}${text ? '' : ' hidden'}`; };
  const localJson = (key, fallback) => { try { return JSON.parse(storage()?.getItem(key)) ?? fallback; } catch { return fallback; } };
  const toNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  function localProfile() { return global.TBSProfiles?.getActive?.() || {}; }
  function localRecords() { const rows = localJson('history', []); return Array.isArray(rows) ? rows : []; }
  function cloudRecord(userId, record) { return { user_id: userId, record_id: String(record.id || record.recordId || `${record.date || 'record'}-${Date.now()}`), date: record.date || new Date().toISOString().slice(0, 10), full_name: record.fullName || record.name || '', hub: record.hub || '', driver_id: record.driverId || '', vehicle_type: record.vehicleType === '2W' ? '2W' : '4W', zone: record.zone || '', parcel: toNumber(record.parcel), size_s: toNumber(record.sizeS), size_l: toNumber(record.sizeL), gross_incentive: toNumber(record.grossIncentive), same_address_count: toNumber(record.sameAddressCount), same_address_deduction: toNumber(record.sameAddressDeduction), net_incentive: toNumber(record.netIncentive), tier_breakdown: Array.isArray(record.tierBreakdown) ? record.tierBreakdown : [], rts_count: toNumber(record.rtsCount), rts_income: toNumber(record.rtsIncome), box_count: toNumber(record.boxCount), box_amount: toNumber(record.boxAmount) }; }
  function localRecord(cloud) { return { id: cloud.record_id, date: cloud.date, fullName: cloud.full_name || '', hub: cloud.hub || '', driverId: cloud.driver_id || '', vehicleType: cloud.vehicle_type, zone: cloud.zone || '', parcel: toNumber(cloud.parcel), sizeS: toNumber(cloud.size_s), sizeL: toNumber(cloud.size_l), grossIncentive: toNumber(cloud.gross_incentive), sameAddressCount: toNumber(cloud.same_address_count), sameAddressDeduction: toNumber(cloud.same_address_deduction), netIncentive: toNumber(cloud.net_incentive), tierBreakdown: Array.isArray(cloud.tier_breakdown) ? cloud.tier_breakdown : [], rtsCount: toNumber(cloud.rts_count), rtsIncome: toNumber(cloud.rts_income), boxCount: toNumber(cloud.box_count), boxAmount: toNumber(cloud.box_amount), synced: true }; }

  async function syncProfile() {
    if (!authState.user || !authState.client || storage()?.getUserId() !== authState.user.id) return;
    const profile = localProfile();
    const payload = { user_id: authState.user.id, profile_id: String(profile.profileId || `supabase-${authState.user.id}`), full_name: profile.fullName || profile.displayName || '', hub: profile.hub || '', position: profile.position || '', employee_id: profile.employeeId || '', driver_id: profile.driverId || '', email: authState.user.email || profile.email || '', photo_url: profile.photoURL || '', custom_photo: profile.customPhoto || '' };
    const { error } = await authState.client.from('profiles').upsert(payload, { onConflict: 'user_id,profile_id' });
    if (error) console.warn('Supabase profile sync skipped:', error.message);
  }

  async function restoreProfileFromCloud(currentUser = authState.user) {
    if (!currentUser?.id || !authState.client || storage()?.getUserId() !== currentUser.id) return [];
    const { data, error } = await authState.client
      .from('profiles')
      .select('user_id,profile_id,full_name,hub,position,employee_id,driver_id,email,photo_url,custom_photo')
      .eq('user_id', currentUser.id)
      .limit(50);
    if (error) throw error;
    if (!Array.isArray(data) || storage()?.getUserId() !== currentUser.id) return [];

    const localProfiles = Array.isArray(global.TBSProfiles?.all?.()) ? global.TBSProfiles.all() : [];
    const localById = new Map(localProfiles.map(profile => [String(profile.profileId), profile]));
    data.forEach(row => {
      if (String(row.user_id) !== String(currentUser.id) || !row.profile_id) return;
      const profileId = String(row.profile_id);
      const existing = localById.get(profileId) || {};
      localById.set(profileId, {
        ...existing,
        profileId,
        fullName: row.full_name ?? existing.fullName ?? '',
        displayName: row.full_name ?? existing.displayName ?? '',
        hub: row.hub ?? existing.hub ?? '',
        position: row.position ?? existing.position ?? '',
        employeeId: row.employee_id ?? existing.employeeId ?? '',
        driverId: row.driver_id ?? existing.driverId ?? '',
        email: row.email ?? existing.email ?? currentUser.email ?? '',
        photoURL: row.photo_url ?? existing.photoURL ?? '',
        customPhoto: row.custom_photo ?? existing.customPhoto ?? '',
        updatedAt: existing.updatedAt || new Date().toISOString()
      });
    });
    const merged = [...localById.values()];
    if (!merged.length) return [];
    storage().setJson('profiles', merged);
    const activeId = storage().getItem('active-profile-id');
    const selected = activeId && merged.some(profile => String(profile.profileId) === String(activeId))
      ? String(activeId)
      : String(merged[0].profileId);
    global.TBSProfiles?.setActive?.(selected);
    return merged;
  }

  async function syncRecords() {
    if (!authState.user || !authState.client || authState.syncing || storage()?.getUserId() !== authState.user.id) return;
    authState.syncing = true;
    try {
      const local = localRecords();
      if (local.length) {
        const rows = local.map(row => cloudRecord(authState.user.id, row));
        const { error } = await authState.client.from('incentive_records').upsert(rows, { onConflict: 'user_id,record_id' });
        if (error) console.warn('Supabase record sync skipped:', error.message);
      }
      const { data, error } = await authState.client.from('incentive_records').select('record_id,date,full_name,hub,driver_id,vehicle_type,zone,parcel,size_s,size_l,gross_incentive,same_address_count,same_address_deduction,net_incentive,tier_breakdown,rts_count,rts_income,box_count,box_amount').eq('user_id', authState.user.id).order('date', { ascending: false }).limit(500);
      if (!error && Array.isArray(data) && storage()?.getUserId() === authState.user.id) {
        const merged = new Map(local.map(row => [String(row.id || row.recordId), row]));
        data.forEach(row => { if (!merged.has(String(row.record_id))) merged.set(String(row.record_id), localRecord(row)); });
        storage().setItem('history', JSON.stringify([...merged.values()]));
        global.dispatchEvent(new Event('historyUpdated'));
      }
    } finally { authState.syncing = false; }
  }

  function setAuthenticated(user, session = null) {
    authState.user = user || null; authState.session = session || null; authState.ready = true;
    document.documentElement.dataset.auth = user ? 'authenticated' : 'anonymous';
    show('auth-gate', !user); document.querySelector('.app-shell')?.classList.toggle('auth-hidden', !user);
    if (user) { $('auth-user-email') && ($('auth-user-email').textContent = user.email || ''); global.dispatchEvent(new Event('userStorageReady')); }
  }

  function askLegacyMigration() {
    if (!authState.user || !storage()?.hasLegacyData() || storage().migrationState(authState.user.id)) return Promise.resolve();
    const dialog = $('legacy-migration-dialog');
    if (!dialog) { storage().skipLegacy(authState.user.id); return Promise.resolve(); }
    show('legacy-migration-dialog', true);
    return new Promise(resolve => {
      const finish = action => { action === 'import' ? storage().migrateLegacy(authState.user.id) : storage().skipLegacy(authState.user.id); show('legacy-migration-dialog', false); resolve(); };
      $('legacy-import')?.addEventListener('click', () => finish('import'), { once: true });
      $('legacy-skip')?.addEventListener('click', () => finish('skip'), { once: true });
    });
  }

  async function activateAuthenticatedSession(session) {
    if (!session?.user?.id || storage()?.getUserId() === session.user.id && authState.activation) return authState.activation;
    authState.activation = (async () => {
      storage()?.setUser(session.user.id);
      authState.user = session.user; authState.session = session;
      await askLegacyMigration();
      setAuthenticated(session.user, session);
      await restoreProfileFromCloud(session.user);
      await syncProfile(); await syncRecords();
      return session;
    })().finally(() => { authState.activation = null; });
    return authState.activation;
  }

  async function init() {
    if (!config?.url || !config?.publishableKey || !supabaseLib?.createClient) { message('ไม่พบการตั้งค่า Supabase Client'); setAuthenticated(null); return; }
    authState.client = supabaseLib.createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    authState.client.auth.onAuthStateChange((_event, session) => { if (session?.user) activateAuthenticatedSession(session).catch(error => console.warn('Supabase session activation failed:', error.message)); else { storage()?.clearUser(); setAuthenticated(null); } });
    const { data, error } = await authState.client.auth.getSession();
    if (error) message('เชื่อมต่อระบบสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    if (data?.session?.user) await activateAuthenticatedSession(data.session); else { storage()?.clearUser(); setAuthenticated(null); }
  }

  async function requireAuthenticatedSession(session) {
    if (!session?.access_token || !session?.refresh_token || !authState.client) throw new Error('ไม่พบ Auth Session ที่ยืนยันแล้ว');
    const { data, error } = await authState.client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (error) throw error;
    const current = data?.session; if (!current?.access_token || !current.user?.id) throw new Error('ติดตั้ง Auth Session ไม่สำเร็จ');
    return current;
  }
  async function syncAuthenticatedSession(session) { return activateAuthenticatedSession(await requireAuthenticatedSession(session)); }
  async function signIn(email, password) { message(''); const { data, error } = await authState.client.auth.signInWithPassword({ email, password }); if (error) throw error; await syncAuthenticatedSession(data.session); }
  async function signUp(email, password) { message(''); const { data, error } = await authState.client.auth.signUp({ email, password, options: { emailRedirectTo: global.location.origin } }); if (error) throw error; if (!data.session) { message('สมัครสมาชิกสำเร็จ กรุณาตรวจสอบ Email เพื่อยืนยันบัญชี', 'success'); return; } await syncAuthenticatedSession(data.session); }
  async function resetPassword(email) { message(''); const { error } = await authState.client.auth.resetPasswordForEmail(email, { redirectTo: global.location.href }); if (error) throw error; message('ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบ Email', 'success'); }
  async function signOut() { await authState.client?.auth.signOut(); storage()?.clearUser(); }

  function bindUi() {
    $('auth-login-form')?.addEventListener('submit', async event => { event.preventDefault(); const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true; try { await signIn($('auth-email').value.trim(), $('auth-password').value); } catch (error) { message(error.message || 'เข้าสู่ระบบไม่สำเร็จ'); } finally { button.disabled = false; } });
    $('auth-register-form')?.addEventListener('submit', async event => { event.preventDefault(); if ($('auth-register-password').value !== $('auth-register-confirm').value) { message('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน'); return; } const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true; try { await signUp($('auth-register-email').value.trim(), $('auth-register-password').value); } catch (error) { message(error.message || 'สมัครสมาชิกไม่สำเร็จ'); } finally { button.disabled = false; } });
    $('auth-reset-form')?.addEventListener('submit', async event => { event.preventDefault(); try { await resetPassword($('auth-reset-email').value.trim()); } catch (error) { message(error.message || 'ส่งลิงก์ไม่สำเร็จ'); } });
    document.querySelectorAll('[data-auth-mode]').forEach(button => button.addEventListener('click', () => { const mode = button.dataset.authMode; ['login', 'register', 'reset'].forEach(name => show(`auth-${name}-form`, mode === name)); message(''); }));
    $('settings-logout')?.addEventListener('click', async () => { try { await signOut(); } catch (error) { global.showToast?.('ออกจากระบบไม่สำเร็จ'); } });
    global.addEventListener('activeProfileChanged', () => syncProfile().catch(() => {}));
    global.addEventListener('historyUpdated', () => syncRecords().catch(() => {}));
  }
  global.TBSSupabaseAuth = { init, signIn, signUp, resetPassword, signOut, getUser: () => authState.user, getClient: () => authState.client, syncProfile, restoreProfileFromCloud, syncRecords };
  document.addEventListener('DOMContentLoaded', () => { bindUi(); init(); });
})(window);
