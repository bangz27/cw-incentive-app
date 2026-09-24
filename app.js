document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const profiles = window.TBSProfiles;
  const initials = name => String(name || 'TB').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'TB';
  const current = () => profiles?.getActive() || {};
  const photoOf = p => profiles?.photo(p) || '';
  const resizePhoto = file => new Promise((resolve, reject) => { if (!file || !['image/jpeg','image/png'].includes(file.type)) return reject(new Error('รองรับเฉพาะ JPG, JPEG หรือ PNG')); const reader = new FileReader(); reader.onerror = () => reject(new Error('ไม่สามารถอ่านรูปได้')); reader.onload = () => { const image = new Image(); image.onerror = () => reject(new Error('ไฟล์รูปไม่ถูกต้อง')); image.onload = () => { const max = 512, scale = Math.min(1, max / Math.max(image.width, image.height)), canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale)); const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', .78)); }; image.src = reader.result; }; reader.readAsDataURL(file); });
  const setAvatar = (element, p) => { if (!element) return; const src = photoOf(p); element.innerHTML = src ? `<img src="${src}" alt="รูปโปรไฟล์">` : initials(p.fullName || p.displayName); };
  const money = n => `฿${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const formatDate = value => { if (!value) return 'เลือกช่วงวันที่'; const [y, m, d] = value.split('-'); return `${d}/${m}/${y}`; };
  const defaultRange = () => { const end = today(); const start = new Date(`${end}T00:00:00`); start.setDate(start.getDate() - 29); return { from: start.toISOString().slice(0, 10), to: end }; };
  const readRange = () => { try { const r = JSON.parse(localStorage.getItem('cw_home_date_range') || 'null'); return r?.from && r?.to ? r : defaultRange(); } catch { return defaultRange(); } };
  const saveRange = r => localStorage.setItem('cw_home_date_range', JSON.stringify(r));
  const setTheme = theme => { root.dataset.theme = theme; localStorage.setItem('incentive_theme', theme); document.querySelectorAll('.theme-icon').forEach(x => x.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode'); };
  setTheme(localStorage.getItem('incentive_theme') || 'light');
  document.querySelector('.theme-toggle')?.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

  function showView(target) {
    const safeTarget = target === 'view-summary' || target === 'view-dashboard' ? 'view-history' : target;
    document.querySelectorAll('.view-section').forEach(v => v.classList.toggle('active', v.id === safeTarget));
    document.querySelector('.app-shell')?.classList.toggle('calculator-fixed-layer', safeTarget === 'view-calculator');
    document.querySelectorAll('[data-target]').forEach(n => n.classList.toggle('active', n.dataset.target === safeTarget && n.classList.contains('nav-item')));
    const contexts = {'view-home':['TBS Incentive','สรุปรายได้ของคุณ'],'view-calculator':['TBS Incentive','เลือกตำแหน่งจัดส่ง'],'view-profile':['TBS Incentive','Profile • ข้อมูลของฉัน'],'view-history':['TBS Incentive','รายการ • ประวัติคำนวณ'],'view-settings':['TBS Incentive','Setting • ตั้งค่าและข้อมูลเพิ่มเติม'],'view-guide':['TBS Incentive','คู่มือการใช้งาน'],'view-payment-details':['TBS Incentive','รายละเอียดการทำจ่าย'],'view-support':['TBS Incentive','สนับสนุนค่ากาแฟ'],'view-about':['TBS Incentive','นโยบายความเป็นส่วนตัว'],'view-contact':['TBS Incentive','ข้อมูลการติดต่อ']};
    const context = contexts[safeTarget] || contexts['view-home'];
    const title = document.getElementById('header-title'), subtitle = document.getElementById('header-subtitle'), refresh = document.getElementById('header-refresh');
    if (title) title.textContent = context[0]; if (subtitle) subtitle.textContent = context[1]; refresh?.classList.toggle('hidden', safeTarget !== 'view-calculator');
    if (safeTarget === 'view-home') renderHome();
  }
  document.querySelectorAll('[data-target]').forEach(link => link.addEventListener('click', e => { e.preventDefault(); if (link.dataset.vehicle) window.dispatchEvent(new CustomEvent('vehicleSelected', { detail: link.dataset.vehicle })); showView(link.dataset.target); }));
  window.addEventListener('showView', e => showView(e.detail));
  let edgeSwipe = null; document.addEventListener('touchstart', e => { const t=e.touches?.[0]; const active=document.querySelector('.view-section.active')?.id; if(!t || t.clientX>28 || !['view-guide','view-payment-details','view-support','view-about','view-contact'].includes(active)) { edgeSwipe=null; return; } edgeSwipe={x:t.clientX,y:t.clientY}; }, { passive:true }); document.addEventListener('touchmove', e => { if(!edgeSwipe) return; const t=e.touches?.[0]; if(!t) return; const dx=t.clientX-edgeSwipe.x, dy=Math.abs(t.clientY-edgeSwipe.y); if(dx>12 && dx>dy) { e.preventDefault(); edgeSwipe.horizontal=true; } }, { passive:false }); document.addEventListener('touchend', e => { const t=e.changedTouches?.[0]; if(edgeSwipe && t && edgeSwipe.horizontal && t.clientX-edgeSwipe.x>=72 && Math.abs(t.clientY-edgeSwipe.y)<80) showView('view-settings'); edgeSwipe=null; }, { passive:true }); document.addEventListener('touchcancel',()=>{edgeSwipe=null;},{passive:true});

  function fillForm(p) { [['profile-name', 'fullName'], ['profile-hub', 'hub'], ['profile-position', 'position']].forEach(([id, key]) => { const el = document.getElementById(id); if (el) el.value = p?.[key] || ''; }); }
  function renderProfile() { const p = current(), name = p.fullName || p.displayName || ''; const greeting = document.getElementById('home-greeting'); if (greeting) greeting.textContent = name ? `สวัสดี, ${name}` : 'เริ่มคำนวณรายได้ของคุณ'; document.querySelectorAll('#home-avatar,#profile-avatar').forEach(x => setAvatar(x, p)); const preview = document.getElementById('profile-preview-name'); if (preview) preview.textContent = name || 'ยังไม่ได้สร้างโปรไฟล์'; fillForm(p); }

  function renderHome() {
    const records = window.CWRecordModel ? window.CWRecordModel.readRecords(localStorage) : [], range = readRange();
    const rows = records.filter(r => String(r.date) >= range.from && String(r.date) <= range.to);
    const sum = key => rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set('home-date-range', `${formatDate(range.from)} – ${formatDate(range.to)}`); set('home-net', money(sum('netIncentive'))); set('home-parcel', sum('parcel').toLocaleString()); set('home-same', sum('sameAddressCount').toLocaleString()); set('home-deduction', money(sum('sameAddressDeduction'))); set('home-rts', money(sum('rtsIncome')));
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
  document.querySelectorAll('[data-range-preset]').forEach(button => button.addEventListener('click', () => { const preset = button.dataset.rangePreset; document.querySelectorAll('[data-range-preset]').forEach(x => x.classList.toggle('active', x === button)); if (preset === 'custom') return; const to = today(); const fromDate = new Date(`${to}T00:00:00`); if (preset !== 'today') fromDate.setDate(fromDate.getDate() - (Number(preset) - 1)); document.getElementById('range-from').value = fromDate.toISOString().slice(0, 10); document.getElementById('range-to').value = to; saveRange({ from: document.getElementById('range-from').value, to }); document.getElementById('date-range-editor').classList.add('hidden'); renderHome(); }));
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
  document.getElementById('check-updates')?.addEventListener('click', () => checkForUpdates(true)); document.getElementById('profile-manual')?.addEventListener('click', () => showView('view-guide')); document.getElementById('guide-back')?.addEventListener('click', () => showView('view-settings')); document.getElementById('profile-contact')?.addEventListener('click', () => showView('view-contact')); document.getElementById('contact-back')?.addEventListener('click', () => showView('view-settings')); document.getElementById('profile-about')?.addEventListener('click', () => showView('view-about')); document.getElementById('about-back')?.addEventListener('click', () => showView('view-settings')); document.getElementById('header-refresh')?.addEventListener('click', () => document.getElementById('btn-reset')?.click());
  document.getElementById('profile-payment-details')?.addEventListener('click', () => showView('view-payment-details')); document.getElementById('payment-details-back')?.addEventListener('click', () => showView('view-settings'));
  document.getElementById('profile-share')?.addEventListener('click', async () => { const url = 'https://github.com/bangz27/cw-incentive-app/releases/download/v1.5/TBS-Incentive-v1.5.apk'; const title = 'TBS Incentive'; const text = 'ลิงก์ดาวน์โหลด Production จะพร้อมใช้งานเมื่อ Signed APK ถูกเผยแพร่'; if (!url) { showToast('ลิงก์ดาวน์โหลด Production ยังไม่พร้อมใช้งาน'); return; } try { if (typeof navigator.share === 'function') { await navigator.share({ title, text, url }); return; } } catch (error) { if (error?.name === 'AbortError') return; } const message = `${title}\n${text}\n${url}`; try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(message); showToast('คัดลอกลิงก์ดาวน์โหลดแล้ว'); return; } } catch (error) { /* Continue to the browser fallback. */ } window.open(url, '_blank', 'noopener,noreferrer'); });
  document.querySelectorAll('[data-guide-vehicle]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-guide-vehicle]').forEach(x => x.classList.toggle('active', x === button)); const detail = document.getElementById('guide-detail'); if (detail) detail.innerHTML = button.dataset.guideVehicle === '2W' ? '<h2>วิธีใช้งาน 2W</h2><p class="muted">กรอกวันที่ โซน และจำนวนส่งสำเร็จ ระบบคำนวณ Progressive Tier ของ 2W อัตโนมัติ ตรวจ RTS (฿1.50/ชิ้น) บ้านซ้ำ และ Net Incentive ก่อนบันทึก</p>' : '<h2>วิธีใช้งาน 4W</h2><p class="muted">กรอกวันที่ โซน จำนวน Size S และ Size L ระบบคำนวณ Progressive Tier ของ 4W อัตโนมัติ ตรวจ RTS (฿1.50/ชิ้น) บ้านซ้ำ และ Net Incentive ก่อนบันทึก</p>'; })); document.getElementById('profile-support')?.addEventListener('click', () => showView('view-support')); document.getElementById('support-back')?.addEventListener('click', () => showView('view-settings'));
  document.querySelectorAll('.banner-close').forEach(button => button.addEventListener('click', () => button.closest('.profile-autofill-banner,.rts-help')?.classList.add('is-hidden'))); document.getElementById('calculator-create-profile')?.addEventListener('click', () => showView('view-profile'));
  window.addEventListener('activeProfileChanged', renderProfile); window.addEventListener('historyUpdated', renderHome); renderProfile(); renderHome(); showView('view-home'); checkForUpdates(false);
});
