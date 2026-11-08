import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const localAppData = process.env.LOCALAPPDATA;
if (!localAppData) throw new Error('无法定位 LOCALAPPDATA，不能构建 Android APK。');

const sdkRoot = process.env.ANDROID_HOME || path.join(localAppData, 'Android', 'Sdk');
const jdkRoot = process.env.JAVA_HOME || path.join(localAppData, 'TiantianshuatiBuildTools', 'jdk-17.0.19+10');
const rustupBin = path.join(process.env.USERPROFILE || '', '.cargo', 'bin');
const ndkParent = path.join(sdkRoot, 'ndk');
const ndkRoot = process.env.NDK_HOME || path.join(ndkParent, readdirSync(ndkParent).find((name) => existsSync(path.join(ndkParent, name, 'source.properties'))) || '');

for (const [label, target] of [['JDK 17', path.join(jdkRoot, 'bin', 'java.exe')], ['Android SDK', path.join(sdkRoot, 'platforms', 'android-36')], ['Android NDK', path.join(ndkRoot, 'source.properties')]]) {
  if (!existsSync(target)) throw new Error(`${label} 未准备好：${target}`);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npx, ['tauri', 'android', 'build', '--apk', '--target', 'aarch64'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    JAVA_HOME: jdkRoot,
    ANDROID_HOME: sdkRoot,
    NDK_HOME: ndkRoot,
    PATH: `${rustupBin}${path.delimiter}${process.env.PATH}`,
  },
});

if (result.status !== 0) process.exit(result.status ?? 1);

const releaseDir = path.join('src-tauri', 'gen', 'android', 'app', 'build', 'outputs', 'apk', 'universal', 'release');
const unsignedApk = path.join(releaseDir, 'app-universal-release-unsigned.apk');
const signedApk = path.join(releaseDir, 'tiantianshuati_0.1.0_arm64.apk');
const apksigner = path.join(sdkRoot, 'build-tools', '36.0.0', 'apksigner.bat');
const debugKeystore = path.join(process.env.USERPROFILE || '', '.android', 'debug.keystore');

for (const [label, target] of [['unsigned APK', unsignedApk], ['APK signer', apksigner], ['debug keystore', debugKeystore]]) {
  if (!existsSync(target)) throw new Error(`${label} is missing: ${target}`);
}

const signingEnv = { ...process.env, JAVA_HOME: jdkRoot, PATH: `${jdkRoot}${path.sep}bin${path.delimiter}${process.env.PATH}` };
const signingArgs = ['sign', '--ks', debugKeystore, '--ks-type', 'PKCS12', '--ks-pass', 'pass:android', '--key-pass', 'pass:android', '--ks-key-alias', 'androiddebugkey', '--out', signedApk, unsignedApk];
const signResult = spawnSync(apksigner, signingArgs, { stdio: 'inherit', shell: process.platform === 'win32', env: signingEnv });
if (signResult.status !== 0) process.exit(signResult.status ?? 1);

const verifyResult = spawnSync(apksigner, ['verify', '--verbose', signedApk], { stdio: 'inherit', shell: process.platform === 'win32', env: signingEnv });
process.exit(verifyResult.status ?? 1);
