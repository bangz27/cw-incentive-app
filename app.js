document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const profiles = window.TBSProfiles;
  const initials = name => String(name || 'TB').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'TB';
  const current = () => profiles?.getActive() || {};
  const photoOf = p => profiles?.photo(p) || '';
  const resizePhoto = file => new Promise((resolve, reject) => { if (!file || !['image/jpeg','image/png'].includes(file.type)) return reject(new Error('รองรับเฉพาะ JPG, JPEG หรือ PNG')); const reader = new FileReader(); reader.onerror = () => reject(new Error('ไม่สามารถอ่านรูปได้')); reader.onload = () => { const image = new Image(); image.onerror = () => reject(new Error('ไฟล์รูปไม่ถูกต้อง')); image.onload = () => { const max = 512, scale = Math.min(1, max / Math.max(image.width, image.height)), canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale)); const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', .78)); }; image.src = reader.result; }; reader.readAsDataURL(file); });
  const setAvatar = (element, p) => { if (!element) return; const src = photoOf(p); element.innerHTML = src ? `<img src="${src}" alt="รูปโปรไฟล์">` : initials(p.fullName || p.displayName); };
  const money = n => `฿${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const dateValue = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const today = () => dateValue(new Date());
  const formatDate = value => { if (!value) return 'เลือกช่วงวันที่'; const [y, m, d] = value.split('-'); return `${d}/${m}/${y}`; };
  const defaultRange = () => { const end = today(); return { from: end, to: end }; };
  const paymentCycleForRange = (from, to) => {
    const start = new Date(`${from}T00:00:00`), end = new Date(`${to}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
    const previousMonth = start.getFullYear() === new Date(end.getFullYear(), end.getMonth() - 1, 1).getFullYear() && start.getMonth() === new Date(end.getFullYear(), end.getMonth() - 1, 1).getMonth();
    if (start.getDate() === 11 && end.getDate() === 25 && sameMonth) return { label: 'รอบจ่ายกลางเดือน' };
    if (start.getDate() === 26 && end.getDate() === 25 && previousMonth) return { label: 'รอบจ่าย 2W' };
    if (start.getDate() === 26 && end.getDate() === 10 && previousMonth) return { label: 'รอบจ่ายสิ้นเดือน' };
    return null;
  };
  const readRange = () => { try { const r = JSON.parse(localStorage.getItem('cw_home_date_range') || 'null'); return r?.from && r?.to ? r : defaultRange(); } catch { return defaultRange(); } };
  const saveRange = r => localStorage.setItem('cw_home_date_range', JSON.stringify(r));
  const setTheme = theme => { root.dataset.theme = theme; localStorage.setItem('incentive_theme', theme); document.querySelectorAll('.theme-icon').forEach(x => x.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode'); };
  setTheme(localStorage.getItem('incentive_theme') || 'light');
  document.querySelector('.theme-toggle')?.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

  const rootViewIds = new Set(['view-home', 'view-calculator', 'view-profile', 'view-history', 'view-settings']);
  const childViewIds = new Set(['view-guide', 'view-payment-details', 'view-payment-detail', 'view-support', 'view-about', 'view-contact']);
  const navigationStack = [];
  let activeViewId = 'view-home';
  function showView(target, options = {}) {
    const safeTarget = target === 'view-summary' || target === 'view-dashboard' ? 'view-history' : target;
    if (!options.fromStack) {
      if (rootViewIds.has(safeTarget)) navigationStack.length = 0;
      else if (childViewIds.has(safeTarget) && activeViewId !== safeTarget) navigationStack.push(activeViewId);
    }
    activeViewId = safeTarget;
    document.querySelectorAll('.view-section').forEach(v => v.classList.toggle('active', v.id === safeTarget));
    document.querySelector('.app-shell')?.classList.toggle('calculator-fixed-layer', safeTarget === 'view-calculator');
    document.querySelectorAll('[data-target]').forEach(n => n.classList.toggle('active', n.dataset.target === safeTarget && n.classList.contains('nav-item')));
    const contexts = {'view-home':['TBS Incentive','สรุปรายได้ของคุณ'],'view-calculator':['TBS Incentive','เลือกตำแหน่งจัดส่ง'],'view-profile':['TBS Incentive','Profile • ข้อมูลของฉัน'],'view-history':['TBS Incentive','รายการ • ประวัติคำนวณ'],'view-settings':['TBS Incentive','Setting • ตั้งค่าและข้อมูลเพิ่มเติม'],'view-guide':['TBS Incentive','คู่มือการใช้งาน'],'view-payment-details':['TBS Incentive','รายละเอียดการทำจ่าย'],'view-payment-detail':['TBS Incentive','รายละเอียดการทำจ่าย'],'view-support':['TBS Incentive','สนับสนุนค่ากาแฟ'],'view-about':['TBS Incentive','นโยบายความเป็นส่วนตัว'],'view-contact':['TBS Incentive','ข้อมูลการติดต่อ']};
    const context = contexts[safeTarget] || contexts['view-home'];
    const title = document.getElementById('header-title'), subtitle = document.getElementById('header-subtitle'), refresh = document.getElementById('header-refresh');
    if (title) title.textContent = context[0]; if (subtitle) subtitle.textContent = context[1]; refresh?.classList.toggle('hidden', safeTarget !== 'view-calculator');
    if (safeTarget === 'view-home') renderHome();
  }
  function goBackInApp(fallback = 'view-settings') {
    const previous = navigationStack.pop();
    showView(previous || fallback, { fromStack: true });
  }
  const registerNativeBackHandler = () => {
    const appApi = window.capacitorApp?.App || window.Capacitor?.Plugins?.App;
    if (!appApi?.addListener) return;
    appApi.addListener('backButton', ({ canGoBack } = {}) => {
      if (childViewIds.has(activeViewId) && navigationStack.length) { goBackInApp(); return; }
      if (canGoBack) { window.history.back(); return; }
      appApi.exitApp?.();
    });
  };
  document.querySelectorAll('[data-target]').forEach(link => link.addEventListener('click', e => { e.preventDefault(); if (link.dataset.vehicle) window.dispatchEvent(new CustomEvent('vehicleSelected', { detail: link.dataset.vehicle })); showView(link.dataset.target); }));
  window.addEventListener('showView', e => showView(e.detail));
  registerNativeBackHandler();
  let edgeSwipe = null;
  const gestureSurface = document.querySelector('.app-content') || document;
  const clearEdgeSwipe = () => { edgeSwipe = null; };
  const beginEdgeSwipe = (x, y, source, pointerId = null, eventTarget = gestureSurface) => {
    if (!Number.isFinite(x) || x > 28 || !childViewIds.has(activeViewId) || navigationStack.length === 0) { clearEdgeSwipe(); return; }
    edgeSwipe = { x, y, source, pointerId, axis: null };
    if (source === 'pointer' && pointerId !== null && eventTarget.setPointerCapture) {
      try { eventTarget.setPointerCapture(pointerId); } catch {}
    }
  };
  const updateEdgeSwipe = (x, y, event, source) => {
    if (!edgeSwipe || edgeSwipe.source !== source || !Number.isFinite(x)) return;
    const dx = x - edgeSwipe.x, dy = Math.abs(y - edgeSwipe.y);
    if (!edgeSwipe.axis) {
      if (Math.max(Math.abs(dx), dy) < 8) return;
      edgeSwipe.axis = dx > 0 && Math.abs(dx) > dy ? 'horizontal' : 'vertical';
    }
    if (edgeSwipe.axis === 'horizontal') { event.preventDefault(); edgeSwipe.horizontal = true; }
    else clearEdgeSwipe();
  };
  const finishEdgeSwipe = (x, y, event, source) => {
    if (!edgeSwipe || edgeSwipe.source !== source) return;
    const dx = x - edgeSwipe.x, dy = Math.abs(y - edgeSwipe.y), shouldGoBack = edgeSwipe.axis === 'horizontal' && dx >= 72 && dy < 80;
    if (shouldGoBack) { event.preventDefault(); goBackInApp(); }
    clearEdgeSwipe();
  };
  if ('PointerEvent' in window) {
    document.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') beginEdgeSwipe(event.clientX, event.clientY, 'pointer', event.pointerId, gestureSurface); }, { capture: true, passive: true });
    document.addEventListener('pointermove', event => { if (event.pointerType === 'touch') updateEdgeSwipe(event.clientX, event.clientY, event, 'pointer'); }, { capture: true, passive: false });
    document.addEventListener('pointerup', event => { if (event.pointerType === 'touch') finishEdgeSwipe(event.clientX, event.clientY, event, 'pointer'); }, { capture: true, passive: false });
    document.addEventListener('pointercancel', event => { if (event.pointerType === 'touch') clearEdgeSwipe(); }, { capture: true, passive: true });
  } else {
    document.addEventListener('touchstart', event => { const touch = event.touches?.[0]; if (touch) beginEdgeSwipe(touch.clientX, touch.clientY, 'touch'); }, { capture: true, passive: true });
    document.addEventListener('touchmove', event => { const touch = event.touches?.[0]; if (touch) updateEdgeSwipe(touch.clientX, touch.clientY, event, 'touch'); }, { capture: true, passive: false });
    document.addEventListener('touchend', event => { const touch = event.changedTouches?.[0]; if (touch) finishEdgeSwipe(touch.clientX, touch.clientY, event, 'touch'); }, { capture: true, passive: false });
    document.addEventListener('touchcancel', clearEdgeSwipe, { capture: true, passive: true });
  }

  function fillForm(p) { [['profile-name', 'fullName'], ['profile-hub', 'hub'], ['profile-position', 'position']].forEach(([id, key]) => { const el = document.getElementById(id); if (el) el.value = p?.[key] || ''; }); }
  function renderProfile() { const p = current(), name = p.fullName || p.displayName || ''; const greeting = document.getElementById('home-greeting'); if (greeting) greeting.textContent = name ? `สวัสดี, ${name}` : 'เริ่มคำนวณรายได้ของคุณ'; document.querySelectorAll('#home-avatar,#profile-avatar').forEach(x => setAvatar(x, p)); const preview = document.getElementById('profile-preview-name'); if (preview) preview.textContent = name || 'ยังไม่ได้สร้างโปรไฟล์'; fillForm(p); }

  function renderHome() {
    const records = window.CWRecordModel ? window.CWRecordModel.readRecords(localStorage) : [], range = readRange();
    const rows = records.filter(r => String(r.date) >= range.from && String(r.date) <= range.to);
    const sum = key => rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set('home-date-range', `${formatDate(range.from)} – ${formatDate(range.to)}`); const paymentCycle = paymentCycleForRange(range.from, range.to); const cycleCard = document.getElementById('home-payment-cycle'); cycleCard?.classList.toggle('hidden', !paymentCycle); set('home-payment-cycle-name', paymentCycle?.label || ''); set('home-net', money(sum('netIncentive'))); set('home-parcel', sum('parcel').toLocaleString()); set('home-same', sum('sameAddressCount').toLocaleString()); set('home-deduction', money(sum('sameAddressDeduction'))); set('home-rts', money(sum('rtsIncome')));
    const recent = document.getElementById('home-recent'); if (!recent) return; if (!records.length) { recent.className = 'stack-list empty-state'; recent.innerHTML = '<span class="material-icons-round">receipt_long</span><p>ยังไม่มีรายการบันทึก</p>'; return; }
    recent.className = 'stack-list'; recent.innerHTML = records.slice(0, 3).map(r => `<div class="record-card"><span class="record-icon material-icons-round">${r.vehicleType === '2W' ? 'two_wheeler' : 'local_shipping'}</span><div><strong>${r.vehicleType} · Zone ${r.zone}</strong><small>${Number(r.parcel || 0).toLocaleString()} ส่งสำเร็จ · ${r.date}</small></div><div class="record-money">${money(Number(r.netIncentive) || 0)}<small>หัก ${money(Number(r.sameAddressDeduction) || 0)}</small></div></div>`).join('');
  }

  const CURRENT_VERSION = '1.5.0';
  const RELEASES_API = 'https://api.github.com/repos/bangz27/cw-incentive-app/releases/latest';
  const parseVersion = value => String(value || '').replace(/^v/i, '').split('.').map(x => Number.parseInt(x, 10) || 0).slice(0, 3);
  const newerThanCurrent = value => { const a = parseVersion(value), b = parseVersion(CURRENT_VERSION); return a.some((n, i) => n !== b[i] && n > b[i]) && a.map((n, i) => n - b[i]).find(n => n) > 0; };
  const showToast = message => { const toast = document.getElementById('toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); clearTimeout(window.__tbsToastTimer); window.__tbsToastTimer = setTimeout(() => toast.classList.remove('show'), 2000); };
  window.TBSShowToast = showToast;
  async function checkForUpdates(manual = false) {
    const now = Date.now(), last = Number(localStorage.getItem('lastUpdateCheck') || 0);
    if (!manual && last && now - last < 86400000) return;
    if (!navigator.onLine && !manual) return;
    try {
      const response = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
      if (!response.ok) throw new Error(`GitHub API ${response.status}`);
      const release = await response.json();
      localStorage.setItem('lastUpdateCheck', String(now));
      if (release.draft || release.prerelease || !newerThanCurrent(release.tag_name)) { document.getElementById('update-card')?.classList.add('hidden'); if (manual) showToast('คุณใช้เวอร์ชันล่าสุดแล้ว'); return; }
      const apk = (release.assets || []).find(asset => /\.apk$/i.test(asset.name));
      if (!apk) return;
      const card = document.getElementById('update-card'); if (!card) return;
      card.dataset.apkUrl = apk.browser_download_url; card.classList.remove('hidden');
      const message = document.getElementById('update-message'); if (message) message.textContent = `TBS Incentive V${String(release.tag_name).replace(/^v/i, '')}`;
      document.getElementById('update-now')?.addEventListener('click', () => window.open(card.dataset.apkUrl, '_blank', 'noopener,noreferrer'), { once: true });
      document.getElementById('update-later')?.addEventListener('click', () => card.classList.add('hidden'), { once: true });
    } catch (error) { if (manual) showToast('ตรวจสอบการอัปเดตไม่ได้ — แอปยังใช้งานต่อได้'); }
  }
  let editingProfileId = current().profileId || null;
  document.getElementById('home-date-picker')?.addEventListener('click', () => { const r = readRange(); document.getElementById('range-from').value = r.from; document.getElementById('range-to').value = r.to; document.getElementById('date-range-editor').classList.remove('hidden'); });
  document.getElementById('range-cancel')?.addEventListener('click', () => document.getElementById('date-range-editor').classList.add('hidden'));
  document.querySelectorAll('[data-range-preset]').forEach(button => button.addEventListener('click', () => { const preset = button.dataset.rangePreset; document.querySelectorAll('[data-range-preset]').forEach(x => x.classList.toggle('active', x === button)); const now = new Date(); const year = now.getFullYear(), month = now.getMonth(); let from, to; if (preset === 'today') { from = to = dateValue(now); } else if (preset === '2w') { from = dateValue(new Date(year, month - 1, 26)); to = dateValue(new Date(year, month, 25)); } else if (preset === '4w-mid') { from = dateValue(new Date(year, month - 1, 11)); to = dateValue(new Date(year, month - 1, 25)); } else if (preset === '4w-end') { from = dateValue(new Date(year, month - 1, 26)); to = dateValue(new Date(year, month, 10)); } else return; document.getElementById('range-from').value = from; document.getElementById('range-to').value = to; saveRange({ from, to }); document.getElementById('date-range-editor').classList.add('hidden'); renderHome(); }));
  document.getElementById('range-apply')?.addEventListener('click', () => { const from = document.getElementById('range-from').value, to = document.getElementById('range-to').value; if (!from || !to || from > to) return alert('กรุณาเลือกช่วงวันที่ให้ถูกต้อง'); saveRange({ from, to }); document.getElementById('date-range-editor').classList.add('hidden'); renderHome(); });
  const codNotificationBaseId = 22000;
  const codReminderIds = Array.from({length: 366}, (_, i) => ({id: codNotificationBaseId + i}));
  const localNotifications = () => window.capacitorLocalNotifications?.LocalNotifications || window.Capacitor?.Plugins?.LocalNotifications || null;
  const dateKey = d => { const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; };
  const hasTodayRecord = () => (window.CWRecordModel?.readRecords(localStorage) || []).some(r => String(r.date) === dateKey(new Date()));
  const reminderDate = offset => { const d=new Date(); d.setHours(22,0,0,0); d.setDate(d.getDate()+offset); return d; };
  async function cancelCodReminders() { try { await localNotifications()?.cancel({ notifications: codReminderIds }); } catch {} }
  async function scheduleCodReminder() {
    const plugin=localNotifications(); if(!plugin || localStorage.getItem('tbs_cod_notification') !== '1') return;
    try {
      const permission=await plugin.requestPermissions(); if(permission?.display==='denied') { showToast('กรุณาอนุญาตการแจ้งเตือนใน Android Settings'); return; }
      await plugin.createChannel?.({id:'cod-reminders',name:'COD reminders',description:'แจ้งเตือน COD รายวัน',importance:4}); await cancelCodReminders();
      const notifications=[]; const skipToday=hasTodayRecord();
      for(let offset=0; offset<366; offset++) { if(offset===0 && skipToday) continue; const d=reminderDate(offset); notifications.push({id:codNotificationBaseId+offset,title:'TBS Incentive',body:'อย่าลืมโอน COD นะ',channelId:'cod-reminders',schedule:{at:d,allowWhileIdle:true},smallIcon:'ic_launcher'}); }
      if(notifications.length) await plugin.schedule({notifications});
    } catch(error) { if(localStorage.getItem('tbs_cod_notification')==='1') showToast('ไม่สามารถตั้งแจ้งเตือน COD ได้'); }
  }
  const codToggle=document.getElementById('cod-notification-toggle'); if(codToggle) { codToggle.checked=localStorage.getItem('tbs_cod_notification')==='1'; codToggle.addEventListener('change', async () => { if(codToggle.checked) { localStorage.setItem('tbs_cod_notification','1'); await scheduleCodReminder(); showToast('เปิดแจ้งเตือน COD แล้ว'); } else { localStorage.setItem('tbs_cod_notification','0'); await cancelCodReminders(); showToast('ปิดแจ้งเตือน COD แล้ว'); } }); }
  window.TBSScheduleCodReminder=scheduleCodReminder; scheduleCodReminder();
  document.getElementById('profile-save')?.addEventListener('click', () => { const old = current(), fullName = document.getElementById('profile-name').value.trim(), hub = document.getElementById('profile-hub').value.trim(), position = document.getElementById('profile-position').value; if (!fullName) { window.TBSShowToast?.('กรุณากรอกชื่อ-นามสกุล'); return; } if (!position) { document.getElementById('profile-position')?.classList.add('validation-error'); window.TBSShowToast?.('กรุณาเลือกตำแหน่ง'); return; } document.getElementById('profile-position')?.classList.remove('validation-error'); const p = profiles.save({ firebaseUid: old.firebaseUid, email: old.email || '', displayName: old.displayName || fullName, photoURL: old.photoURL || '', customPhoto: old.customPhoto || old.photo || '', fullName, hub, position, employeeId: old.employeeId || '', driverId: old.driverId || '' }, editingProfileId); editingProfileId = p.profileId; renderProfile(); window.TBSShowToast?.('บันทึกโปรไฟล์แล้ว'); });
  const photoInput = document.getElementById('profile-photo-input'), cameraInput = document.getElementById('profile-camera-input');
  const choosePhoto = () => photoInput?.click();
  const savePhotoData = async dataUrl => { const p = current(); if (!p.profileId) { alert('กรุณาบันทึกโปรไฟล์ก่อนเพิ่มรูป'); return; } profiles.save({ ...p, customPhoto: dataUrl }, p.profileId); renderProfile(); };
  const savePhotoFile = async input => { const file = input?.files?.[0]; if (!file) return; try { await savePhotoData(await resizePhoto(file)); } catch (e) { alert(e.message); } finally { input.value = ''; } };
  const chooseCamera = async () => {
    try {
      const cameraApi = window.capacitorCamera?.Camera || window.Capacitor?.Plugins?.Camera;
      if (cameraApi?.getPhoto) {
        const enums = window.capacitorCamera || {};
        const photo = await cameraApi.getPhoto({ source: enums.CameraSource?.Camera || 'CAMERA', resultType: enums.CameraResultType?.DataUrl || 'dataUrl', direction: enums.CameraDirection?.Rear || 'REAR', quality: 78, width: 512, height: 512, allowEditing: false });
        if (photo?.dataUrl) { await savePhotoData(photo.dataUrl); return; }
      }
      cameraInput?.click();
    } catch (e) { if (e?.message !== 'User cancelled photos app') alert(e.message || 'ไม่สามารถเปิดกล้องได้'); }
  };
  document.getElementById('profile-avatar-button')?.addEventListener('click', choosePhoto); document.getElementById('profile-photo-change')?.addEventListener('click', choosePhoto); document.getElementById('profile-photo-camera')?.addEventListener('click', chooseCamera); photoInput?.addEventListener('change', () => savePhotoFile(photoInput)); cameraInput?.addEventListener('change', () => savePhotoFile(cameraInput));
  document.getElementById('profile-photo-remove')?.addEventListener('click', () => { const p = current(); if (p.profileId) profiles.save({ ...p, customPhoto: '' }, p.profileId); renderProfile(); });
  const paymentSection = (title, items, icon = 'check_circle') => `<section class="payment-detail-section"><h2><span class="material-icons-round">${icon}</span>${title}</h2><div class="payment-detail-list">${items.map(item => `<div class="payment-detail-item"><span class="material-icons-round">${item[0] || 'check'}</span><span><b>${item[1]}</b>${item[2] ? `<small>${item[2]}</small>` : ''}</span></div>`).join('')}</div></section>`;
  const paymentDetailTitle = { twoW: 'รอบจ่าย 2W', mid4W: 'รอบจ่ายกลางเดือน', end4W: 'รอบจ่ายสิ้นเดือน', parcelRate: 'ค่ากล่อง/ส่งสำเร็จ', callBonus: 'เงินรางวัลโทรหาลูกค้า', attendanceBonus: 'เงินรางวัลอัตราการเข้างาน', extra: 'เงินตอบแทนพิเศษ', deductions: 'รายการหัก' };
  let paymentDetailKey = 'twoW';
  function renderPaymentDetail(kind = paymentDetailKey) {
    paymentDetailKey = kind;
    const title = document.getElementById('payment-detail-title'), content = document.getElementById('payment-detail-content');
    if (!title || !content) return;
    title.textContent = paymentDetailTitle[kind] || 'รายละเอียด';
    let body = '';
    const cycleDetails = {
      twoW: { eyebrow: '2W', label: 'รอบจ่าย 2W', range: 'วันที่ 26 เดือนก่อน → วันที่ 25 เดือนปัจจุบัน', items: [['inventory_2', 'ค่ากล่อง/ส่งสำเร็จ', 'คิดตามจำนวนพัสดุส่งสำเร็จและอัตราของแต่ละ Zone'], ['phone_in_talk', 'เงินรางวัลโทรหาลูกค้า', '500 บาท/เดือน'], ['emoji_events', 'เงินรางวัลอัตราการเข้างาน', '1,000 บาท/เดือน'], ['bolt', 'เงินตอบแทนพิเศษ', 'เงินตอบแทนพิเศษตามเงื่อนไข'], ['remove_circle_outline', 'รายการหัก', 'COD / พัสดุสูญหาย / PoD-POOH']] },
      mid4W: { eyebrow: '4W', label: 'รอบจ่ายกลางเดือน', range: 'วันที่ 11 เดือนก่อน → วันที่ 25 เดือนก่อน', items: [['inventory_2', 'ค่ากล่อง/ส่งสำเร็จ', 'คิดตามจำนวนพัสดุส่งสำเร็จและอัตราของแต่ละ Zone'], ['phone_in_talk', 'เงินรางวัลโทรหาลูกค้า', '500 บาท/เดือน'], ['emoji_events', 'เงินรางวัลอัตราการเข้างาน', '1,000 บาท/เดือน'], ['bolt', 'เงินตอบแทนพิเศษ', 'เงินตอบแทนพิเศษตามเงื่อนไข'], ['local_shipping', 'Incentive 4W Own Fleet', 'ข้อมูลสำหรับศึกษาเท่านั้น'], ['remove_circle_outline', 'รายการหัก', 'COD / พัสดุสูญหาย / PoD-POOH']] },
      end4W: { eyebrow: '4W', label: 'รอบจ่ายสิ้นเดือน', range: 'วันที่ 26 เดือนก่อน → วันที่ 10 เดือนปัจจุบัน', items: [['inventory_2', 'ค่ากล่อง/ส่งสำเร็จ', 'คิดตามจำนวนพัสดุส่งสำเร็จ'], ['bolt', 'เงินตอบแทนพิเศษ', 'เงินตอบแทนพิเศษตามเงื่อนไข'], ['local_shipping', 'Incentive 4W Own Fleet', 'ข้อมูลสำหรับศึกษาเท่านั้น'], ['remove_circle_outline', 'รายการหัก', 'COD / พัสดุสูญหาย / PoD-POOH']] }
    };
    if (cycleDetails[kind]) { const cycle = cycleDetails[kind]; body = `<div class="card payment-detail-card"><div class="payment-detail-summary"><span class="payment-info-intro-icon material-icons-round">event</span><div><span class="eyebrow">${cycle.eyebrow}</span><b>${cycle.label}</b><small>${cycle.range}</small></div></div>${paymentSection(kind === 'twoW' ? 'รายละเอียด 2W' : 'รายละเอียด 4W', cycle.items)}</div>`; }
    else if (kind === 'parcelRate') body = `<div class="card payment-detail-card">${paymentSection('โครงสร้างการจ่าย', [['inventory_2', 'คิดตามจำนวนพัสดุส่งสำเร็จ', 'จำนวนพัสดุที่ส่งสำเร็จเป็นข้อมูลหลักของการจ่าย'], ['map', 'อัตราขึ้นกับ Zone Z1–Z16', 'ตรวจสอบอัตราตาม Zone ของรายการ'], ['two_wheeler', 'แยกตาม 2W / 4W / Own Fleet', 'ข้อมูลนี้เป็นคำอธิบาย ไม่แก้ Calculation Engine เดิม']])}</div>`;
    else if (kind === 'callBonus') body = `<div class="card payment-detail-card">${paymentSection('เงื่อนไขเงินรางวัล', [['payments', '500 บาท/เดือน', 'เงินรางวัลโทรหาลูกค้า'], ['phone_in_talk', 'โทรก่อนจัดส่ง ≥95%', 'สัดส่วนการโทรต้องเป็นไปตามเงื่อนไข'], ['podcasts', 'ต้องโทรผ่านระบบ POD', 'ใช้ข้อมูลจากระบบ POD เป็นหลัก'], ['date_range', 'มีเงื่อนไข Pro-rate', 'กรณีทำงานไม่ครบเดือน']])}</div>`;
    else if (kind === 'attendanceBonus') body = `<div class="card payment-detail-card">${paymentSection('เงื่อนไขเงินรางวัล', [['payments', '1,000 บาท/เดือน', 'เงินรางวัลอัตราการเข้างาน'], ['event_available', 'ไม่ขาดงาน / ไม่มาสาย / ไม่ลา', 'ต้องรักษาเงื่อนไขการทำงานครบถ้วน'], ['verified', 'Attendance 100%', 'อัตราการเข้างานเต็มตามเงื่อนไข'], ['sentiment_satisfied', 'ไม่มีข้อร้องเรียนจากลูกค้า', 'พิจารณาตามเงื่อนไขที่เกี่ยวข้อง'], ['schedule', 'คืน COD ภายใน 23:00 น.', 'ปฏิบัติตามเวลาที่กำหนด']])}</div>`;
    else if (kind === 'extra') body = `<div class="payment-extra-cards"><div class="card payment-detail-card payment-extra-card">${paymentSection('งาน First Mile สำหรับ Lastmile', [['home', 'งานเข้ารับตามบ้าน', '*สอบถามกับทาง Hub, Supervisor'], ['inventory_2', 'งาน RTS', 'การจ่าย ชิ้นละ 1.5 บาท']])}</div><div class="card payment-detail-card payment-extra-card">${paymentSection('ค่าวิ่งไกล', [['local_shipping', '*สอบถามกับทาง Hub, Supervisor']])}</div><div class="card payment-detail-card payment-extra-card">${paymentSection('Buyer Return (RR)', [['replay', 'การจ่าย = จำนวนกล่อง × เรทตัวแรกของ Zone']])}</div></div>`;
    else if (kind === 'deductions') body = `<div class="card payment-detail-card">${paymentSection('รายการที่อาจถูกหัก', [['payments', 'COD', 'รายการที่เกี่ยวข้องกับการคืนหรือโอน COD'], ['inventory_2', 'พัสดุสูญหาย', 'ตรวจสอบตามเงื่อนไขที่เกี่ยวข้อง'], ['report_problem', 'PoD / POOH Penalty', 'รายการหักตามเงื่อนไข'], ['remove_circle_outline', 'Penalty อื่นตามเงื่อนไข', 'ศึกษาจากเอกสารหรือประกาศที่เกี่ยวข้อง']])}</div>`;
    content.innerHTML = `${body}<p class="payment-info-disclaimer"><span class="material-icons-round">info</span><span>ข้อมูลนี้เป็น Static Information สำหรับศึกษาเท่านั้น ไม่ได้เพิ่มการคำนวณรายการหักหรือ Payroll อัตโนมัติ</span></p>`;
  }
  document.querySelectorAll('[data-payment-detail]').forEach(button => button.addEventListener('click', () => { showView('view-payment-detail'); renderPaymentDetail(button.dataset.paymentDetail); }));
  document.getElementById('payment-detail-back')?.addEventListener('click', () => goBackInApp('view-payment-details'));
  const resetDialog = document.getElementById('reset-data-dialog');
  const closeResetDialog = () => resetDialog?.classList.add('hidden');
  const clearTemporaryData = async () => {
    try { sessionStorage.clear(); } catch {}
    localStorage.removeItem('lastUpdateCheck');
    try { if (window.caches) { const cacheNames = await window.caches.keys(); await Promise.all(cacheNames.map(name => window.caches.delete(name))); } } catch {}
    showToast('✓ เคลียร์แคชสำเร็จ');
  };
  const resetApplicationData = () => {
    localStorage.clear();
    window.cwEditingRecordId = null;
    window.cwCurrentCalculation = null;
    document.getElementById('btn-reset')?.click();
    window.dispatchEvent(new Event('historyUpdated'));
    renderProfile(); renderHome(); navigationStack.length = 0; showView('view-home');
    closeResetDialog(); showToast('✓ Reset ข้อมูลสำเร็จ');
    window.setTimeout(() => window.location.reload(), 2100);
  };
  document.getElementById('settings-clear-cache')?.addEventListener('click', clearTemporaryData);
  document.getElementById('settings-reset-data')?.addEventListener('click', () => resetDialog?.classList.remove('hidden'));
  document.getElementById('reset-data-cancel')?.addEventListener('click', closeResetDialog);
  resetDialog?.querySelector('[data-reset-cancel]')?.addEventListener('click', closeResetDialog);
  document.getElementById('reset-data-confirm')?.addEventListener('click', resetApplicationData);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !resetDialog?.classList.contains('hidden')) closeResetDialog(); });
  document.getElementById('check-updates')?.addEventListener('click', () => checkForUpdates(true)); document.getElementById('profile-manual')?.addEventListener('click', () => showView('view-guide')); document.getElementById('guide-back')?.addEventListener('click', () => goBackInApp()); document.getElementById('profile-contact')?.addEventListener('click', () => showView('view-contact')); document.getElementById('contact-back')?.addEventListener('click', () => goBackInApp()); document.getElementById('profile-about')?.addEventListener('click', () => showView('view-about')); document.getElementById('about-back')?.addEventListener('click', () => goBackInApp()); document.getElementById('header-refresh')?.addEventListener('click', () => document.getElementById('btn-reset')?.click());
  document.getElementById('profile-payment-details')?.addEventListener('click', () => showView('view-payment-details')); document.getElementById('payment-details-back')?.addEventListener('click', () => goBackInApp());
  document.getElementById('profile-share')?.addEventListener('click', async () => { const url = 'https://github.com/bangz27/cw-incentive-app/releases/download/v1.5/TBS-Incentive-v1.5.apk'; const title = 'TBS Incentive'; const text = 'ลิงก์ดาวน์โหลด Production จะพร้อมใช้งานเมื่อ Signed APK ถูกเผยแพร่'; if (!url) { showToast('ลิงก์ดาวน์โหลด Production ยังไม่พร้อมใช้งาน'); return; } try { if (typeof navigator.share === 'function') { await navigator.share({ title, text, url }); return; } } catch (error) { if (error?.name === 'AbortError') return; } const message = `${title}\n${text}\n${url}`; try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(message); showToast('คัดลอกลิงก์ดาวน์โหลดแล้ว'); return; } } catch (error) { /* Continue to the browser fallback. */ } window.open(url, '_blank', 'noopener,noreferrer'); });
  document.querySelectorAll('[data-guide-vehicle]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-guide-vehicle]').forEach(x => x.classList.toggle('active', x === button)); const detail = document.getElementById('guide-detail'); if (detail) detail.innerHTML = button.dataset.guideVehicle === '2W' ? '<h2>วิธีใช้งาน 2W</h2><p class="muted">กรอกวันที่ โซน และจำนวนส่งสำเร็จ ระบบคำนวณ Progressive Tier ของ 2W อัตโนมัติ ตรวจ RTS (฿1.50/ชิ้น) บ้านซ้ำ และ Net Incentive ก่อนบันทึก</p>' : '<h2>วิธีใช้งาน 4W</h2><p class="muted">กรอกวันที่ โซน จำนวน Size S และ Size L ระบบคำนวณ Progressive Tier ของ 4W อัตโนมัติ ตรวจ RTS (฿1.50/ชิ้น) บ้านซ้ำ และ Net Incentive ก่อนบันทึก</p>'; })); document.getElementById('profile-support')?.addEventListener('click', () => showView('view-support')); document.getElementById('support-back')?.addEventListener('click', () => goBackInApp());
  document.querySelectorAll('.banner-close').forEach(button => button.addEventListener('click', () => button.closest('.profile-autofill-banner,.rts-help')?.classList.add('is-hidden'))); document.getElementById('calculator-create-profile')?.addEventListener('click', () => showView('view-profile'));
  window.addEventListener('activeProfileChanged', renderProfile); window.addEventListener('historyUpdated', renderHome); renderProfile(); renderHome(); showView('view-home'); checkForUpdates(false);
});
