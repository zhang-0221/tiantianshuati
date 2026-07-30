import assert from 'node:assert/strict';
import fs from 'node:fs';

const macConfig = new URL('../src-tauri/tauri.macos.conf.json', import.meta.url);
assert.ok(fs.existsSync(macConfig), 'macOS needs a Tauri override configuration');

const config = fs.readFileSync(macConfig, 'utf8');
assert.match(config, /"targets"\s*:\s*\[\s*"dmg"\s*\]/s, 'macOS must bundle a DMG');
assert.match(config, /"icons\/icon\.icns"/, 'macOS must use the ICNS application icon');

console.log('macOS release contract passed');
