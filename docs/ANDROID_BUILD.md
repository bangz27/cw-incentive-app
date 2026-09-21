# CW Incentive — Phase 2 Android Build

Phase 2 เพิ่ม Android platform ให้เว็บแอปเดิมใน repository เดิม ไม่สร้างแอปหรือ repository ใหม่ และไม่เปลี่ยน UI, navigation, calculation, Tier, Rate หรือ unified record schema จาก commit `12a80d98bad81d26c072db14f75bf530459bd6d6`.

## เครื่องมือและค่าที่ตรึงไว้

| รายการ | ค่า |
|---|---|
| Application ID / namespace / Java package | `com.cw.incentive` |
| App name | `CW Incentive` |
| versionName / versionCode | `1.0.0` / `1` |
| Capacitor CLI / core / android | `7.6.9` เท่ากันทุกตัว |
| Node / npm | Node 22.x / npm 10.x |
| Java | JDK 21 |
| Android Gradle Plugin | `8.7.2` |
| Gradle wrapper | `8.11.1` |
| minSdk / compileSdk / targetSdk | `23` / `35` / `35` |
| Android Build Tools | `35.0.0` |
| Entry point | `com.cw.incentive.MainActivity extends BridgeActivity` |
| Web assets directory | `www/` generated จาก root files |
| WebView origin | `https://localhost` |

เลือก Capacitor 7 เพื่อคง Android 6 / API 23 และ SDK 35 ซึ่งตรงกับ APK เดิม ไม่ได้อ้างว่าเป็น major ล่าสุด: Capacitor 8 มีแล้ว และเอกสาร v7 ระบุว่าไม่ได้รับการดูแลอย่างต่อเนื่อง ต้องทบทวนการอัปเกรดแยกจาก Phase 2 ก่อนเผยแพร่จริง โดยตรวจ storage origin และ Android compatibility อีกครั้ง [1] [2]

## การตรวจเวอร์ชันก่อนเพิ่ม Android

ก่อน Phase 2 repository ยังไม่มี Android/Gradle version configuration ส่วน APK Release `v1.0.0` เดิมมี `versionName=1.0`, `versionCode=1`, package `com.cw.incentive`, minSdk 23 และ target/compileSdk 35. Template ของ Capacitor ก็เริ่มต้นที่ `1.0`/`1` เช่นกัน จึงปรับเฉพาะ native configuration ใหม่เป็น `1.0.0`/`1` ตามคำสั่งผู้ใช้โดยเจตนา ไม่ได้สุ่มทับค่าเดิมหรือแก้ Release ที่เผยแพร่แล้ว

ค่ารุ่นนี้เป็น **build-structure baseline เท่านั้น** ไม่ใช่รุ่นอัปเดต production. ก่อนเผยแพร่รุ่นถัดไปต้องอนุมัติ versionCode ที่สูงขึ้น และยืนยัน signing certificate กับ APK เดิมก่อนติดตั้งทับ

## โครงสร้างไฟล์

| ตำแหน่ง | หน้าที่ |
|---|---|
| `package.json`, `package-lock.json` | Dependencies ที่ pin และ npm build commands |
| `capacitor.config.json` | App identity, `www`, origin คงที่ และปิด mixed/cleartext content |
| `scripts/build-web.cjs` | คัดลอก asset แบบ allowlist 13 ไฟล์ โดยไม่แปลง code |
| `scripts/gradle.cjs` | เรียก Gradle wrapper บน Linux/macOS/Windows |
| `scripts/check-syntax.cjs` | ตรวจ syntax โดยไม่ execute business code |
| `scripts/verify-baseline.cjs` | ยืนยันทุกไฟล์จาก Phase 1 ว่ายัง byte-identical |
| `validation/platform-check.cjs` | ตรวจ configuration, asset copies, browser globals และ legacy record reads |
| `android/gradlew`, `gradlew.bat`, `gradle/wrapper/` | Gradle wrapper รวม JAR และ properties |
| `android/build.gradle`, `variables.gradle`, `settings.gradle` | AGP, SDK, AndroidX และ native modules |
| `android/app/build.gradle` | applicationId, version, build types และ signing แบบ environment |
| `android/app/src/main/AndroidManifest.xml` | Launcher Activity, FileProvider และ INTERNET permission |
| `android/app/src/main/java/com/cw/incentive/MainActivity.java` | Capacitor BridgeActivity ไม่มี business logic เพิ่ม |
| `android/app/src/main/res/` | app strings, theme, launcher icon และ splash จาก template |
| `android/app/src/androidTest/java/com/cw/incentive/WebViewStorageTest.java` | Device smoke test สำหรับ assets/origin/storage; ไม่ใช่ test ที่ผ่านแล้วใน sandbox |

