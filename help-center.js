/* TBS Incentive V1.8.1 Help Center: searchable cards and accessible accordion guides. */
(function (global) {
  'use strict';
  function init() {
    const input = document.getElementById('help-search');
    const clear = document.getElementById('help-search-clear');
    const empty = document.getElementById('help-search-empty');
    const cards = Array.from(document.querySelectorAll('[data-help-title]'));
    if (!input || !cards.length) return;
    const normalize = value => String(value || '').trim().toLocaleLowerCase('th-TH');
    function filter() {
      const query = normalize(input.value);
      let visible = 0;
      cards.forEach(card => {
        const haystack = normalize([card.dataset.helpTitle, card.dataset.helpDescription, card.dataset.helpKeywords].join(' '));
        const match = !query || haystack.includes(query);
        card.classList.toggle('hidden', !match);
        if (match) visible += 1;
      });
      clear?.classList.toggle('hidden', !query);
      empty?.classList.toggle('hidden', visible > 0);
    }
    input.addEventListener('input', filter);
    input.addEventListener('search', filter);
    clear?.addEventListener('click', () => { input.value = ''; filter(); input.focus(); });
    cards.forEach(card => card.addEventListener('toggle', () => {
      if (!card.open) return;
      cards.filter(other => other !== card).forEach(other => { other.open = false; });
    }));
    global.TBSHelpCenter = Object.freeze({ filter, clear: () => { input.value = ''; filter(); } });
    filter();
  }
  document.addEventListener('DOMContentLoaded', init);
})(window);
