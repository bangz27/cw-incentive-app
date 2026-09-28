/* TBS Incentive V1.8.1 Home Dashboard presentation layer. */
(function (global) {
  'use strict';
  const money = value => `฿${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  let chart = null;
  const storage = () => global.TBSUserStorage?.storage;
  const readRows = () => storage() && global.CWRecordModel ? global.CWRecordModel.readRecords(storage()) : [];
  const dateKey = date => {
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };
  const label = date => {
    const d = new Date(`${date}T00:00:00`);
    return Number.isNaN(d.getTime()) ? date : `${d.getDate()}/${d.getMonth() + 1}`;
  };
  function lastSevenKeys() {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(end);
      date.setDate(end.getDate() - (6 - index));
      return date.toISOString().slice(0, 10);
    });
  }
  function render() {
    const canvas = global.document?.getElementById('home-trend-chart');
    const empty = global.document?.getElementById('home-chart-empty');
    if (!canvas || !global.Chart) return;
    const rows = readRows();
    const totals = Object.create(null);
    rows.forEach(row => {
      const key = dateKey(row.date);
      if (key) totals[key] = (totals[key] || 0) + Number(row.netIncentive || 0);
    });
    const keys = lastSevenKeys();
    const values = keys.map(key => Number((totals[key] || 0).toFixed(2)));
    const hasData = values.some(value => value > 0);
    canvas.classList.toggle('hidden', !hasData);
    empty?.classList.toggle('hidden', hasData);
    if (chart) chart.destroy();
    if (!hasData) return;
    const context = canvas.getContext('2d');
    chart = new global.Chart(context, {
      type: 'bar',
      data: { labels: keys.map(label), datasets: [{ data: values, backgroundColor: '#F86A00', borderRadius: 8, maxBarThickness: 30 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: item => ` ${money(item.raw)}` } } },
        scales: { y: { beginAtZero: true, ticks: { callback: value => `฿${value}` }, grid: { color: 'rgba(32,33,36,.07)' } }, x: { grid: { display: false } } }
      }
    });
  }
  global.addEventListener('historyUpdated', render);
  global.addEventListener('userStorageReady', render);
  global.addEventListener('showView', event => { if (event.detail === 'view-home') render(); });
  global.addEventListener('DOMContentLoaded', render);
})(window);
