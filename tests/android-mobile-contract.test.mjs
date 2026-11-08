import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const androidConfig = new URL('../src-tauri/tauri.android.conf.json', import.meta.url);
const androidProject = new URL('../src-tauri/gen/android/', import.meta.url);
const buildScript = fs.readFileSync(new URL('../scripts/build-android.mjs', import.meta.url), 'utf8');
const cargoToml = fs.readFileSync(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8');
const gradleProperties = fs.readFileSync(new URL('../src-tauri/gen/android/gradle.properties', import.meta.url), 'utf8');

assert.ok(packageJson.scripts['mobile:build'], 'the project must expose a reproducible Android APK build command');
assert.equal(packageJson.scripts.tauri, 'tauri', 'the Android Gradle project must be able to invoke the local Tauri CLI');
assert.ok(fs.existsSync(androidConfig), 'Android needs a platform-specific Tauri configuration');
assert.ok(fs.existsSync(androidProject), 'the Tauri Android project must be initialized');
assert.match(buildScript, /shell:\s*process\.platform === 'win32'/, 'the Android build runner must support Windows npx.cmd');
assert.match(buildScript, /\.cargo', 'bin'/, 'the Android build runner must prefer the Rustup-managed Cargo toolchain');
assert.match(buildScript, /apksigner\.bat/, 'the Android build runner must produce an installable signed APK');
assert.match(cargoToml, /\[lib\][\s\S]*crate-type\s*=\s*\["cdylib",\s*"rlib"\]/, 'Android builds require a cdylib Rust target');
assert.ok(fs.existsSync(new URL('../src-tauri/src/lib.rs', import.meta.url)), 'Android builds require a shared Tauri library entry point');
assert.match(gradleProperties, /^android\.overridePathCheck=true$/m, 'Android builds must allow this project’s non-ASCII Windows path');

const config = fs.readFileSync(androidConfig, 'utf8');
assert.match(config, /"bundle"\s*:\s*\{[\s\S]*"createUpdaterArtifacts"\s*:\s*false/s, 'Android builds must not require a cloud updater');

console.log('android mobile contract passed');
