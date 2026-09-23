const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const json = name => JSON.parse(read(name));
const packageJson = json('package.json');
const config = json('capacitor.config.json');
assert.equal(config.appId, 'com.cw.incentive');
assert.equal(config.appName, 'TBS Incentive');
assert.equal(config.webDir, 'www');
assert.equal(config.server.hostname, 'localhost');
assert.equal(config.server.androidScheme, 'https');
assert.equal(config.server.cleartext, false);
assert.equal(config.server.url, undefined, 'Do not redirect native app to a remote web server');
const packagedConfigPath = path.join(root, 'android/app/src/main/assets/capacitor.config.json');
if (fs.existsSync(packagedConfigPath)) {
  assert.deepEqual(config, JSON.parse(fs.readFileSync(packagedConfigPath, 'utf8')));
}

const gradle = read('android/app/build.gradle');
assert.match(gradle, /applicationId ['"]com\.cw\.incentive['"]/);
assert.match(gradle, /namespace ['"]com\.cw\.incentive['"]/);
const androidVersionName = packageJson.version.replace(/\.0$/, '');
assert.match(gradle, new RegExp(`versionName ['"]${androidVersionName.replaceAll('.', '\\.') }['"]`));
assert.match(gradle, /versionCode 4\b/);
assert.match(gradle, /CW_KEYSTORE_PATH/);
assert.doesNotMatch(gradle, /signingConfig signingConfigs.debug/);
assert.match(read('android/app/src/main/java/com/cw/incentive/MainActivity.java'), /extends BridgeActivity/);
assert.match(read('android/app/src/main/AndroidManifest.xml'), /android:name="\.MainActivity"/);
assert.match(read('android/app/src/main/res/values/strings.xml'), />TBS Incentive</);
assert.match(read('android/gradle/wrapper/gradle-wrapper.properties'), /gradle-8\.11\.1-all\.zip/);
assert.match(read('android/build.gradle'), /com.android.tools.build:gradle:8.7.2/);
assert.ok(fs.statSync(path.join(root, 'android/gradle/wrapper/gradle-wrapper.jar')).size > 0);
const bridgeSource = read('node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/Bridge.java');
assert.match(bridgeSource, /setDomStorageEnabled\(true\)/);

const html = read('www/index.html');
const localPaths = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
  .map(match => match[1]).filter(name => !/^[a-z]+:/i.test(name));
for (const name of localPaths) {
  for (const destination of ['www', 'android/app/src/main/assets/public']) {
    assert.ok(fs.readFileSync(path.join(root, name)).equals(fs.readFileSync(path.join(root, destination, name))),
      `${destination}/${name} differs from root baseline`);
  }
}
assert.equal(read('index.html'), html);
assert.equal(html, read('android/app/src/main/assets/public/index.html'));

// Emulate classic-script ordering in a DOM-free JS context, using packaged files.
// This is NOT an Android runtime test; device test is supplied separately.
const context = vm.createContext({});
for (const name of ['two-w-config.js', 'config.js', 'calculation-engine.js', 'record-model.js']) {
  vm.runInContext(read('android/app/src/main/assets/public/' + name), context, { filename: name });
}
assert.equal(vm.runInContext('CWCalculationEngine.calculate2W(70,1,10).netIncentive', context), 617);
assert.equal(vm.runInContext('CWCalculationEngine.calculate4W(5,1,1).grossIncentive', context), 37);
const legacy = [{ id: 99, date: '2026-09-22', rider: 'Phase 2 synthetic test', hub: 'TEST',
  zone: 'Zone 1', sizeS: 5, sizeL: 1, totalParcels: 6, grandTotal: 37, synced: false }];
const serialized = JSON.stringify(legacy);
let writes = 0;
const storage = { getItem(key) { assert.equal(key, 'incentive_history'); return serialized; }, setItem() { writes++; } };
const normalized = context.CWRecordModel.readRecords(storage);
assert.equal(normalized[0].netIncentive, 37);
assert.equal(normalized[0].vehicleType, '4W');
assert.equal(writes, 0, 'Read normalization must not write or reset storage');
assert.equal(serialized, JSON.stringify(legacy));
execFileSync(process.execPath, [path.join(root, 'scripts/verify-baseline.cjs')], { stdio: 'inherit' });
console.log('Platform PASS: configuration, native identity, packaged assets, browser globals, and legacy-read compatibility.');
console.log('Android WebView persistence runtime: requires connectedDebugAndroidTest on a disposable device; not proven by this script.');
