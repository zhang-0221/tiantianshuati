# macOS Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Intel and Apple Silicon macOS DMGs in GitHub Actions and upload them to a GitHub Release without changing the web, Windows, or Android distribution paths.

**Architecture:** A Tauri macOS override config changes only the bundle target and icon for a DMG build. A GitHub Actions matrix runs two independent Apple Silicon macOS jobs: one cross-builds the Intel target and one builds the Apple Silicon target. Each uploads a DMG as an intermediate artifact, then a publish job creates or finds the requested release and replaces the two stable asset names.

**Tech Stack:** Tauri 2, Rust, Node.js/npm, GitHub Actions, GitHub CLI available on hosted runners.

---

### Task 1: Add a macOS bundle configuration and its contract test

**Files:**
- Create: `src-tauri/tauri.macos.conf.json`
- Create: `tests/macos-release-contract.test.mjs`
- Modify: `tests/local-only-mode-contract.test.mjs`

- [ ] **Step 1: Write the failing macOS configuration assertions**

Create `tests/macos-release-contract.test.mjs` with assertions that require the config and workflow to exist:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const macConfig = new URL('../src-tauri/tauri.macos.conf.json', import.meta.url);
assert.ok(fs.existsSync(macConfig), 'macOS needs a Tauri override configuration');

const config = fs.readFileSync(macConfig, 'utf8');
assert.match(config, /"targets"\s*:\s*\[\s*"dmg"\s*\]/s, 'macOS must bundle a DMG');
assert.match(config, /"icons\/icon\.icns"/, 'macOS must use the ICNS application icon');

console.log('macOS release contract passed');
```

- [ ] **Step 2: Run the new test and confirm it fails**

Run: `node --test tests/macos-release-contract.test.mjs`

Expected: FAIL because `src-tauri/tauri.macos.conf.json` does not exist.

- [ ] **Step 3: Add the macOS-only Tauri override**

Create `src-tauri/tauri.macos.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "bundle": {
    "targets": ["dmg"],
    "icon": ["icons/icon.icns"]
  }
}
```

Do not change `src-tauri/tauri.conf.json`; it remains the Windows NSIS configuration.

- [ ] **Step 4: Extend the existing local-only contract**

Append to `tests/local-only-mode-contract.test.mjs`:

```js
assert.ok(fs.existsSync(new URL('../src-tauri/tauri.macos.conf.json', import.meta.url)), 'macOS packaging needs an isolated override config');
assert.match(fs.readFileSync(new URL('../src-tauri/tauri.macos.conf.json', import.meta.url), 'utf8'), /"targets"\s*:\s*\[\s*"dmg"\s*\]/s, 'the macOS override must not alter the Windows NSIS target');
```

- [ ] **Step 5: Run the focused tests**

Run: `node --test tests/macos-release-contract.test.mjs tests/local-only-mode-contract.test.mjs`

Expected: both tests PASS.

- [ ] **Step 6: Commit the configuration unit**

```bash
git add src-tauri/tauri.macos.conf.json tests/macos-release-contract.test.mjs tests/local-only-mode-contract.test.mjs
git commit -m "feat: add macOS DMG bundle configuration"
```

### Task 2: Add the dual-architecture GitHub Actions workflow

**Files:**
- Create: `.github/workflows/macos-release.yml`
- Modify: `tests/macos-release-contract.test.mjs`

- [ ] **Step 1: Extend the failing workflow assertions**

Append to `tests/macos-release-contract.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test tests/macos-release-contract.test.mjs`

Expected: FAIL because `.github/workflows/macos-release.yml` does not exist.

- [ ] **Step 3: Create the workflow**

Create `.github/workflows/macos-release.yml` with:

```yaml
name: Build macOS release

on:
  workflow_dispatch:
    inputs:
      release_tag:
        description: Existing or new GitHub Release tag, for example v0.1.0
        required: true
        type: string
  push:
    tags:
      - 'v*'

permissions:
  contents: write

env:
  RELEASE_TAG: ${{ github.event_name == 'workflow_dispatch' && inputs.release_tag || github.ref_name }}

jobs:
  build:
    name: macOS (${{ matrix.asset_suffix }})
    strategy:
      fail-fast: false
      matrix:
        include:
          - runner: macos-14
            target: x86_64-apple-darwin
            asset_suffix: x64
          - runner: macos-14
            target: aarch64-apple-darwin
            asset_suffix: aarch64
    runs-on: ${{ matrix.runner }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run desktop:prepare
      - run: npx tauri build --config src-tauri/tauri.macos.conf.json --target ${{ matrix.target }}
      - run: |
          mkdir -p release-assets
          VERSION=$(node -p "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json', 'utf8')).version")
          cp src-tauri/target/${{ matrix.target }}/release/bundle/dmg/*.dmg release-assets/xishuashua_${VERSION}_${{ matrix.asset_suffix }}.dmg
      - uses: actions/upload-artifact@v4
        with:
          name: macos-${{ matrix.asset_suffix }}
          path: release-assets/*.dmg
          if-no-files-found: error

  publish:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          path: release-assets
          merge-multiple: true
      - env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh release view "$RELEASE_TAG" || gh release create "$RELEASE_TAG" --title "喜刷刷 $RELEASE_TAG" --notes "macOS 安装包由 GitHub Actions 构建，未进行 Apple 签名或公证。"
          gh release upload "$RELEASE_TAG" release-assets/*.dmg --clobber
```

- [ ] **Step 4: Run the workflow contract test**

Run: `node --test tests/macos-release-contract.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the workflow unit**

```bash
git add .github/workflows/macos-release.yml tests/macos-release-contract.test.mjs
git commit -m "ci: build and publish macOS DMGs"
```

### Task 3: Verify, publish, and document the new downloads

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the download table**

Add two rows to `README.md` below the existing Windows and Android rows:

```markdown
| macOS Intel | `xishuashua_0.1.0_x64.dmg` | 适用于 Intel 芯片 Mac；首次打开可能需要在“隐私与安全性”中允许。 |
| macOS Apple Silicon | `xishuashua_0.1.0_aarch64.dmg` | 适用于 M 系列芯片 Mac；首次打开可能需要在“隐私与安全性”中允许。 |
```

- [ ] **Step 2: Run the full local suite**

Run: `npm.cmd test`

Expected: 13 tests PASS, 0 failures.

- [ ] **Step 3: Commit and push the release automation**

```bash
git add README.md
git commit -m "docs: add macOS download guidance"
git push origin HEAD:master
```

- [ ] **Step 4: Trigger the manual workflow for the existing release**

In GitHub Actions, select **Build macOS release**, click **Run workflow**, and enter `v0.1.0` as `release_tag`.

Expected: both matrix jobs succeed, then the publish job succeeds.

- [ ] **Step 5: Verify the public Release assets**

Open `https://github.com/zhang-0221/tiantianshuati/releases/tag/v0.1.0` and confirm all four files appear:

```text
xishuashua_0.1.0_x64-setup.exe
tiantianshuati_0.1.0_arm64.apk
xishuashua_0.1.0_x64.dmg
xishuashua_0.1.0_aarch64.dmg
```

- [ ] **Step 6: Commit any workflow correction only if the hosted runner reports a concrete failure**

Use the GitHub Actions log to make the smallest targeted correction, rerun the failing job, then commit with:

```bash
git add .github/workflows/macos-release.yml tests/macos-release-contract.test.mjs
git commit -m "fix: make macOS release workflow portable"
git push origin HEAD:master
```
