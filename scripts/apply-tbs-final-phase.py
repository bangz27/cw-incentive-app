from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]

# Visible branding only; preserve package and storage keys.
for rel in ['index.html', 'app.js', 'package.json', 'capacitor.config.json']:
    p = root / rel
    s = p.read_text()
    s = s.replace('CW Incentive', 'TBS Incentive')
    p.write_text(s)

index = root / 'index.html'
s = index.read_text()
s = s.replace('<script src="two-w-config.js"></script>', '<script src="profile-store.js"></script><script src="two-w-config.js"></script>')
s = s.replace('<div class="google-prep-card" id="google-login-prep">', '<div class="google-prep-card" id="google-login-prep">')
# Add a profile manager beneath the existing profile form.
needle = '      <div class="settings-list"><button class="settings-row" id="profile-share">'
insert = '''      <div class="card profile-manager-card"><div class="section-heading"><h2>โปรไฟล์ที่ใช้งานอยู่</h2><button type="button" class="text-button" id="profile-new">+ สร้างใหม่</button></div><div id="profile-list" class="profile-list"></div></div>\n      <div class="settings-list"><button class="settings-row" id="profile-share">'''
if needle in s:
    s = s.replace(needle, insert)
# Add profile fields that support Firebase-ready data while keeping local UX.
old = '<div class="card form-card"><label class="field"><span>ชื่อ-นามสกุล</span><input id="profile-name" type="text" placeholder="กรอกชื่อ-นามสกุล"></label>'
new = '<div class="card form-card"><label class="field"><span>ชื่อ-นามสกุล</span><input id="profile-name" type="text" placeholder="กรอกชื่อ-นามสกุล"></label><label class="field"><span>อีเมล</span><input id="profile-email" type="email" placeholder="ยังไม่ได้เชื่อมต่อ Google"></label>'
if old in s: s = s.replace(old, new)
# Make app script load profile store before app logic.
s = s.replace('<script src="app.js"></script>', '<script src="app.js"></script>')
index.write_text(s)

