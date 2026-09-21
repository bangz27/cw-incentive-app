const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const folders = ['.', 'test', 'scripts', 'validation'];
let count = 0;
for (const folder of folders) {
  const dir = path.join(root, folder);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!/\.(?:js|cjs)$/.test(name)) continue;
    execFileSync(process.execPath, ['--check', path.join(dir, name)], { stdio: 'pipe' });
    count++;
  }
}
console.log(`Syntax PASS: ${count} JavaScript files.`);
