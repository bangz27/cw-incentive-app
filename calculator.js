document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const engine = window.CWCalculationEngine;
  const zone = $('calc-zone'), s = $('calc-size-s'), l = $('calc-size-l'), parcel = $('calc-parcel'), same = $('calc-same-address');
  const resultFields = {total:$('res-total-parcel'), grand:$('res-grand-total'), gross:$('res-gross'), same:$('res-same'), deduction:$('res-deduction'), net:$('res-net'), body:$('breakdown-body'), error:$('calc-error'), save:$('btn-save')};
  let vehicle = '4W';
  const money = n => `฿${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const integer = el => { const n=Number(el?.value); return Number.isInteger(n)&&n>=0?n:null; };
  function initZones(){ zone.innerHTML='<option value="" selected disabled>เลือกโซน</option>'; Object.keys(ZONES_CONFIG).forEach(z=>{const o=document.createElement('option');o.value=z;o.textContent=z;zone.appendChild(o);}); }
  function setVehicle(type){ vehicle=type; document.querySelectorAll('[data-vehicle-tab]').forEach(x=>x.classList.toggle('active',x.dataset.vehicleTab===type)); $('two-w-inputs').classList.toggle('hidden',type!=='2W'); $('four-w-inputs').classList.toggle('hidden',type!=='4W'); $('same-address-rate').textContent=type==='2W'?'อัตราหักบ้านซ้ำ ฿1.50 / ชิ้น':'อัตราหักบ้านซ้ำ ฿2.50 / ชิ้น'; calculate(); }
  function renderBreakdown(rows){ if(!rows?.length){resultFields.body.innerHTML='<tr><td colspan="5" class="empty-cell">กรอกข้อมูลเพื่อดูรายละเอียด</td></tr>';return;} resultFields.body.innerHTML=rows.map(t=>`<tr><td>${t.label}</td><td>${vehicle==='4W'?t.sizeS:'-'}</td><td>${vehicle==='4W'?t.sizeL:t.parcel}</td><td>${vehicle==='4W'?`${t.rateS}/${t.rateL}`:t.rate}</td><td>${money(t.amount)}</td></tr>`).join(''); }
  function calculate(){
    resultFields.error.textContent=''; const z=zone.value; const sameCount=integer(same); let result=null;
    try { if(!engine||!z||sameCount===null){throw new Error('กรุณากรอกข้อมูลให้ครบ');} if(vehicle==='2W'){const p=integer(parcel);if(p===null)throw new Error('จำนวนส่งสำเร็จไม่ถูกต้อง');result=engine.calculate2W(p,z,sameCount);}else{const sv=integer(s),lv=integer(l);if(sv===null||lv===null)throw new Error('จำนวน Size ไม่ถูกต้อง');result=engine.calculate4W(sv,lv,z,sameCount);} } catch(err){window.cwCurrentCalculation=null;resultFields.error.textContent=err.message;resultFields.total.textContent='0';resultFields.grand.textContent='฿0.00';resultFields.gross.textContent='฿0.00';resultFields.same.textContent='0 ชิ้น';resultFields.deduction.textContent='-฿0.00';resultFields.net.textContent='฿0.00';renderBreakdown([]);checkSave();return;}
    window.cwCurrentCalculation=result; resultFields.total.textContent=result.parcel.toLocaleString(); resultFields.grand.textContent=money(result.netIncentive); resultFields.gross.textContent=money(result.grossIncentive); resultFields.same.textContent=`${result.sameAddressCount.toLocaleString()} ชิ้น`; resultFields.deduction.textContent=`-${money(result.sameAddressDeduction)}`; resultFields.net.textContent=money(result.netIncentive); renderBreakdown(result.tierBreakdown); checkSave();
  }
  function checkSave(){const p=vehicle==='2W'?integer(parcel):(integer(s)||0)+(integer(l)||0);resultFields.save.disabled=!($('calc-date').value&&zone.value&&$('calc-hub').value.trim()&&$('calc-rider').value.trim()&&p>0&&window.cwCurrentCalculation);}
  function reset(){ $('calculator-form').reset();s.value='0';l.value='0';parcel.value='0';same.value='0';$('calc-date').valueAsDate=new Date();window.cwCurrentCalculation=null;resultFields.error.textContent='';resultFields.total.textContent='0';resultFields.grand.textContent='฿0.00';resultFields.gross.textContent='฿0.00';resultFields.same.textContent='0 ชิ้น';resultFields.deduction.textContent='-฿0.00';resultFields.net.textContent='฿0.00';renderBreakdown([]);checkSave();}
  function loadProfileIntoForm(){try{const p=JSON.parse(localStorage.getItem('cw_profile')||'{}');$('calc-rider').value=p.name||'';$('calc-hub').value=p.hub||'';}catch{$('calc-rider').value='';$('calc-hub').value='';}}
  document.querySelectorAll('[data-vehicle-tab]').forEach(x=>x.addEventListener('click',()=>setVehicle(x.dataset.vehicleTab)));
  window.addEventListener('vehicleSelected',e=>setVehicle(e.detail));
  window.addEventListener('activeProfileChanged',()=>{loadProfileIntoForm();calculate();});
  [zone,s,l,parcel,same,$('calc-date'),$('calc-hub'),$('calc-rider')].forEach(el=>{el?.addEventListener('input',calculate);el?.addEventListener('change',calculate);});
  $('btn-reset')?.addEventListener('click',reset); initZones(); $('calc-date').valueAsDate=new Date(); loadProfileIntoForm(); setVehicle('4W');
});