# Replace app.js with a profile-aware UI adapter, preserving history/dashboard wiring and existing record model.
app = root / 'app.js'
app.write_text(r'''document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const profiles = window.TBSProfiles;
  const initials = name => String(name || 'TB').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'TB';
  const current = () => profiles?.getActive() || {};
  const photoOf = p => profiles?.photo(p) || '';
  const setAvatar = (element, p) => { if (!element) return; const src=photoOf(p); element.innerHTML=src?`<img src="${src}" alt="รูปโปรไฟล์">`:initials(p.fullName||p.displayName); };
  const resizePhoto = file => new Promise((resolve,reject)=>{if(!file||!['image/jpeg','image/png'].includes(file.type))return reject(new Error('รองรับเฉพาะ JPG, JPEG หรือ PNG'));const reader=new FileReader();reader.onerror=()=>reject(new Error('ไม่สามารถอ่านรูปได้'));reader.onload=()=>{const image=new Image();image.onerror=()=>reject(new Error('ไฟล์รูปไม่ถูกต้อง'));image.onload=()=>{const max=512,scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.78));};image.src=reader.result;};reader.readAsDataURL(file);});
  const setTheme = theme => { root.dataset.theme=theme; localStorage.setItem('incentive_theme',theme); document.querySelectorAll('.theme-icon').forEach(x=>x.textContent=theme==='dark'?'light_mode':'dark_mode'); };
  setTheme(localStorage.getItem('incentive_theme')||'light');
  document.querySelectorAll('.theme-toggle').forEach(btn=>btn.addEventListener('click',()=>setTheme(root.dataset.theme==='dark'?'light':'dark')));
  function showView(target){document.querySelectorAll('.view-section').forEach(v=>v.classList.toggle('active',v.id===target));document.querySelectorAll('[data-target]').forEach(n=>n.classList.toggle('active',n.dataset.target===target&&n.classList.contains('nav-item')));document.querySelector('.app-content')?.scrollTo({top:0,behavior:'smooth'});if(target==='view-home')renderHome();}
  document.querySelectorAll('[data-target]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();if(link.dataset.vehicle)window.dispatchEvent(new CustomEvent('vehicleSelected',{detail:link.dataset.vehicle}));showView(link.dataset.target);}));
  window.addEventListener('showView',e=>showView(e.detail));
  function fillForm(p){[['profile-name','fullName'],['profile-email','email'],['profile-hub','hub'],['profile-position','position'],['profile-employee','employeeId'],['profile-driver','driverId']].forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.value=p?.[key]||'';});}
  function renderProfileList(){const list=document.getElementById('profile-list');if(!list)return;const active=current(), all=profiles?.all()||[];if(!all.length){list.innerHTML='<div class="empty-profile">ยังไม่มีโปรไฟล์ในเครื่อง</div>';return;}list.innerHTML=all.map(p=>`<div class="profile-row ${p.profileId===active?.profileId?'active':''}" data-profile-id="${p.profileId}"><span class="profile-row-avatar">${photoOf(p)?`<img src="${photoOf(p)}" alt="">`:initials(p.fullName||p.displayName)}</span><span class="profile-row-main"><b>${p.fullName||p.displayName||'ไม่มีชื่อ'}</b><small>${p.hub||'ยังไม่ระบุ Hub'} · ${p.position||'ยังไม่ระบุตำแหน่ง'}</small></span>${p.profileId===active?.profileId?'<span class="active-label">ใช้งานอยู่</span>':''}<button type="button" class="icon-button profile-edit" data-edit-profile="${p.profileId}" aria-label="แก้ไขโปรไฟล์"><span class="material-icons-round">edit</span></button>${p.profileId!==active?.profileId?`<button type="button" class="icon-button profile-delete" data-delete-profile="${p.profileId}" aria-label="ลบโปรไฟล์"><span class="material-icons-round">delete</span></button>`:''}</div>`).join('');list.querySelectorAll('[data-profile-id]').forEach(row=>row.addEventListener('click',e=>{if(e.target.closest('button'))return;profiles.setActive(row.dataset.profileId);renderProfile();}));list.querySelectorAll('[data-edit-profile]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const p=(profiles.all()||[]).find(x=>x.profileId===b.dataset.editProfile);if(p){profiles.setActive(p.profileId);fillForm(p);showView('view-profile');}}));list.querySelectorAll('[data-delete-profile]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();if(confirm('ต้องการลบโปรไฟล์นี้หรือไม่?')){profiles.remove(b.dataset.deleteProfile);renderProfile();}}));}
  function renderProfile(){const p=current(), name=p.fullName||p.displayName||'';const homeGreeting=document.getElementById('home-greeting');if(homeGreeting)homeGreeting.textContent=name?`สวัสดี, ${name}`:'เริ่มคำนวณรายได้ของคุณ';document.querySelectorAll('#home-avatar,#profile-avatar,#calculator-avatar').forEach(x=>setAvatar(x,p));const chip=document.getElementById('calculator-profile-name');if(chip)chip.textContent=name||'ยังไม่ได้เลือกโปรไฟล์';const missing=document.getElementById('calculator-profile-missing');if(missing)missing.classList.toggle('hidden',Boolean(name&&p.hub));const calcName=document.getElementById('calc-rider');if(calcName)calcName.value=name;const calcHub=document.getElementById('calc-hub');if(calcHub)calcHub.value=p.hub||'';const preview=document.getElementById('profile-preview-name');if(preview)preview.textContent=name||'ยังไม่ได้สร้างโปรไฟล์';fillForm(p);renderProfileList();}
  function renderHome(){const records=window.CWRecordModel?window.CWRecordModel.readRecords(localStorage):[],today=new Date().toISOString().slice(0,10),rows=records.filter(r=>r.date===today),sum=k=>rows.reduce((a,r)=>a+(Number(r[k])||0),0),money=n=>`฿${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`,set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};set('home-net',money(sum('netIncentive')));set('home-parcel',sum('parcel').toLocaleString());set('home-same',sum('sameAddressCount').toLocaleString());set('home-deduction',money(sum('sameAddressDeduction')));const recent=document.getElementById('home-recent');if(!recent)return;if(!records.length){recent.className='stack-list empty-state';recent.innerHTML='<span class="material-icons-round">receipt_long</span><p>ยังไม่มีรายการบันทึก</p>';return;}recent.className='stack-list';recent.innerHTML=records.slice(0,3).map(r=>`<div class="record-card"><span class="record-icon material-icons-round">${r.vehicleType==='2W'?'two_wheeler':'local_shipping'}</span><div><strong>${r.vehicleType} · Zone ${r.zone}</strong><small>${Number(r.parcel||0).toLocaleString()} ส่งสำเร็จ · ${r.date}</small></div><div class="record-money">${money(Number(r.netIncentive)||0)}<small>หัก ${money(Number(r.sameAddressDeduction)||0)}</small></div></div>`).join('');}
  document.getElementById('profile-save')?.addEventListener('click',()=>{const old=current(),p=profiles.save({firebaseUid:old.firebaseUid,email:document.getElementById('profile-email').value.trim(),displayName:old.displayName||document.getElementById('profile-name').value.trim(),photoURL:old.photoURL||'',customPhoto:old.customPhoto||old.photo||'',fullName:document.getElementById('profile-name').value.trim(),hub:document.getElementById('profile-hub').value.trim(),position:document.getElementById('profile-position').value,employeeId:document.getElementById('profile-employee').value.trim(),driverId:document.getElementById('profile-driver').value.trim()},old.profileId);renderProfile();alert('บันทึกโปรไฟล์แล้ว');});
  document.getElementById('profile-new')?.addEventListener('click',()=>{fillForm({});document.getElementById('profile-preview-name').textContent='สร้างโปรไฟล์ใหม่';});
  const photoInput=document.getElementById('profile-photo-input'),choosePhoto=()=>photoInput?.click();document.getElementById('profile-avatar-button')?.addEventListener('click',choosePhoto);document.getElementById('profile-photo-change')?.addEventListener('click',choosePhoto);photoInput?.addEventListener('change',async()=>{const f=photoInput.files?.[0];if(!f)return;try{const p=current();profiles.save({...p,customPhoto:await resizePhoto(f)},p.profileId);renderProfile();}catch(e){alert(e.message)}finally{photoInput.value=''}});document.getElementById('profile-photo-remove')?.addEventListener('click',()=>{const p=current();profiles.save({...p,customPhoto:''},p.profileId);renderProfile()});
  document.getElementById('google-login-button')?.addEventListener('click',()=>alert('Google Login ยังรอการตั้งค่า Firebase ของเจ้าของแอป'));document.getElementById('calculator-create-profile')?.addEventListener('click',()=>showView('view-profile'));document.getElementById('profile-share')?.addEventListener('click',()=>{const url='https://github.com/bangz27/cw-incentive-app/releases/download/v1.1/CW-Incentive.apk';if(navigator.share)navigator.share({title:'TBS Incentive v1.1',url});else navigator.clipboard?.writeText(url).then(()=>alert('คัดลอกลิงก์ดาวน์โหลดแล้ว'))});document.getElementById('profile-about')?.addEventListener('click',()=>alert('TBS Incentive\nPowered by #BaNGz'));
  window.addEventListener('activeProfileChanged',renderProfile);window.addEventListener('historyUpdated',renderHome);renderProfile();renderHome();
});
''')

