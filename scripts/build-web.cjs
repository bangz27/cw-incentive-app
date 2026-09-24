const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'www');
const files = [
  'index.html', 'style.css', 'app.js', 'calculator.js', 'config.js',
  'dashboard.js', 'export.js', 'history.js', 'manifest.json', 'service-worker.js',
  'calculation-engine.js', 'two-w-config.js', 'record-model.js', 'profile-store.js', 'firebase-auth.js', 'support_qr.png', 'tbs_icon.png', 'tbs_banner.png'
];
// Fail before touching build output if a source asset is missing.
for (const file of files) {
  if (!fs.statSync(path.join(root, file)).isFile()) throw new Error(`Missing asset: ${file}`);
}
// www is generated output only; no source or user records live here.
fs.mkdirSync(output, { recursive: true });
// Remove the retired Summary module from stale generated output.
const retiredSummary = path.join(output, 'summary.js');
if (fs.existsSync(retiredSummary)) fs.rmSync(retiredSummary);
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file));
  fs.writeFileSync(path.join(output, file), source);
  const copied = fs.readFileSync(path.join(output, file));
  if (!source.equals(copied)) throw new Error(`Byte mismatch: ${file}`);
}
console.log(`Copied ${files.length} existing web files unchanged to www/.`);
console.log('Remote fonts/CDN libraries remain as baseline; complete offline UI is not claimed.');
console.log('index.html SHA-256:', createHash('sha256').update(fs.readFileSync(path.join(output, 'index.html'))).digest('hex'));
