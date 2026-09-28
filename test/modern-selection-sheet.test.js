const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const component = fs.readFileSync(path.join(root, 'modern-selection-sheet.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const calculator = fs.readFileSync(path.join(root, 'calculator.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const build = fs.readFileSync(path.join(root, 'scripts/build-web.cjs'), 'utf8');


test('Zone and Position keep native select data sources behind the shared visual trigger', () => {
  assert.match(html, /id="calc-zone"[^>]*required/);
  assert.match(html, /id="profile-position"[^>]*required/);
  assert.match(html, /id="modern-selection-sheet"[^>]*role="dialog"/);
  assert.match(html, /modern-selection-search/);
  assert.match(html, /modern-selection-list/);
  assert.doesNotMatch(html, /type="radio"/i);
});

test('ModernSelectionSheet exposes reusable component parameters and selection behavior', () => {
  assert.match(component, /class ModernSelectionSheet/);
  assert.match(component, /title/);
  assert.match(component, /items/);
  assert.match(component, /selectedValue|selectedValue/);
  assert.match(component, /searchEnabled/);
  assert.match(component, /onSelect/);
  assert.match(component, /role', 'option'/);
  assert.match(component, /aria-selected/);
  assert.match(component, /scrollIntoView/);
  assert.match(component, /delta >= 72/);
  assert.match(component, /global\.ModernSelectionSheet = sheet/);
});

test('Existing calculation/profile flows remain event-driven through select change events', () => {
  assert.match(component, /select\.dispatchEvent\(new Event\('change'/);
  assert.match(calculator, /\[zone,s,l,parcel,same,rts,\$\('calc-date'\)\]\.forEach/);
  assert.match(calculator, /addEventListener\('change',calculate\)/);
  assert.match(calculator, /window\.ModernSelectionSheet\?\.syncSelect/);
  assert.match(app, /window\.ModernSelectionSheet\?\.syncSelect\?\.\(el\)/);
  assert.match(app, /window\.ModernSelectionSheet\?\.isOpen/);
  assert.match(app, /window\.ModernSelectionSheet\.close\(\)/);
});

test('UI contract supports search, selected orange state, dark mode, safe area, and narrow widths', () => {
  assert.match(css, /\.modern-selection-panel/);
  assert.match(css, /height:min\(74vh/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.modern-selection-search/);
  assert.match(css, /\.modern-selection-row\[aria-selected="true"\]/);
  assert.match(css, /:root\[data-theme="dark"\].*modern-selection-panel/);
  assert.match(css, /@media\(max-width:340px\)/);
  assert.match(css, /overflow-y:auto/);
  assert.match(css, /overscroll-behavior:contain/);
});

test('Modern Selection Sheet is packaged into web assets for Capacitor', () => {
  assert.match(html, /modern-selection-sheet\.js/);
  assert.match(build, /modern-selection-sheet\.js/);
});
