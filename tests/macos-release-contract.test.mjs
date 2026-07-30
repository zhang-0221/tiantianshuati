import assert from 'node:assert/strict';
import fs from 'node:fs';

const macConfig = new URL('../src-tauri/tauri.macos.conf.json', import.meta.url);
assert.ok(fs.existsSync(macConfig), 'macOS needs a Tauri override configuration');

const config = fs.readFileSync(macConfig, 'utf8');
assert.match(config, /"targets"\s*:\s*\[\s*"dmg"\s*\]/s, 'macOS must bundle a DMG');
assert.match(config, /"icons\/icon\.icns"/, 'macOS must use the ICNS application icon');

const workflow = fs.readFileSync(new URL('../.github/workflows/macos-release.yml', import.meta.url), 'utf8');
assert.match(workflow, /workflow_dispatch:/, 'maintainers must be able to publish macOS assets manually');
assert.match(workflow, /release_tag:/, 'manual releases need an explicit tag input');
assert.match(workflow, /- runner: macos-14\s+target: x86_64-apple-darwin/s, 'the available Apple Silicon runner must cross-build the Intel target');
assert.match(workflow, /- runner: macos-14\s+target: aarch64-apple-darwin/s, 'the workflow must build the native Apple Silicon target');
assert.doesNotMatch(workflow, /macos-13/, 'the workflow must not wait for the unavailable Intel runner');
assert.match(workflow, /x86_64-apple-darwin/, 'the Intel target is required');
assert.match(workflow, /aarch64-apple-darwin/, 'the Apple Silicon target is required');
assert.match(workflow, /tauri\.macos\.conf\.json/, 'the workflow must use the isolated DMG configuration');
assert.match(workflow, /gh release upload/, 'the workflow must attach the DMGs to a GitHub Release');
assert.match(workflow, /--clobber/, 'a rerun must replace an older same-name DMG');

console.log('macOS release contract passed');
