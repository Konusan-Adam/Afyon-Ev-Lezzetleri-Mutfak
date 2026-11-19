import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve('.');
const ANDROID_DIR = path.join(ROOT, 'android');
const APP_MAIN = path.join(ANDROID_DIR, 'app', 'src', 'main');
const BUILD_DIR = path.join(ANDROID_DIR, 'build');

const SDK_ROOT = process.env.ANDROID_HOME || '/opt/android-sdk';
const BUILD_TOOLS = path.join(SDK_ROOT, 'build-tools', '34.0.0');
const ANDROID_JAR = path.join(SDK_ROOT, 'platforms', 'android-34', 'android.jar');

const AAPT2 = path.join(BUILD_TOOLS, 'aapt2');
const D8 = path.join(BUILD_TOOLS, 'd8');
const ZIPALIGN = path.join(BUILD_TOOLS, 'zipalign');
const APKSIGNER = path.join(BUILD_TOOLS, 'apksigner');

const ZIPALIGN_BIN = fs.existsSync(ZIPALIGN) ? ZIPALIGN : 'zipalign';
const APKSIGNER_BIN = fs.existsSync(APKSIGNER) ? APKSIGNER : 'apksigner';

function run(cmd) {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

function copyDirSync(src, dest, excludeExt = '.apk') {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (excludeExt && entry.name.endsWith(excludeExt)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(s, d, excludeExt);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const versionName = String(pkg.version || '2.1.0').replace(/^v/, '');
  const parts = versionName.split('.').map((n) => parseInt(n, 10) || 0);
  const versionCode = (parts[0] || 1) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
  console.log(`📦 APK Sürümü: v${versionName} (versionCode: ${versionCode})`);

  // Anlık APK yapım zaman damgası ve sürüm meta dosyasını kaydet
  const metaVerisi = {
    version: versionName,
    versionCode: versionCode,
    builtAt: new Date().toISOString(),
    builtTimestamp: Date.now(),
  };
  fs.writeFileSync(path.join(ROOT, 'public', 'apk-meta.json'), JSON.stringify(metaVerisi, null, 2));

  // 1. Web uygulamasını derle
  run('npx vite build');
  fs.copyFileSync(path.join(ROOT, 'public', 'apk-meta.json'), path.join(ROOT, 'dist', 'apk-meta.json'));

  const finalApk = path.join(ROOT, 'public', 'afyon-mutfak.apk');
  const keystore = path.join(ANDROID_DIR, 'afyon-mutfak.keystore');

  // Eğer tam Android SDK 34 yoksa ama mevcut APK şablonu ve apksigner varsa hızlı paketleme yap
  if (!fs.existsSync(ANDROID_JAR) || !fs.existsSync(AAPT2)) {
    if (!fs.existsSync(finalApk)) {
      throw new Error(`Android SDK 34 bulunamadı (${SDK_ROOT}) ve temel APK şablonu yok.`);
    }
    console.log('⚡ SDK 34 kurulu değil; mevcut APK şablonu güncel dist/ bundle ile paketlenip imzalanıyor...');
    
    fs.mkdirSync(BUILD_DIR, { recursive: true });
    const unalignedApk = path.join(BUILD_DIR, 'unaligned.apk');
    const alignedApk = path.join(BUILD_DIR, 'aligned.apk');

    const pythonScript = `
import zipfile, os
root = "${ROOT}"
dist_dir = os.path.join(root, "dist")
base_apk = "${finalApk}"
temp_apk = "${unalignedApk}"

with zipfile.ZipFile(base_apk, "r") as src, zipfile.ZipFile(temp_apk, "w", compression=zipfile.ZIP_DEFLATED) as dst:
    for item in src.infolist():
        if not item.filename.startswith("assets/www/") and not item.filename.startswith("META-INF/"):
            dst.writestr(item, src.read(item.filename))
    for foldername, subfolders, filenames in os.walk(dist_dir):
        for filename in filenames:
            if filename.endswith(".apk"): continue
            filepath = os.path.join(foldername, filename)
            relpath = os.path.relpath(filepath, dist_dir)
            arcname = "assets/www/" + relpath
            dst.write(filepath, arcname)
`;
    fs.writeFileSync(path.join(BUILD_DIR, 'repack.py'), pythonScript);
    console.log('✍️  APK imzalanıyor (JAR v1 + APK v2/v3 şeması)...');
    const { ApkSigner, SigningKey, convertToPEM } = await import('apk_sign_ts');
    const ksBuf = new Uint8Array(fs.readFileSync(keystore));
    const { privateKey, certificate } = await convertToPEM(ksBuf, 'afyon123', 'jks');
    const signer = new ApkSigner({
      signingKey: SigningKey.fromPEM(privateKey, certificate),
    });
    const unalignedBytes = new Uint8Array(fs.readFileSync(unalignedApk));
    const { signedApk } = await signer.sign(unalignedBytes);
    fs.writeFileSync(finalApk, signedApk);

    const stat = fs.statSync(finalApk);
    console.log(`\n✅ Güncel APK hazır: ${finalApk} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
    return;
  }

  // 2. Temiz build dizini hazırla
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  const assetsWww = path.join(BUILD_DIR, 'assets', 'www');
  copyDirSync(path.join(ROOT, 'dist'), assetsWww, '.apk');

  // 3. Kaynak dosyalarını (ikon + siren mp3) hazırla
  const resDir = path.join(BUILD_DIR, 'res');
  const rawDir = path.join(resDir, 'raw');
  const drawableDir = path.join(resDir, 'drawable');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(drawableDir, { recursive: true });

  fs.copyFileSync(
    path.join(ROOT, 'public', 'nukleer_siren.mp3'),
    path.join(rawDir, 'nukleer_siren.mp3')
  );

  const logoSrc = path.join(ROOT, 'public', 'assets', 'aistudio', 'image_48081a60_bc73ebae.jpg');
  const mipmaps = [
    ['mipmap-mdpi', 48],
    ['mipmap-hdpi', 72],
    ['mipmap-xhdpi', 96],
    ['mipmap-xxhdpi', 144],
    ['mipmap-xxxhdpi', 192],
  ];
  for (const [folder, size] of mipmaps) {
    const dir = path.join(resDir, folder);
    fs.mkdirSync(dir, { recursive: true });
    await sharp(logoSrc).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
  }

  // Bildirim durum çubuğu küçük ikonu (beyaz silüet uyumlu)
  const bellSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="white"><path d="M12 2a2 2 0 0 0-2 2v.34A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2v-5a7 7 0 0 0-5-6.66V4a2 2 0 0 0-2-2Zm0 20a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z"/></svg>`;
  await sharp(Buffer.from(bellSvg)).resize(96, 96).png().toFile(path.join(drawableDir, 'ic_stat_mutfak.png'));

  // 4. aapt2 compile & link
  const compiledResZip = path.join(BUILD_DIR, 'res.zip');
  const genJavaDir = path.join(BUILD_DIR, 'gen');
  fs.mkdirSync(genJavaDir, { recursive: true });
  const baseApk = path.join(BUILD_DIR, 'base.apk');

  run(`"${AAPT2}" compile --dir "${resDir}" -o "${compiledResZip}"`);
  run(
    `"${AAPT2}" link -0 .mp3 --version-code ${versionCode} --version-name "${versionName}" -o "${baseApk}" -I "${ANDROID_JAR}" --manifest "${path.join(APP_MAIN, 'AndroidManifest.xml')}" --java "${genJavaDir}" -A "${path.join(BUILD_DIR, 'assets')}" "${compiledResZip}" --auto-add-overlay`
  );

  // 5. Java derle
  const classesDir = path.join(BUILD_DIR, 'classes');
  fs.mkdirSync(classesDir, { recursive: true });
  const javaFiles = [
    path.join(genJavaDir, 'com', 'afyonevlezzetleri', 'mutfak', 'R.java'),
    path.join(APP_MAIN, 'java', 'com', 'afyonevlezzetleri', 'mutfak', 'MainActivity.java'),
    path.join(APP_MAIN, 'java', 'com', 'afyonevlezzetleri', 'mutfak', 'SiparisDinleyiciServisi.java'),
    path.join(APP_MAIN, 'java', 'com', 'afyonevlezzetleri', 'mutfak', 'BootReceiver.java'),
    path.join(APP_MAIN, 'java', 'com', 'afyonevlezzetleri', 'mutfak', 'ApkDosyaSaglayici.java'),
  ];
  run(
    `javac -source 11 -target 11 -encoding UTF-8 -classpath "${ANDROID_JAR}" -d "${classesDir}" ${javaFiles.map((f) => `'${f}'`).join(' ')}`
  );

  // 6. classes.jar -> classes.dex üret ($ iç sınıf isimleri için güvenli)
  const classesJar = path.join(BUILD_DIR, 'classes.jar');
  run(`jar cf "${classesJar}" -C "${classesDir}" .`);

  const dexDir = path.join(BUILD_DIR, 'dex');
  fs.mkdirSync(dexDir, { recursive: true });
  run(`"${D8}" --min-api 24 --lib "${ANDROID_JAR}" --output "${dexDir}" "${classesJar}"`);

  // 7. classes.dex'i APK paketine ekle
  run(`python3 -c "import zipfile; z=zipfile.ZipFile('${baseApk}','a'); z.write('${path.join(dexDir, 'classes.dex')}','classes.dex'); z.close()"`);

  // 8. zipalign
  const alignedApk = path.join(BUILD_DIR, 'aligned.apk');
  run(`"${ZIPALIGN}" -f -p 4 "${baseApk}" "${alignedApk}"`);

  // 9. Keystore & apksigner
  if (!fs.existsSync(keystore)) {
    run(
      `keytool -genkeypair -v -keystore "${keystore}" -alias afyonmutfak -keyalg RSA -keysize 2048 -validity 10000 -storepass afyon123 -keypass afyon123 -dname "CN=Afyon Ev Lezzetleri, O=Afyon Mutfak, C=TR"`
    );
  }

  run(
    `"${APKSIGNER_BIN}" sign --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --ks "${keystore}" --ks-key-alias afyonmutfak --ks-pass pass:afyon123 --key-pass pass:afyon123 --out "${finalApk}" "${alignedApk}"`
  );
  run(`"${APKSIGNER}" verify --verbose "${finalApk}"`);

  const stat = fs.statSync(finalApk);
  console.log(`\n✅ APK hazır: ${finalApk} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error('❌ APK derleme hatası:', err);
  process.exit(1);
});
