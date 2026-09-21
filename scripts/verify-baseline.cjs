const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const baseline = '12a80d98bad81d26c072db14f75bf530459bd6d6';
const git = (...args) => execFileSync('git', args, { cwd: root });
const files = git('ls-tree', '-r', '--name-only', baseline).toString().trim().split('\n');
for (const name of files) {
  assert.ok(fs.existsSync(path.join(root, name)), `Baseline file missing: ${name}`);
  assert.ok(fs.readFileSync(path.join(root, name)).equals(git('show', `${baseline}:${name}`)),
    `Locked baseline was modified: ${name}`);
}
console.log(`Baseline PASS: all ${files.length} Phase 1 files byte-identical to ${baseline}.`);
