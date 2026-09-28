const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('suspended screen provides an explicit login exit action', () => {
  const html = read('index.html');
  const auth = read('supabase-auth.js');
  assert.match(html, /id="suspended-gate"/);
  assert.match(html, /id="suspended-sign-out"/);
  assert.match(html, /กลับไปหน้าเข้าสู่ระบบ/);
  assert.match(auth, /suspended-sign-out/);
  assert.match(auth, /await signOut\(\)/);
});

test('suspended sign out preserves user-scoped app data by clearing only the storage pointer', () => {
  const storage = read('user-storage.js');
  const auth = read('supabase-auth.js');
  assert.match(storage, /const clearUser = \(\) => \{ currentUserId = null; \};/);
  assert.doesNotMatch(auth, /clearUserData\(\)/);
  assert.match(auth, /authState\.client\?\.auth\.signOut\(\)/);
});
