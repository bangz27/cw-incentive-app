const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const baseline = '12a80d98bad81d26c072db14f75bf530459bd6d6';
const git = (...args) => execFileSync('git', args, { cwd: root });
// Additive RTS/box record fields are allowed in record-model.js. Calculation
// engine, tier configuration, and the original calculation contract remain locked.
const lockedFiles = [
  'calculation-engine.js',
  'two-w-config.js',
  'config.js',
  'test/calculation-engine.test.js'
];
for (const name of lockedFiles) {
  assert.ok(fs.existsSync(path.join(root, name)), `Locked file missing: ${name}`);
  assert.ok(fs.readFileSync(path.join(root, name)).equals(git('show', `${baseline}:${name}`)),
    `Locked source-of-truth file was modified: ${name}`);
}
console.log(`Locked baseline PASS: ${lockedFiles.length} calculation/tier contract files byte-identical to ${baseline}.`);
