const CONFIG = {
  url: "https://cqzuhwzvxrmlezfkbpwv.supabase.co",
  publishableKey: "sb_publishable__mI4pr_ajeeUng7MOtrl9Q_9f5oTzfE",
  ownerUid: "97a8b8ef-53f4-422b-abf0-39247036a072"
};

const { createClient } = window.supabase;
const db = createClient(CONFIG.url, CONFIG.publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
window.TBSLicenseCenter = Object.freeze({ db, config: CONFIG });

let selected = null;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmtDate = v => v ? new Date(v).toLocaleDateString("th-TH",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fmtDateTime = v => v ? new Date(v).toLocaleString("th-TH",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const planText = p => ({TRIAL:"ทดลองใช้ฟรี",MONTHLY:"Monthly",LIFETIME:"Lifetime"}[p] || p || "—");
const statusText = s => ({ACTIVE:"ใช้งานได้",EXPIRED:"หมดอายุ",SUSPENDED:"ถูกระงับ"}[s] || s || "—");
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(window.__toast); window.__toast=setTimeout(()=>t.classList.remove("show"),2300); }
function setLoginError(msg){ $("#loginError").textContent=msg||""; }

async function ensureOwner(){
  const {data:{user}} = await db.auth.getUser();
  if(!user) return false;
  if(user.id !== CONFIG.ownerUid){
    await db.auth.signOut();
    setLoginError("บัญชีนี้ไม่ได้รับสิทธิ์เข้าศูนย์จัดการ");
    return false;
  }
  $("#signedEmail").textContent=user.email || "Owner";
  $("#avatar").textContent=(user.email||"T").slice(0,1).toUpperCase();
  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  return true;
}

async function boot(){
  const ok=await ensureOwner();
  if(!ok){ $("#loginView").classList.remove("hidden"); $("#appView").classList.add("hidden"); }
}
db.auth.onAuthStateChange((_event,session)=>{
  if(session?.user) ensureOwner();
  else { window.TBSDownloadAnalyticsUI?.deactivate(); $("#loginView").classList.remove("hidden"); $("#appView").classList.add("hidden"); }
});

$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault(); setLoginError("");
  const btn=e.currentTarget.querySelector("button"); btn.disabled=true;
  try{
    const {error}=await db.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});
    if(error) throw error;
    const ok=await ensureOwner();
    if(!ok) return;
    toast("เข้าสู่ระบบแล้ว");
  }catch(err){ setLoginError(err.message||"เข้าสู่ระบบไม่สำเร็จ"); }
  finally{btn.disabled=false;}
});
$("#togglePassword").onclick=()=>{ const p=$("#password"); p.type=p.type==="password"?"text":"password"; $("#togglePassword").textContent=p.type==="password"?"ดู":"ซ่อน"; };
$("#logoutBtn").onclick=async()=>{window.TBSDownloadAnalyticsUI?.deactivate();await db.auth.signOut();toast("ออกจากระบบแล้ว");};

const pages={
  home:["OVERVIEW","ภาพรวม"],members:["MEMBERS","สมาชิก"],activity:["AUDIT TRAIL","ประวัติการทำรายการ"],analytics:["DOWNLOAD ANALYTICS","Download Analytics"]
};
$$(".nav-item").forEach(btn=>btn.onclick=()=>{
  const p=btn.dataset.page;
  $$(".nav-item").forEach(x=>x.classList.toggle("active",x===btn));
  Object.keys(pages).forEach(k=>$("#page"+k[0].toUpperCase()+k.slice(1)).classList.toggle("hidden",k!==p));
  $("#pageEyebrow").textContent=pages[p][0];$("#pageTitle").textContent=pages[p][1];
  if(p==="analytics") window.TBSDownloadAnalyticsUI?.activate();
  else window.TBSDownloadAnalyticsUI?.deactivate();
});
$$("[data-focus-search]").forEach(x=>x.onclick=()=>{document.querySelector('[data-page="members"]').click();setTimeout(()=>$("#searchEmail2").focus(),80)});

function resultHTML(row){
  const expires=row.expires_at ? fmtDate(row.expires_at) : "ตลอดชีพ";
  return `<div class="member-result">
    <div class="member-main">
      <div><div class="member-email">${esc(row.email)}</div><div class="member-id">${esc(row.target_user_id)}</div></div>
      <span class="status-pill status-${esc(row.status)}">${statusText(row.status)}</span>
    </div>
    <div class="member-meta">
      <div><span>แพ็กเกจ</span><b>${planText(row.plan)}</b></div>
      <div><span>วันหมดอายุ</span><b>${expires}</b></div>
      <div><span>คงเหลือ</span><b>${row.plan==="LIFETIME"?"ตลอดชีพ":`${row.remaining_days ?? 0} วัน`}</b></div>
    </div>
    <div class="member-actions">
      <button class="small-btn" data-audit="${esc(row.target_user_id)}">ประวัติ</button>
      <button class="small-btn primary" data-manage="${esc(row.target_user_id)}">จัดการสิทธิ์</button>
    </div>
  </div>`;
}
function showResult(row, targetId){
  const box=$(targetId);
  if(!row){box.className="result-slot empty-result";box.innerHTML=`<div class="empty-icon">?</div><p>ไม่พบบัญชี</p><small>ตรวจสอบอีเมลอีกครั้ง</small>`;return;}
  box.className="result-slot";box.innerHTML=resultHTML(row);
  box.querySelector("[data-manage]").onclick=()=>openModal(row);
  box.querySelector("[data-audit]").onclick=()=>openAudit(row);
}
async function search(email,targetId){
  const box=$(targetId);box.innerHTML=`<div class="empty-result"><p>กำลังค้นหา…</p></div>`;
  const {data,error}=await db.rpc("owner_search_license_users",{p_email:email.trim()});
  if(error){box.innerHTML=`<div class="empty-result"><p>ค้นหาไม่สำเร็จ</p><small>${esc(error.message)}</small></div>`;return;}
  const rows=Array.isArray(data)?data:[]; const row=rows[0]||null;
  showResult(row,targetId);
  if(row) selected=row;
}
$("#searchForm").onsubmit=e=>{e.preventDefault();search($("#searchEmail").value,"#searchResult")};
$("#searchForm2").onsubmit=e=>{e.preventDefault();search($("#searchEmail2").value,"#searchResult2")};

