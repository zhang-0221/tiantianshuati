import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const publicConfig = fs.readFileSync(new URL('../auth-config.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

assert.match(publicConfig, /localOnly:\s*true/, 'the public build must default to local-only mode');
assert.match(publicConfig, /enableGate:\s*false/, 'local-only mode must not show the account gate');
assert.match(html, /const LOCAL_ONLY_MODE = AUTH_CONFIG\?\.localOnly === true;/, 'the browser needs an explicit local-only mode switch');
assert.doesNotMatch(html, /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.57\.0"/, 'local-only mode must not eagerly request the Supabase SDK');
assert.match(html, /function startAuthRuntime\(\) \{\s*if \(LOCAL_ONLY_MODE\) \{\s*initializeAuth\(\);\s*return;/s, 'the Supabase SDK must only load outside local-only mode');
assert.match(html, /function initializeAuth\(\) \{\s*if \(LOCAL_ONLY_MODE\) \{\s*setAuthGateActive\(false\);\s*renderAccountMenu\(null\);\s*return;/s, 'local-only mode must skip all account initialization');
assert.match(html, /function queueCloudSync\([^)]*\) \{\s*if \(LOCAL_ONLY_MODE \|\|/s, 'local-only mode must never queue cloud writes');
assert.match(html, /id="legacySyncBtn"[^>]*hidden/, 'the legacy text-sync entry point must be hidden without deleting it');
assert.match(html, /id="fullBackupFileInput"/, 'a full local backup import control is required');
assert.match(html, /function exportFullBackup\(/, 'the app must export a complete local backup');
assert.match(html, /function importFullBackup\(/, 'the app must import a complete local backup');
assert.match(html, /format:\s*'tiantianshuati-local-backup'/, 'full backups need a stable format marker');
assert.doesNotMatch(html.match(/function exportFullBackup\([\s\S]*?\n\}/)?.[0] || '', /apiKey/i, 'full backups must not include the DeepSeek API key');

assert.equal(packageJson.scripts['desktop:prepare'], 'node scripts/build-desktop-assets.mjs', 'desktop assets need a reproducible preparation command');
assert.ok(packageJson.scripts['desktop:build'], 'the project must expose a desktop build command');
assert.ok(fs.existsSync(new URL('../src-tauri/tauri.conf.json', import.meta.url)), 'Tauri configuration is required');
assert.ok(fs.existsSync(new URL('../src-tauri/Cargo.toml', import.meta.url)), 'the Rust Tauri package is required');
assert.ok(fs.existsSync(new URL('../src-tauri/src/main.rs', import.meta.url)), 'the desktop entry point is required');
assert.ok(fs.existsSync(new URL('../src-tauri/icons/icon.ico', import.meta.url)), 'Windows packaging requires an application icon');
assert.match(fs.readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'), /"icon":\s*\[\s*"icons\/icon\.ico"\s*\]/s, 'the Tauri bundle must explicitly use the Windows icon');
assert.match(fs.readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'), /"targets":\s*\[\s*"nsis"\s*\]/s, 'the Windows build must use the Unicode-capable NSIS installer');
assert.ok(fs.existsSync(new URL('../src-tauri/tauri.macos.conf.json', import.meta.url)), 'macOS packaging needs an isolated override config');
assert.match(fs.readFileSync(new URL('../src-tauri/tauri.macos.conf.json', import.meta.url), 'utf8'), /"targets":\s*\[\s*"dmg"\s*\]/s, 'the macOS override must not alter the Windows NSIS target');

console.log('local-only mode contract passed');
