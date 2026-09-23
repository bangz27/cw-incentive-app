document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('history-body');
  const save = document.getElementById('btn-save');
  const money = n => `฿${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const profile = () => window.TBSProfiles?.getActive?.() || (() => { try { return JSON.parse(localStorage.getItem('cw_profile') || '{}'); } catch { return {}; } })();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  let activeFilter = 'ทั้งหมด';

  function rawRows() { return window.CWRecordModel?.readRawRecords(localStorage) || []; }
  function load() {
    if (!body || !window.CWRecordModel) return;
    const rows = window.CWRecordModel.readRecords(localStorage).filter(r => activeFilter === 'ทั้งหมด' || r.vehicleType === activeFilter);
    if (!rows.length) { body.className = 'stack-list empty-state'; body.innerHTML = '<span class="material-icons-round">inbox</span><p>ยังไม่มีรายการบันทึก</p>'; return; }
    body.className = 'stack-list';
    body.innerHTML = rows.map(r => `<article class="record-card" data-record-id="${esc(r.id)}"><span class="record-icon material-icons-round">${r.vehicleType === '2W' ? 'two_wheeler' : 'local_shipping'}</span><div class="record-main"><strong>${esc(r.date)} · ${esc(r.vehicleType)} · ${esc(r.zone)}</strong><small>ส่งสำเร็จ ${Number(r.parcel || 0).toLocaleString()} ชิ้น · ${esc(r.fullName || 'ไม่ระบุชื่อ')}</small><small>บ้านซ้ำ ${r.sameAddressCount || 0} ชิ้น · RTS ${r.rtsCount || 0} ชิ้น · ${esc(r.position || 'ตำแหน่งจาก Profile ปัจจุบัน')}</small><div class="record-actions"><button type="button" class="text-button record-edit" data-edit-record="${esc(r.id)}"><span class="material-icons-round">edit</span>แก้ไข</button><button type="button" class="text-button danger-button record-delete" data-delete-record="${esc(r.id)}"><span class="material-icons-round">delete</span>ลบ</button></div></div><div class="record-money">${money(r.netIncentive)}<small>หัก ${money(r.sameAddressDeduction)}</small></div></article>`).join('');
    body.querySelectorAll('[data-edit-record]').forEach(button => button.addEventListener('click', () => editRecord(button.dataset.editRecord)));
    body.querySelectorAll('[data-delete-record]').forEach(button => button.addEventListener('click', () => deleteRecord(button.dataset.deleteRecord)));
  }
  function editRecord(id) {
    const record = window.CWRecordModel.readRecords(localStorage).find(r => String(r.id) === String(id));
    if (!record) return;
    window.cwEditingRecordId = record.id;
    window.dispatchEvent(new CustomEvent('vehicleSelected', { detail: record.vehicleType }));
    document.getElementById('calc-date').value = record.date || '';
    document.getElementById('calc-zone').value = record.zone || '';
    document.getElementById('calc-parcel').value = record.parcel || 0;
    document.getElementById('calc-size-s').value = record.sizeS || 0;
    document.getElementById('calc-size-l').value = record.sizeL || 0;
    document.getElementById('calc-same-address').value = record.sameAddressCount || 0;
    document.getElementById('calc-rts').value = record.rtsCount || 0;
        ['calc-date', 'calc-zone', 'calc-parcel', 'calc-size-s', 'calc-size-l', 'calc-same-address', 'calc-rts'].forEach(id => document.getElementById(id)?.dispatchEvent(new Event('input', { bubbles: true })));
    window.dispatchEvent(new CustomEvent('showView', { detail: 'view-calculator' }));
  }
  function deleteRecord(id) {
    const rows = rawRows();
    if (!rows.some(r => String(r.id) === String(id))) return;
    if (!confirm('ต้องการลบรายการนี้หรือไม่? ข้อมูลรายการอื่นจะไม่ถูกเปลี่ยนแปลง')) return;
    localStorage.setItem('incentive_history', JSON.stringify(rows.filter(r => String(r.id) !== String(id))));
    load();
    window.dispatchEvent(new Event('historyUpdated'));
  }
  save?.addEventListener('click', () => {
    const result = window.cwCurrentCalculation;
    if (!result) { window.TBSShowToast?.('กรุณากรอกข้อมูลและคำนวณก่อนบันทึก'); return; }
    const p = profile();
    const rows = rawRows();
    const record = window.CWRecordModel.createRecord({ id: window.cwEditingRecordId || Date.now(), date: document.getElementById('calc-date').value, fullName: p.fullName || p.name || '', hub: p.hub || '', driverId: p.driverId || '', result, createdAt: new Date().toISOString() });
    record.synced = false;
    const next = window.cwEditingRecordId ? rows.map(row => String(row.id) === String(window.cwEditingRecordId) ? record : row) : [record, ...rows];
    localStorage.setItem('incentive_history', JSON.stringify(next));
    window.cwEditingRecordId = null;
    load();
    window.dispatchEvent(new Event('historyUpdated'));
    window.TBSShowToast?.('✓ บันทึกข้อมูลสำเร็จ'); const old = save.innerHTML; save.innerHTML = '<span class="material-icons-round">check_circle</span>บันทึกสำเร็จ'; setTimeout(() => { save.innerHTML = old; document.getElementById('btn-reset')?.click(); }, 1500);
  });
  document.querySelectorAll('.filter-chip').forEach(chip => chip.addEventListener('click', () => { activeFilter = chip.textContent.trim(); document.querySelectorAll('.filter-chip').forEach(x => x.classList.toggle('active', x === chip)); load(); }));
  load();
});