function openModal(row){
  selected=row; $("#modalEmail").textContent=row.email;
  $("#licenseSummary").innerHTML=`<div class="license-box">
    <div><span>แพ็กเกจ</span><b>${planText(row.plan)}</b></div>
    <div><span>สถานะ</span><b>${statusText(row.status)}</b></div>
    <div><span>หมดอายุ</span><b>${row.expires_at?fmtDate(row.expires_at):"ตลอดชีพ"}</b></div>
  </div>`;
  $("#toggleStatusText").textContent=row.status==="SUSPENDED"?"เปิดใช้งาน":"ระงับสิทธิ์";
  $("#toggleStatusAction").classList.toggle("activate",row.status==="SUSPENDED");
  $("#customDays").classList.add("hidden"); $("#actionMessage").textContent="";
  $("#memberModal").classList.remove("hidden");
}
$$("[data-close-modal]").forEach(x=>x.onclick=()=>$("#memberModal").classList.add("hidden"));
$$("[data-action]").forEach(btn=>btn.onclick=async()=>{
  if(!selected)return;
  const action=btn.dataset.action;
  if(action==="custom"){ $("#customDays").classList.toggle("hidden");return; }
  await mutate(action);
});
$("#grantCustomBtn").onclick=()=>mutate("custom");

async function mutate(action){
  const target=selected.target_user_id; let rpc,args;
  if(action==="monthly"){rpc="owner_grant_monthly";args={p_target_user_id:target};}
  if(action==="lifetime"){rpc="owner_grant_lifetime";args={p_target_user_id:target};}
  if(action==="custom"){rpc="owner_grant_custom";args={p_target_user_id:target,p_duration_days:Number($("#daysInput").value)};}
  if(action==="toggle"){
    rpc=selected.status==="SUSPENDED"?"owner_activate_license":"owner_suspend_license";
    args={p_target_user_id:target};
  }
  if(action==="custom" && (!Number.isInteger(args.p_duration_days)||args.p_duration_days<1)){toast("กรุณาระบุจำนวนวัน");return;}
  const buttons=$$(".action");buttons.forEach(b=>b.disabled=true);
  $("#actionMessage").textContent="";
  try{
    const {data,error}=await db.rpc(rpc,args);if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    selected={...selected,...row,target_user_id:row.target_user_id||target};
    openModal(selected);
    refreshCurrentResults(selected);
    toast("บันทึกสิทธิ์เรียบร้อย");
    await loadAudit(selected);
  }catch(err){$("#actionMessage").textContent=err.message||"ทำรายการไม่สำเร็จ";}
  finally{buttons.forEach(b=>b.disabled=false);}
}
function refreshCurrentResults(row){
  if(!$("#pageHome").classList.contains("hidden")) showResult(row,"#searchResult");
  if(!$("#pageMembers").classList.contains("hidden")) showResult(row,"#searchResult2");
}
async function openAudit(row){
  selected=row; $("#auditEmpty").classList.add("hidden");$("#auditPanel").classList.remove("hidden");$("#auditEmail").textContent=row.email;
  document.querySelector('[data-page="activity"]').click(); await loadAudit(row);
}
async function loadAudit(row=selected){
  if(!row)return;
  const list=$("#auditList");list.innerHTML="<div class='empty-result'><p>กำลังโหลดประวัติ…</p></div>";
  const {data,error}=await db.rpc("owner_get_license_audit_v2",{p_target_user_id:row.target_user_id});
  if(error){list.innerHTML=`<div class="empty-result"><p>โหลดประวัติไม่สำเร็จ</p><small>${esc(error.message)}</small></div>`;return;}
  const rows=Array.isArray(data)?data:[];
  if(!rows.length){list.innerHTML="<div class='empty-result'><p>ยังไม่มีประวัติการทำรายการ</p></div>";return;}
  list.innerHTML=rows.map(r=>`<div class="audit-row">
    <div class="audit-date">${fmtDateTime(r.created_at)}</div>
    <div><div class="audit-action">${esc(r.action)}</div><div class="audit-detail">${planText(r.old_plan)} → ${planText(r.new_plan)} · ${statusText(r.old_status)} → ${statusText(r.new_status)}</div></div>
    <div class="audit-days">${r.duration_days?`${r.duration_days} วัน`:""}</div>
  </div>`).join("");
}
$("#refreshAudit").onclick=()=>loadAudit();

boot();
