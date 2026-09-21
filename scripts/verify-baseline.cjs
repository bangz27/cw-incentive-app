const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const baseline = '12a80d98bad81d26c072db14f75bf530459bd6d6';
const git = (...args) => execFileSync('git', args, { cwd: root });
// Phase 4 may change presentation and UI adapters. These remain locked because
// they are the calculation/data source of truth and the automated contract.
const lockedFiles = [
  'calculation-engine.js',
  'two-w-config.js',
  'config.js',
  'record-model.js',
  'test/calculation-engine.test.js',
  'test/record-model.test.js'
];
for (const name of lockedFiles) {
  assert.ok(fs.existsSync(path.join(root, name)), `Locked file missing: ${name}`);
  assert.ok(fs.readFileSync(path.join(root, name)).equals(git('show', `${baseline}:${name}`)),
    `Locked source-of-truth file was modified: ${name}`);
}
console.log(`Locked baseline PASS: ${lockedFiles.length} calculation/data/test files byte-identical to ${baseline}.`);
