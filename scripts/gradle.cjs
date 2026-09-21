const { spawnSync } = require('node:child_process');
const path = require('node:path');
const cwd = path.resolve(__dirname, '../android');
const args = process.argv.slice(2);
if (!args.length) throw new Error('Pass a Gradle task such as assembleDebug or bundleRelease');
const windows = process.platform === 'win32';
const result = spawnSync(windows ? 'cmd.exe' : './gradlew',
  windows ? ['/d', '/s', '/c', 'gradlew.bat', ...args, '--no-daemon'] : [...args, '--no-daemon'],
  { cwd, stdio: 'inherit', env: process.env });
if (result.error) { console.error(result.error.message); process.exit(1); }
process.exit(result.status ?? 1);
