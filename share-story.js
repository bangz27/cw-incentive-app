(function () {
  const STORY_FONT = 'Kanit Story';
  const TEMPLATES = [
    {
      id: 'orange-city', name: 'Orange City Ride', file: 'TBS_Incentive_Template_01_Orange_City_Ride.png',
      date: { x: 819, y: 175, fontSize: 54, rotation: -2, color: '#111827', maxWidth: 270, maxHeight: 70, minFontSize: 28 },
      parcel: { x: 574, y: 523, fontSize: 17000, rotation: -16, color: '#ffffff', maxWidth: 760, maxHeight: 220, minFontSize: 70 },
      vehicle: { x: 648, y: 834, fontSize: 100, rotation: -11, color: '#111827', maxWidth: 500, maxHeight: 100, minFontSize: 38 }
    },
    {
      id: 'sunset-highway', name: 'Scenic Highway', file: 'TBS_Incentive_Template_02_Sunset_Highway.png',
      date: { x: 860, y: 155, fontSize: 62, rotation: -2, color: '#ffffff', maxWidth: 300, maxHeight: 70, minFontSize: 28 },
      parcel: { x: 566, y: 503, fontSize: 231, rotation: -12, color: '#111827', maxWidth: 760, maxHeight: 220, minFontSize: 70 },
      vehicle: { x: 637, y: 1545, fontSize: 1200, rotation: -13, color: '#111827', maxWidth: 760, maxHeight: 100, minFontSize: 38 }
    },
    {
      id: 'night-hub', name: 'Night Hub', file: 'TBS_Incentive_Template_03_Night_Hub.png',
      date: { x: 825, y: 144, fontSize: 47, rotation: -2, color: '#ffffff', maxWidth: 280, maxHeight: 70, minFontSize: 28 },
      parcel: { x: 527, y: 477, fontSize: 179, rotation: -12, color: '#111827', maxWidth: 760, maxHeight: 220, minFontSize: 70 },
      vehicle: { x: 553, y: 1458, fontSize: 100, rotation: -7, color: '#111827', maxWidth: 470, maxHeight: 100, minFontSize: 40 }
    },
    {
      id: 'clean-box', name: 'Warehouse Box', file: 'TBS_Incentive_Template_04_Clean_Box.png',
      date: { x: 850, y: 145, fontSize: 62, rotation: 0, color: '#111827', maxWidth: 300, maxHeight: 70, minFontSize: 28 },
      parcel: { x: 560, y: 547, fontSize: 2000, rotation: -9, color: '#111827', maxWidth: 760, maxHeight: 220, minFontSize: 68 },
      vehicle: { x: 541, y: 909, fontSize: 1000, rotation: -12, color: '#111827', maxWidth: 620, maxHeight: 100, minFontSize: 38 }
    },
    {
      id: 'sky-victory', name: 'Sky Victory', file: 'TBS_Incentive_Template_05_Sky_Victory.png',
      date: { x: 818, y: 136, fontSize: 200, rotation: 0, color: '#ffffff', maxWidth: 250, maxHeight: 70, minFontSize: 28 },
      parcel: { x: 529, y: 549, fontSize: 231, rotation: -16, color: '#111827', maxWidth: 760, maxHeight: 220, minFontSize: 70 },
      vehicle: { x: 562, y: 831, fontSize: 133, rotation: -12, color: '#111827', maxWidth: 650, maxHeight: 100, minFontSize: 38 }
    }
  ];
  let currentRecord = null;
  let selected = TEMPLATES[0];
  const imageCache = {};
  const $ = id => document.getElementById(id);
  const showToast = (message, tone) => window.TBSShowToast?.(message, tone);
  const fontSpec = size => `italic 800 ${size}px "${STORY_FONT}"`;

  function dateText(value) {
    const d = new Date(`${value || ''}T00:00:00`);
    return Number.isNaN(d.getTime()) ? String(value || '') : d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function chooseTemplate(id) {
    selected = TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
    document.querySelectorAll('.story-template-chip').forEach(el => el.classList.toggle('active', el.dataset.template === selected.id));
    render();
  }
  function loadImage(file) {
    if (imageCache[file]) return Promise.resolve(imageCache[file]);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { imageCache[file] = img; resolve(img); };
      img.onerror = reject;
      img.src = file;
    });
  }
  function rotatedTextBounds(ctx, text, size, rotation) {
    ctx.font = fontSpec(size);
    const metrics = ctx.measureText(text);
    const width = metrics.width;
    const height = (metrics.actualBoundingBoxAscent || size * 0.82) + (metrics.actualBoundingBoxDescent || size * 0.18);
    const angle = Math.abs((rotation * Math.PI) / 180);
    return { width: Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle)), height: Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle)) };
  }
  function fitFontSize(ctx, text, field) {
    let size = field.fontSize;
    while (size > field.minFontSize) {
      const bounds = rotatedTextBounds(ctx, text, size, field.rotation);
      if (bounds.width <= field.maxWidth && bounds.height <= field.maxHeight) break;
      size -= 2;
    }
    return size;
  }
  function drawDynamicText(ctx, text, field) {
    ctx.save();
    ctx.translate(field.x, field.y);
    ctx.rotate((field.rotation * Math.PI) / 180);
    const size = fitFontSize(ctx, text, field);
    ctx.font = fontSpec(size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = field.color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  async function render() {
    const canvas = $('story-canvas');
    if (!canvas || !currentRecord) return;
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (document.fonts?.load) await document.fonts.load(fontSpec(48));
    const img = await loadImage(selected.file);
    // One complete template PNG is drawn once. Only the three dynamic text values follow.
    ctx.drawImage(img, 0, 0, 1080, 1920);
    const vehicle = String(currentRecord.vehicleType || '').toUpperCase() === '4W' ? '4W' : '2W';
    const parcelCount = String(Number(currentRecord.parcel ?? 0));
    drawDynamicText(ctx, dateText(currentRecord.date), selected.date);
    drawDynamicText(ctx, parcelCount, selected.parcel);
    drawDynamicText(ctx, vehicle, selected.vehicle);
  }
  function open(record) {
    currentRecord = record || null;
    if (!currentRecord) { showToast('กรุณาบันทึกข้อมูลก่อนแชร์'); return; }
    $('story-modal')?.classList.remove('hidden');
    document.body.classList.add('story-open');
    chooseTemplate(selected.id);
  }
  function close() {
    $('story-modal')?.classList.add('hidden');
    document.body.classList.remove('story-open');
  }
  async function exportImage(action) {
    if (!currentRecord) return;
    await render();
    const base64 = $('story-canvas').toDataURL('image/png').split(',')[1];
    const filename = `TBS-Incentive-${currentRecord.date || 'record'}-${currentRecord.vehicleType || 'record'}.png`;
    try {
      if (action === 'share') {
        await window.TBSStoryShare.shareImage(base64, filename, 'TBS Incentive');
        showToast('เปิดระบบแชร์แล้ว');
      } else {
        await window.TBSStoryShare.saveImage(base64, filename);
        showToast('บันทึกลงอุปกรณ์แล้ว ✓', 'success');
      }
    } catch (error) {
      showToast(action === 'share' ? 'แชร์ไม่สำเร็จ' : 'บันทึกภาพไม่สำเร็จ');
    }
  }
  function findRecord(id) {
    const storage = window.TBSUserStorage?.storage;
    const rows = storage && window.CWRecordModel?.readRecords(storage);
    return rows?.find(r => String(r.id) === String(id)) || null;
  }
  function bind() {
    document.querySelectorAll('[data-open-story]').forEach(button => button.addEventListener('click', () => open(findRecord(button.dataset.recordId))));
    document.querySelectorAll('.story-template-chip').forEach(button => button.addEventListener('click', () => chooseTemplate(button.dataset.template)));
    $('story-close')?.addEventListener('click', close);
    $('story-share')?.addEventListener('click', () => exportImage('share'));
    $('story-save')?.addEventListener('click', () => exportImage('save'));
    $('story-actions-share')?.addEventListener('click', () => open(currentRecord));
    $('story-actions-save')?.addEventListener('click', () => exportImage('save'));
    window.addEventListener('recordSaved', event => { currentRecord = event.detail?.record || null; $('story-actions')?.classList.remove('hidden'); });
  }
  document.addEventListener('DOMContentLoaded', bind);
  window.TBSStory = { open, close };
})();
