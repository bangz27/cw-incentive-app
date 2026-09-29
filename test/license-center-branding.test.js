const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('License Center uses the provided logo asset across desktop and mobile brand surfaces', () => {
  const html = read('license-center/index.html');
  const css = read('license-center/style.css');
  const asset = fs.readFileSync(path.join(root, 'license-center/assets/tbs-license-center-logo.jpg'));

  assert.deepEqual([...asset.subarray(0, 3)], [255, 216, 255]);
  assert.equal((html.match(/assets\/tbs-license-center-logo\.jpg/g) || []).length, 3);
  assert.doesNotMatch(html, /<span class="brand-mark(?: small)?">TBS<\/span>/);
  assert.match(css, /\.brand-mark img\{[^}]*object-fit:contain/);
});
