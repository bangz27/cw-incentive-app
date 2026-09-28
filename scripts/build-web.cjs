const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'www');
const files = [
  'index.html', 'style.css', 'app.js', 'calculator.js', 'config.js',
  'dashboard.js', 'export.js', 'history.js', 'manifest.json', 'service-worker.js',
  'calculation-engine.js', 'two-w-config.js', 'record-model.js', 'app-version.js', 'update-checker.js', 'profile-store.js', 'firebase-auth.js', 'supabase.js', 'supabase-config.js', 'user-storage.js', 'supabase-auth.js', 'license-manager.js', 'owner-console.js', 'help-center.js', 'home-dashboard.js', 'story-share.js', 'share-story.js', 'fonts/Kanit-ExtraBold-Italic.ttf', 'TBS_Incentive_Template_01_Orange_City_Ride.png', 'TBS_Incentive_Template_02_Sunset_Highway.png', 'TBS_Incentive_Template_03_Night_Hub.png', 'TBS_Incentive_Template_04_Clean_Box.png', 'TBS_Incentive_Template_05_Sky_Victory.png', 'support_qr.png', 'tbs_icon.png', 'tbs_icon_master.png', 'adaptive-foreground.png', 'playstore.png', 'appstore.png', 'favicon.png', 'apple-touch-icon.png', 'tbs_banner.png', 'capacitor-core.js', 'capacitor-app.js', 'capacitor-local-notifications.js', 'capacitor-camera.js'
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
// Remove retired Share Story templates from generated web and Android assets.
const retiredStoryAssets = [
  '01_TBS_Orange.png', '02_Road_Runner.png', '03_Dark_Night.png',
  '04_Minimal.png', '05_Social_Flex.png'
];
for (const directory of [output, path.join(root, 'android/app/src/main/assets/public')]) {
  for (const file of retiredStoryAssets) {
    const stale = path.join(directory, file);
    if (fs.existsSync(stale)) fs.rmSync(stale);
  }
}
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file));
  fs.mkdirSync(path.dirname(path.join(output, file)), { recursive: true });
  fs.writeFileSync(path.join(output, file), source);
  const copied = fs.readFileSync(path.join(output, file));
  if (!source.equals(copied)) throw new Error(`Byte mismatch: ${file}`);
}
console.log(`Copied ${files.length} existing web files unchanged to www/.`);
console.log('Remote fonts/CDN libraries remain as baseline; complete offline UI is not claimed.');
console.log('index.html SHA-256:', createHash('sha256').update(fs.readFileSync(path.join(output, 'index.html'))).digest('hex'));
