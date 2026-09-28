const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

test('Settings removes Share App card and related handler without removing Update Card', () => {
  assert.doesNotMatch(html, /id="profile-share"/);
  assert.doesNotMatch(html, /แชร์แอป/);
  assert.doesNotMatch(app, /profile-share/);
  assert.doesNotMatch(css, /settings-leading\.share/);
  assert.match(html, /id="update-settings-title"/);
  assert.match(html, /id="check-updates"/);
});

test('Settings cleanup preserves light and dark theme tokens', () => {
  assert.match(css, /:root\[data-theme=dark\]/);
  assert.match(css, /--orange-soft/);
  assert.match(css, /\.settings-view \.settings-row/);
});
