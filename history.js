document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('history-body');
  const save = document.getElementById('btn-save');
  const userStorage = () => window.TBSUserStorage?.storage;
  const money = n => `฿${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const profile = () => window.TBSProfiles?.getActive?.() || {};
  const currentPosition = () => profile().position || 'ตำแหน่งจาก Profile ปัจจุบัน';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  let activeFilter = 'ทั้งหมด';
  let searchTerm = '';

  function rawRows() { return userStorage() && window.CWRecordModel?.readRawRecords(userStorage()) || []; }
  function load() {
    if (!body || !window.CWRecordModel || !userStorage()) return;
    const rows = window.CWRecordModel.readRecords(userStorage()).filter(r => {
      if (activeFilter !== 'ทั้งหมด' && r.vehicleType !== activeFilter) return false;
      if (!searchTerm) return true;
      const haystack = [r.date, r.vehicleType, r.zone, r.fullName, r.position].join(' ').toLowerCase();
      return haystack.includes(searchTerm);
    });
    if (!rows.length) { body.className = 'stack-list empty-state'; body.innerHTML = `<span class="material-icons-round">${searchTerm ? 'search_off' : 'inbox'}</span><p>${searchTerm ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการคำนวณ'}</p>`; return; }
    body.className = 'stack-list';
    body.innerHTML = rows.map(r => `<article class="record-card" data-record-id="${esc(r.id)}"><span class="record-icon material-icons-round">${r.vehicleType === '2W' ? 'two_wheeler' : 'local_shipping'}</span><div class="record-main"><strong>${esc(r.date)} · ${esc(r.vehicleType)} · ${esc(r.zone)}</strong><small>ส่งสำเร็จ ${Number(r.parcel || 0).toLocaleString()} ชิ้น · ${esc(r.fullName || 'ไม่ระบุชื่อ')}</small><small>บ้านซ้ำ ${r.sameAddressCount || 0} ชิ้น · RTS ${r.rtsCount || 0} ชิ้น · ${esc(r.position || currentPosition())}</small><div class="record-actions"><button type="button" class="text-button record-edit" data-edit-record="${esc(r.id)}"><span class="material-icons-round">edit</span>แก้ไข</button><button type="button" class="text-button story-record-share" data-open-story data-record-id="${esc(r.id)}"><span class="material-icons-round">ios_share</span>แชร์ Story</button><button type="button" class="text-button danger-button record-delete" data-delete-record="${esc(r.id)}"><span class="material-icons-round">delete</span>ลบ</button></div></div><div class="record-money">${money(r.netIncentive)}<small>หัก ${money(r.sameAddressDeduction)}</small></div></article>`).join('');
    body.querySelectorAll('[data-edit-record]').forEach(button => button.addEventListener('click', () => editRecord(button.dataset.editRecord)));
    body.querySelectorAll('[data-delete-record]').forEach(button => button.addEventListener('click', () => deleteRecord(button.dataset.deleteRecord)));
    body.querySelectorAll('[data-open-story]').forEach(button => button.addEventListener('click', () => window.TBSStory?.open?.(window.CWRecordModel.readRecords(userStorage()).find(r => String(r.id) === String(button.dataset.recordId)))));
  }
  function editRecord(id) {
    const record = window.CWRecordModel.readRecords(userStorage()).find(r => String(r.id) === String(id));
    if (!record) return;
    window.cwEditingRecordId = record.id;
    if (save) { save.classList.add('edit-mode'); save.innerHTML = '<span class="material-icons-round">check_circle</span>บันทึกการแก้ไข'; }
    window.dispatchEvent(new CustomEvent('vehicleSelected', { detail: record.vehicleType }));
    document.getElementById('calc-date').value = record.date || '';
    const zoneSelect = document.getElementById('calc-zone');
    if (zoneSelect) {
      const zoneValue = String(record.zone || '');
      const matchingZone = [...zoneSelect.options].find(option => option.value === zoneValue || option.textContent.includes(zoneValue) || option.value.includes(zoneValue));
      zoneSelect.value = matchingZone?.value || zoneValue;
    }
    document.getElementById('calc-parcel').value = record.parcel || 0;
    document.getElementById('calc-size-s').value = record.sizeS || 0;
    document.getElementById('calc-size-l').value = record.sizeL || 0;
    document.getElementById('calc-same-address').value = record.sameAddressCount || 0;
    document.getElementById('calc-rts').value = record.rtsCount || 0;
    ['calc-date', 'calc-zone', 'calc-parcel', 'calc-size-s', 'calc-size-l', 'calc-same-address', 'calc-rts'].forEach(id => document.getElementById(id)?.dispatchEvent(new Event('input', { bubbles: true })));
    window.dispatchEvent(new CustomEvent('showView', { detail: 'view-calculator' }));
  }
  async function deleteRecord(id) {
    const rows = rawRows();
    const target = rows.find(r => String(r.id) === String(id));
    if (!target) return;
    const currentUserId = window.TBSUserStorage?.getUserId?.();
    if (target.user_id && String(target.user_id) !== String(currentUserId)) return;
    if (!confirm('ต้องการลบรายการนี้หรือไม่? ข้อมูลรายการอื่นจะไม่ถูกเปลี่ยนแปลง')) return;
    const result = await window.TBSSupabaseAuth?.deleteRecord?.(id);
    if (!result?.ok) {
      if (!result?.aborted) window.TBSShowToast?.('ลบรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      return;
    }
    userStorage()?.setItem('history', JSON.stringify(rows.filter(r => String(r.id) !== String(id))));
    load();
    window.dispatchEvent(new Event('historyUpdated'));
  }
  save?.addEventListener('click', () => {
    const result = window.cwCurrentCalculation;
    if (!result || !userStorage()) { window.TBSShowToast?.('กรุณาเข้าสู่ระบบและกรอกข้อมูลก่อนบันทึก'); return; }
    const p = profile();
    const rows = rawRows();
    const editing = Boolean(window.cwEditingRecordId);
    const recordId = window.cwEditingRecordId || Date.now();
    const record = window.CWRecordModel.createRecord({ id: recordId, date: document.getElementById('calc-date').value, fullName: p.fullName || p.name || '', hub: p.hub || '', driverId: p.driverId || '', position: p.position || '', result, createdAt: editing ? (rows.find(row => String(row.id) === String(recordId))?.createdAt || new Date().toISOString()) : new Date().toISOString() });
    record.synced = false;
    const next = editing ? rows.map(row => String(row.id) === String(recordId) ? record : row) : [record, ...rows];
    userStorage().setItem('history', JSON.stringify(next));
    window.cwEditingRecordId = null;
    load();
    window.dispatchEvent(new CustomEvent('recordSaved', { detail: { record } }));
    window.dispatchEvent(new Event('historyUpdated'));
    const old = save.innerHTML; save.classList.add('save-success'); save.innerHTML = `<span class="material-icons-round">check_circle</span>${editing ? 'แก้ไขสำเร็จ' : 'บันทึกสำเร็จ'}`; setTimeout(() => { save.classList.remove('save-success','edit-mode'); save.innerHTML = old; document.getElementById('btn-reset')?.click(); if (editing) window.dispatchEvent(new CustomEvent('showView', { detail: 'view-history' })); }, 1800);
  });
  document.querySelectorAll('.filter-chip').forEach(chip => chip.addEventListener('click', () => { activeFilter = chip.textContent.trim(); document.querySelectorAll('.filter-chip').forEach(x => x.classList.toggle('active', x === chip)); load(); }));
  const search = document.getElementById('history-search');
  const clearSearch = document.getElementById('history-search-clear');
  search?.addEventListener('input', () => { searchTerm = search.value.trim().toLowerCase(); clearSearch?.classList.toggle('hidden', !searchTerm); load(); });
  clearSearch?.addEventListener('click', () => { if (search) search.value = ''; searchTerm = ''; clearSearch.classList.add('hidden'); load(); search?.focus(); });
  window.addEventListener('userStorageReady', load);
  window.addEventListener('historyUpdated', load);
  load();
});
