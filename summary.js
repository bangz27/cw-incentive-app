document.addEventListener('DOMContentLoaded', () => {
  const from = document.getElementById('summary-from');
  const to = document.getElementById('summary-to');
  const money = n => `฿${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const number = n => Number(n || 0).toLocaleString();
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const today = () => new Date().toISOString().slice(0, 10);
  function rangeRows() {
    if (!window.CWRecordModel) return [];
    const start = from?.value || '0000-01-01';
    const end = to?.value || '9999-12-31';
    return window.CWRecordModel.readRecords(localStorage).filter(row => String(row.date) >= start && String(row.date) <= end);
  }
  function render() {
    const rows = rangeRows();
    const sum = key => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
    set('summary-parcel', number(sum('parcel')));
    set('summary-rts-count', `${number(sum('rtsCount'))} ชิ้น`);
    set('summary-rts-income', money(sum('rtsIncome')));
    set('summary-box-count', `${number(sum('boxCount'))} ชิ้น`);
    set('summary-box-income', money(sum('boxAmount')));
    set('summary-deduction', money(sum('sameAddressDeduction')));
    set('summary-net', money(sum('netIncentive')));
    set('summary-record-count', number(rows.length));
    const empty = document.getElementById('summary-empty');
    if (empty) empty.classList.toggle('hidden', rows.length > 0);
  }
  if (from && to) {
    const now = new Date();
    from.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    to.value = today();
    from.addEventListener('change', render);
    to.addEventListener('change', render);
  }
  document.querySelectorAll('[data-target="view-summary"]').forEach(button => button.addEventListener('click', render));
  window.addEventListener('historyUpdated', render);
  window.addEventListener('showSummary', render);
  render();
});