# Update calculator profile source without touching calculation calls.
calc = root / 'calculator.js'
s = calc.read_text()
s = re.sub(r"function loadProfileIntoForm\(\)\{.*?\}", "function loadProfileIntoForm(){try{const p=window.TBSProfiles?.getActive()||{};$('calc-rider').value=p.fullName||p.displayName||'';$('calc-hub').value=p.hub||'';}catch{$('calc-rider').value='';$('calc-hub').value='';}}", s)
calc.write_text(s)

# Firebase architecture preparation: explicit non-authenticated adapter and docs, no credentials/dependencies.
(root / 'firebase-auth.js').write_text('''/* Firebase authentication boundary. Real Firebase Sign-In is intentionally disabled until project configuration is supplied. */\nwindow.TBSFirebaseAuth = { configured:false, signInGoogle(){ throw new Error('Firebase configuration is required before Google Login can be enabled.'); }, signOut(){ return Promise.resolve(); } };\n''')
idx = root / 'index.html'; s=idx.read_text(); s=s.replace('<script src="profile-store.js"></script>', '<script src="profile-store.js"></script><script src="firebase-auth.js"></script>'); idx.write_text(s)

# Update visible Android strings and platform config.
strings = root / 'android/app/src/main/res/values/strings.xml'; s=strings.read_text().replace('CW Incentive','TBS Incentive'); strings.write_text(s)
cap = root / 'capacitor.config.json'; s=cap.read_text().replace('CW Incentive','TBS Incentive'); cap.write_text(s)
