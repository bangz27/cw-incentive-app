/* TBS Incentive modern selection sheet. Presentation layer only: native selects remain the data source. */
(function (global, doc) {
  'use strict';

  class ModernSelectionSheet {
    constructor() {
      this.bindings = new Map();
      this.activeSelect = null;
      this.activeBinding = null;
      this.dragStartY = null;
      this.overlay = null;
      this.panel = null;
      this.search = null;
      this.list = null;
      this.empty = null;
    }

    init() {
      if (this.overlay) return this;
      this.overlay = doc.getElementById('modern-selection-sheet');
      if (!this.overlay) this.overlay = this.createOverlay();
      this.panel = this.overlay.querySelector('.modern-selection-panel');
      this.search = this.overlay.querySelector('.modern-selection-search input');
      this.list = this.overlay.querySelector('.modern-selection-list');
      this.empty = this.overlay.querySelector('.modern-selection-empty');
      this.overlay.querySelector('[data-modern-selection-close]')?.addEventListener('click', () => this.close());
      this.overlay.querySelector('[data-modern-selection-dismiss]')?.addEventListener('click', () => this.close());
      this.search?.addEventListener('input', () => this.renderList(this.search.value));
      this.panel?.addEventListener('touchstart', event => {
        if (event.target.closest('.modern-selection-handle')) this.dragStartY = event.touches?.[0]?.clientY ?? null;
      }, { passive: true });
      this.panel?.addEventListener('touchend', event => {
        if (this.dragStartY === null) return;
        const endY = event.changedTouches?.[0]?.clientY ?? this.dragStartY;
        const delta = endY - this.dragStartY;
        this.dragStartY = null;
        if (delta >= 72) this.close();
      }, { passive: true });
      doc.addEventListener('keydown', event => {
        if (event.key === 'Escape' && this.isOpen()) this.close();
      });
      return this;
    }

    createOverlay() {
      const overlay = doc.createElement('div');
      overlay.id = 'modern-selection-sheet';
      overlay.className = 'modern-selection-sheet hidden';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'modern-selection-title');
      overlay.innerHTML = `
        <div class="modern-selection-backdrop" data-modern-selection-dismiss></div>
        <section class="modern-selection-panel" role="document">
          <div class="modern-selection-handle" aria-hidden="true"><span></span></div>
          <header class="modern-selection-header">
            <h2 id="modern-selection-title"></h2>
            <button type="button" class="icon-button" data-modern-selection-close aria-label="ปิด"><span class="material-icons-round">close</span></button>
          </header>
          <label class="modern-selection-search">
            <span class="material-icons-round" aria-hidden="true">search</span>
            <input type="search" autocomplete="off" placeholder="ค้นหา..." aria-label="ค้นหาในรายการ">
          </label>
          <div class="modern-selection-list" role="listbox" aria-label="รายการตัวเลือก"></div>
          <p class="modern-selection-empty hidden">ไม่พบรายการที่ค้นหา</p>
        </section>`;
      doc.body.appendChild(overlay);
      return overlay;
    }

    attachSelect(select, options = {}) {
      this.init();
      if (!select || this.bindings.has(select)) return this.bindings.get(select)?.trigger;
      const trigger = doc.createElement('button');
      trigger.type = 'button';
      trigger.className = 'modern-select-trigger';
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', this.overlay.id);
      trigger.setAttribute('aria-expanded', 'false');
      trigger.dataset.modernSelectFor = select.id || '';
      select.classList.add('modern-select-native');
      select.insertAdjacentElement('afterend', trigger);
      const binding = { select, trigger, title: options.title || select.dataset.modernSelectorTitle || 'เลือกข้อมูล', selectedValue: options.selectedValue ?? select.value, searchEnabled: options.searchEnabled !== false, items: options.items, onSelect: options.onSelect };
      this.bindings.set(select, binding);
      select.addEventListener('change', () => this.syncSelect(select));
      trigger.addEventListener('click', () => this.open(select));
      this.syncSelect(select);
      return trigger;
    }

    syncSelect(select) {
      const binding = this.bindings.get(select);
      if (!binding) return;
      const selected = Array.from(select.options || []).find(option => option.value === select.value);
      binding.selectedValue = select.value;
      const hasValue = Boolean(select.value);
      binding.trigger.textContent = selected?.textContent?.trim() || 'เลือกข้อมูล';
      binding.trigger.classList.toggle('is-placeholder', !hasValue);
      binding.trigger.setAttribute('aria-label', `${binding.title}: ${binding.trigger.textContent}`);
    }

    itemsFor(binding) {
      const configured = typeof binding.items === 'function' ? binding.items() : binding.items;
      if (Array.isArray(configured) && configured.length) {
        return configured.map(item => typeof item === 'object' ? { value: String(item.value), label: String(item.label ?? item.text ?? item.value) } : { value: String(item), label: String(item) });
      }
      return Array.from(binding.select.options || [])
        .filter(option => !option.disabled && option.value !== '')
        .map(option => ({ value: option.value, label: option.textContent.trim() }));
    }

    open(select) {
      const binding = this.bindings.get(select);
      if (!binding) return;
      this.init();
      this.activeSelect = select;
      this.activeBinding = binding;
      const title = this.overlay.querySelector('#modern-selection-title');
      if (title) title.textContent = binding.title;
      const searchWrap = this.overlay.querySelector('.modern-selection-search');
      if (searchWrap) searchWrap.classList.toggle('hidden', !binding.searchEnabled);
      if (this.search) {
        this.search.value = '';
        this.search.placeholder = binding.title === 'เลือก Zone' ? 'ค้นหา Zone...' : 'ค้นหา...';
      }
      this.renderList('');
      this.overlay.classList.remove('hidden');
      this.overlay.classList.add('is-open');
      doc.body.classList.add('modern-selection-open');
      binding.trigger.setAttribute('aria-expanded', 'true');
      if (binding.searchEnabled) {
        requestAnimationFrame(() => this.search?.focus());
      }
      requestAnimationFrame(() => this.list?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
    }

    renderList(query = '') {
      if (!this.list || !this.activeBinding) return;
      const normalized = String(query).trim().toLocaleLowerCase();
      const selectedValue = this.activeSelect?.value || this.activeBinding.selectedValue || '';
      const items = this.itemsFor(this.activeBinding).filter(item => !normalized || item.label.toLocaleLowerCase().includes(normalized) || item.value.toLocaleLowerCase().includes(normalized));
      this.list.replaceChildren();
      items.forEach(item => {
        const row = doc.createElement('button');
        row.type = 'button';
        row.className = 'modern-selection-row';
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', String(item.value === selectedValue));
        const label = doc.createElement('span');
        label.className = 'modern-selection-row-label';
        label.textContent = item.label;
        const check = doc.createElement('span');
        check.className = 'material-icons-round modern-selection-check';
        check.textContent = 'check';
        check.setAttribute('aria-hidden', 'true');
        row.append(label, check);
        row.addEventListener('click', () => this.selectValue(item.value));
        this.list.appendChild(row);
      });
      this.empty?.classList.toggle('hidden', items.length > 0);
      if (this.empty) this.empty.textContent = normalized ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการ';
    }

    selectValue(value) {
      const select = this.activeSelect;
      const binding = this.activeBinding;
      if (!select || !binding) return;
      select.value = String(value);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      binding.onSelect?.(select.value, this.itemsFor(binding).find(item => item.value === select.value));
      this.close({ restoreFocus: true });
    }

    close({ restoreFocus = false } = {}) {
      if (!this.overlay) return;
      const binding = this.activeBinding;
      this.overlay.classList.remove('is-open');
      this.overlay.classList.add('hidden');
      doc.body.classList.remove('modern-selection-open');
      if (binding) binding.trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) binding?.trigger.focus();
      this.activeSelect = null;
      this.activeBinding = null;
      this.dragStartY = null;
    }

    isOpen() {
      return Boolean(this.overlay && this.overlay.classList.contains('is-open'));
    }
  }

  const sheet = new ModernSelectionSheet();
  global.ModernSelectionSheet = sheet;
  global.ModernSelectionSheetComponent = ModernSelectionSheet;

  const boot = () => {
    sheet.init();
    sheet.attachSelect(doc.getElementById('calc-zone'), { title: 'เลือก Zone' });
    sheet.attachSelect(doc.getElementById('profile-position'), { title: 'เลือกตำแหน่ง' });
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window, document);
