document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const profileKey = 'cw_profile';
  const profile = () => { try { return JSON.parse(localStorage.getItem(profileKey) || '{}'); } catch { return {}; } };
  const initials = name => String(name || 'CW').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'CW';
  const setAvatar = (element, profileData, sizeClass='') => { if (!element) return; element.innerHTML = profileData.photo ? `<img src="${profileData.photo}" alt="รูปโปรไฟล์">` : initials(profileData.name); element.classList.toggle('has-photo', Boolean(profileData.photo)); };
  const resizePhoto = file => new Promise((resolve, reject) => { if (!file || !['image/jpeg','image/png'].includes(file.type)) return reject(new Error('รองรับเฉพาะ JPG, JPEG หรือ PNG')); if (file.size > 12 * 1024 * 1024) return reject(new Error('รูปมีขนาดใหญ่เกินไป กรุณาเลือกรูปไม่เกิน 12 MB')); const reader = new FileReader(); reader.onerror = () => reject(new Error('ไม่สามารถอ่านรูปได้')); reader.onload = () => { const image = new Image(); image.onerror = () => reject(new Error('ไฟล์รูปไม่ถูกต้อง')); image.onload = () => { const max=512, scale=Math.min(1,max/Math.max(image.width,image.height)), canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(image.width*scale)); canvas.height=Math.max(1,Math.round(image.height*scale)); const ctx=canvas.getContext('2d'); ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/jpeg',.78)); }; image.src=reader.result; }; reader.readAsDataURL(file); });
  const setTheme = theme => { root.dataset.theme = theme; localStorage.setItem('incentive_theme', theme); document.querySelectorAll('.theme-icon').forEach(x=>x.textContent=theme==='dark'?'light_mode':'dark_mode'); };
  setTheme(localStorage.getItem('incentive_theme') || 'light');
  document.querySelectorAll('.theme-toggle').forEach(btn => btn.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark')));

  function showView(target) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.toggle('active', v.id === target));
    document.querySelectorAll('[data-target]').forEach(n => n.classList.toggle('active', n.dataset.target === target && n.classList.contains('nav-item')));
    document.querySelector('.app-content').scrollTo({top:0, behavior:'smooth'});
    if (target === 'view-home') renderHome();
  }
  document.querySelectorAll('[data-target]').forEach(link => link.addEventListener('click', e => { e.preventDefault(); if (link.dataset.vehicle) window.dispatchEvent(new CustomEvent('vehicleSelected',{detail:link.dataset.vehicle})); showView(link.dataset.target); }));
  window.addEventListener('showView', e => showView(e.detail));

  function renderProfile() {
    const p = profile(); const name = p.name || 'ยังไม่ได้สร้างโปรไฟล์';
    const avatar = initials(p.name);
    const homeGreeting = document.getElementById('home-greeting'); if (homeGreeting) homeGreeting.textContent = p.name ? `สวัสดี, ${p.name}` : 'เริ่มคำนวณรายได้ของคุณ';
    document.querySelectorAll('#home-avatar,#profile-avatar,#calculator-avatar').forEach(x=>setAvatar(x,p));
    const calculatorName=document.getElementById('calculator-profile-name'); if(calculatorName) calculatorName.textContent=p.name||'โปรไฟล์ปัจจุบัน';
    const missing=document.getElementById('calculator-profile-missing'); if(missing) missing.classList.toggle('hidden',Boolean(p.name&&p.hub));
    const calcName=document.getElementById('calc-rider'); if(calcName) calcName.value=p.name||'';
    const calcHub=document.getElementById('calc-hub'); if(calcHub) calcHub.value=p.hub||'';
    const preview = document.getElementById('profile-preview-name'); if (preview) preview.textContent=name;
    [['profile-name','name'],['profile-hub','hub'],['profile-position','position'],['profile-employee','employeeId'],['profile-driver','driverId']].forEach(([id,key])=>{const el=document.getElementById(id); if(el) el.value=p[key]||'';});
  }
  function renderHome() {
    const records = window.CWRecordModel ? window.CWRecordModel.readRecords(localStorage) : [];
    const today = new Date().toISOString().slice(0,10); const rows = records.filter(r=>r.date===today);
    const sum = (key) => rows.reduce((a,r)=>a+(Number(r[key])||0),0);
    const money = n => `฿${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
    set('home-net',money(sum('netIncentive'))); set('home-parcel',sum('parcel').toLocaleString()); set('home-same',sum('sameAddressCount').toLocaleString()); set('home-deduction',money(sum('sameAddressDeduction')));
    const recent=document.getElementById('home-recent'); if(!recent)return;
    if(!records.length){recent.className='stack-list empty-state';recent.innerHTML='<span class="material-icons-round">receipt_long</span><p>ยังไม่มีรายการบันทึก</p>';return;}
    recent.className='stack-list'; recent.innerHTML=records.slice(0,3).map(r=>`<div class="record-card"><span class="record-icon material-icons-round">${r.vehicleType==='2W'?'two_wheeler':'local_shipping'}</span><div><strong>${r.vehicleType} · Zone ${r.zone}</strong><small>${r.parcel.toLocaleString()} ส่งสำเร็จ · ${r.date}</small></div><div class="record-money">${money(r.netIncentive)}<small>หัก ${money(r.sameAddressDeduction)}</small></div></div>`).join('');
  }
  document.getElementById('profile-save')?.addEventListener('click',()=>{const old=profile();const p={name:document.getElementById('profile-name').value.trim(),hub:document.getElementById('profile-hub').value.trim(),position:document.getElementById('profile-position').value,employeeId:document.getElementById('profile-employee').value.trim(),driverId:document.getElementById('profile-driver').value.trim(),photo:old.photo||''};localStorage.setItem(profileKey,JSON.stringify(p));renderProfile();window.dispatchEvent(new Event('activeProfileChanged'));alert('บันทึกโปรไฟล์แล้ว');});
  const photoInput=document.getElementById('profile-photo-input');
  const choosePhoto=()=>photoInput?.click();
  document.getElementById('profile-avatar-button')?.addEventListener('click',choosePhoto);
  document.getElementById('profile-photo-change')?.addEventListener('click',choosePhoto);
  photoInput?.addEventListener('change',async()=>{const file=photoInput.files?.[0];if(!file)return;try{const p=profile();p.photo=await resizePhoto(file);localStorage.setItem(profileKey,JSON.stringify(p));renderProfile();}catch(error){alert(error.message);}finally{photoInput.value='';}});
  document.getElementById('profile-photo-remove')?.addEventListener('click',()=>{const p=profile();delete p.photo;localStorage.setItem(profileKey,JSON.stringify(p));renderProfile();});
  document.getElementById('google-login-button')?.addEventListener('click',()=>alert('Google Login ยังไม่เปิดใช้งาน\nฟีเจอร์นี้เป็นโครงสร้างเตรียมไว้สำหรับการเชื่อมต่อภายหลัง'));
  document.getElementById('calculator-create-profile')?.addEventListener('click',()=>showView('view-profile'));
  document.getElementById('profile-share')?.addEventListener('click',()=>{const url='https://github.com/bangz27/cw-incentive-app/releases/download/v1.1/CW-Incentive.apk'; if(navigator.share) navigator.share({title:'CW Incentive v1.1',url}); else navigator.clipboard?.writeText(url).then(()=>alert('คัดลอกลิงก์ดาวน์โหลดแล้ว'));});
  document.getElementById('profile-about')?.addEventListener('click',()=>alert('CW Incentive\nPowered by #BaNGz'));
  window.addEventListener('historyUpdated', renderHome);
  renderProfile(); renderHome();
});