Icon/splash เป็น **placeholder จาก Capacitor template** มี density และ adaptive-icon structure แล้ว ยังไม่ใช่ final visual branding และไม่ได้เปลี่ยนสี/layout ของเว็บเดิม ไม่มี Google Services plugin, Google Login, Cloud Database หรือ Sync ใหม่

## เตรียม environment

ติดตั้ง Node 22, npm 10, JDK 21 และ Android SDK Platform 35, Build Tools 35.0.0, Platform Tools. Android Studio Ladybug 2024.2.1 หรือใหม่กว่าสามารถใช้ได้กับ toolchain นี้ [1]

ตัวอย่าง Linux/macOS ที่ SDK ติดตั้งไว้ใน home directory:

```bash
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

`JAVA_HOME` ต้องชี้ JDK จริง ไม่ใช่เฉพาะ JRE. เปลี่ยน path ให้ตรงเครื่อง หากใช้ Android Studio สามารถกำหนด SDK ใน `android/local.properties` ได้ แต่ห้าม commit local path ดังกล่าว

## ติดตั้ง dependency และตรวจ baseline

รันจาก root ของ repository:

```bash
npm ci
npm run check:baseline
npm run check:syntax
node --test test/*.test.js
npm run cap:sync
npm run verify:platform
npx cap doctor android
```

Expected test result ของชุดที่ล็อกใน Phase 1 คือ **10 passed / 0 failed**. ไม่มีการเพิ่ม test ใน `test/` หรือแก้ calculation fixtures ใน Phase 2

หาก checkout แบบ shallow จนไม่มี commit `12a80d9` ให้ fetch ประวัติก่อนรัน `check:baseline`. การ build ไม่จำเป็นต้องเปลี่ยนหรือ reset Git history

## คำสั่ง build ที่แน่นอน

รันจาก root ของ repository:

```bash
# Debug APK (development signing โดย Android SDK)
npm run android:debug

# Release APK (unsigned หากไม่ตั้งค่า signing)
npm run android:release

# Android App Bundle (unsigned หากไม่ตั้งค่า signing)
npm run android:aab
```

ทุกคำสั่งด้านบน copy assets และ `cap sync android` ก่อนเรียก Gradle wrapper เสมอ ไม่ต้องติดตั้ง Gradle แบบ global และไม่ใช้ `npx create-*` หรือสร้าง project ใหม่

| เป้าหมาย | Output path |
|---|---|
| Debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Release APK ไม่มี key | `android/app/build/outputs/apk/release/app-release-unsigned.apk` |
| Release APK มี key | `android/app/build/outputs/apk/release/app-release.apk` |
| Release AAB | `android/app/build/outputs/bundle/release/app-release.aab` |

คำสั่ง Gradle โดยตรงหลัง `npm run cap:sync`:

```bash
cd android
./gradlew assembleDebug --no-daemon
./gradlew assembleRelease --no-daemon
./gradlew bundleRelease --no-daemon
```

บน Windows ใช้ `gradlew.bat` แทน `./gradlew` หรือใช้ npm commands ที่รองรับ Windows อยู่แล้ว

## Release signing

ไม่มี keystore/password ถูกเพิ่มใน Git และ Phase 2 ไม่สร้าง signing key ใหม่. หากไม่ตั้งค่า signing, Release APK/AAB ที่ build ได้เป็น unsigned และ **ไม่พร้อมติดตั้ง/เผยแพร่ production**. Debug APK ใช้ development key จึงไม่ควรนำไปติดตั้งทับ APK เดิมที่ลงลายเซ็นด้วย release key

ก่อนเซ็น production ให้ใส่ค่าผ่าน secret manager/CI environment เท่านั้น:

| Environment variable | ความหมาย |
|---|---|
| `CW_KEYSTORE_PATH` | absolute path ไปยัง key เดิมที่ตรวจสอบแล้ว |
| `CW_KEYSTORE_PASSWORD` | รหัสผ่าน keystore |
| `CW_KEY_ALIAS` | alias |
| `CW_KEY_PASSWORD` | รหัสผ่าน key |

ต้องให้ครบทั้งสี่ค่า หากมีบางค่าแต่ไม่ครบ Gradle จะหยุดทันที การบังคับให้ signing ต้องพร้อมทำได้ด้วย:

```bash
npm run cap:sync
cd android
./gradlew assembleRelease bundleRelease -PcwRequireSigning --no-daemon
```

อย่าใช้ debug key แทน release key อย่าลบแอปเดิมเพื่อข้าม signature mismatch เพราะการ uninstall อาจลบข้อมูลผู้ใช้

## Web asset loading

Root `index.html` ยังเป็น entry point เดิม. `build:web` คัดลอก 13 web files ไป `www` แบบ byte-for-byte และ Capacitor คัดลอกต่อไป `android/app/src/main/assets/public`. MainActivity โหลดเว็บจาก assets ผ่าน `https://localhost` ไม่ใช่ URL ของเว็บ server ภายนอก [2]

Bootstrap, Chart.js, SheetJS, html2pdf, Google Fonts และ Material Icons ยังอ้าง CDN ตาม baseline. ไม่เปลี่ยนเวอร์ชันหรือ rewrite HTML ใน Phase 2 ดังนั้น **ยังไม่รับรอง full offline UI/charts/export**. Core JavaScript และ record code ถูก bundle แล้ว แต่ resource ภายนอกยังต้อง Internet หรือ cache ที่มีอยู่ URL Apps Script เดิมไม่เปลี่ยนและไม่ได้ส่งข้อมูลจริงระหว่างการทดสอบนี้

`manifest.json` กับ `service-worker.js` ยังเป็นไฟล์ว่างตาม baseline. บาง WebView/browser อาจมี manifest parse warning; service worker ยังไม่มี cache handler ไม่ได้เพิ่ม PWA feature ใหม่

## LocalStorage และ backward compatibility

Capacitor 7.6.9 เปิด `WebSettings.setDomStorageEnabled(true)` อยู่แล้ว และ config ตรึง origin เป็น `https://localhost`. ใช้ key เดิม `incentive_history` และ `incentive_theme`; `record-model.js`, `history.js` และ schema ไม่ถูกแก้ ไม่มีการเรียก clear/reset storage เพิ่ม ไม่มี SQLite/Preferences plugin ใหม่

การตรวจ platform script ยืนยันว่า legacy records ถูกอ่านด้วย adapter เดิมและไม่ได้ถูกเขียนทับ การติดตั้งอัปเดตโดยรักษา app identity, signature, WebView origin และ data directory เป็นเงื่อนไขสำคัญต่อความต่อเนื่องของข้อมูล แต่ยังต้องทดสอบ lifecycle บนอุปกรณ์จริง

**ข้อจำกัดที่ต้องแยกให้ชัด:** Browser/PWA localStorage ของเว็บเดิมเป็นคนละ sandbox กับ Android WebView แม้ใช้ app name เหมือนกัน จึงไม่โอนข้อมูลข้าม origin อัตโนมัติ เช่นเดียวกับข้อมูล SQLite ของแอป Native เดิมจากขั้นก่อนหน้าในบทสนทนา ซึ่งไม่สามารถอ่านได้ด้วย LocalStorage adapter นี้ ไม่มีการลบข้อมูลเหล่านั้น แต่ยังไม่มี migration ที่ทำให้ข้อมูลเหล่านั้นปรากฏใน Capacitor UI

จึงห้ามสรุปว่า APK ใหม่นี้แทน APK v1.0.0 แบบรักษาข้อมูลครบได้แล้ว ต้องวางแผน/ทดสอบ import หรือ migration แยกก่อน production โดยไม่ reset ข้อมูลผู้ใช้

## การตรวจ WebView บนอุปกรณ์ (ยังไม่รันใน Phase 2 sandbox)

ไม่มี Android device/emulator เชื่อมต่อใน environment นี้. เตรียม instrumentation smoke test ที่ตรวจ asset globals, DOM storage, `https://localhost` และ round-trip ผ่าน activity recreation แล้ว ทดสอบด้วย synthetic key แยกต่างหาก ไม่แตะ `incentive_history` หรือ theme และลบเฉพาะ key ที่ test สร้างเอง

เมื่อได้รับคำสั่งให้เริ่ม device validation ให้ใช้ **test device/emulator ที่ไม่มีข้อมูลผู้ใช้**:

```bash
npm run cap:sync
cd android
./gradlew connectedDebugAndroidTest --no-daemon
```

การ compile test APK หรือผ่าน Node tests ไม่เท่ากับการยืนยัน Android runtime persistence. ยังต้องตรวจ force-stop/relaunch, WebView update และการอัปเดต APK โดยใช้ signing เดิมใน Phase 3

## Scope และสิ่งที่ห้ามสรุปเกินผลทดสอบ

Phase 2 ตรวจโครงสร้างและ build tasks เท่านั้น ไม่ติดตั้งทับแอปเดิม ไม่เผยแพร่ APK/AAB ไม่เปลี่ยน GitHub Release v1.0.0 ไม่เริ่ม baseline device acceptance ของ Phase 3 และไม่ทำ UI redesign ใน Phase 4. ปัญหา functional/validation ของ code ที่ล็อกไว้ยังอยู่นอกขอบเขตนี้ ไม่ควรถือว่า 10 tests เดิมครอบคลุม business logic ทุกกรณีหรือเป็น Final QA

## References

[1]: https://capacitorjs.com/docs/updating/7-0 "Capacitor 7 Android toolchain requirements"
[2]: https://capacitorjs.com/docs/v7/config "Capacitor 7 configuration and local origin"
[3]: https://github.com/bangz27/cw-incentive-app/commit/12a80d9 "Locked CW Incentive Phase 1 source"
