# Generation Feedback and Mobile Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make the three AI generation flows visibly communicate loading, success, failure, and retry states while keeping generator controls comfortable on small screens.

**Architecture:** Retain each existing status container and generation function. Add a pure HTML formatter for feedback states plus one DOM writer; the current generators call it instead of writing ad-hoc loading and error markup. Add one shared feedback style and narrowly-scoped mobile rules without changing API calls, storage, or navigation behavior.

**Tech Stack:** Semantic HTML, CSS custom properties, vanilla browser JavaScript, Node.js built-in test runner.

---

## File structure

- Modify: index.html — feedback CSS, generator control classes, feedback formatter, and three generator functions.
- Create: tests/generation-feedback.test.mjs — pure formatter and markup contract tests.
- Verify: tests/dashboard-polish.test.mjs, tests/mindmap-quality.test.mjs, tests/study-pages-shell.test.mjs, tests/ui-workspace-shell.test.mjs.

### Task 1: Define feedback formatter behavior

**Files:**

- Create: tests/generation-feedback.test.mjs

- [ ] **Step 1: Write the failing test**

    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import vm from 'node:vm';

    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

    function extractFunction(name) {
      const start = html.indexOf('function ' + name);
      assert.notEqual(start, -1, name + ' should exist');
      const braceStart = html.indexOf('{', start); let depth = 0;
      for (let i = braceStart; i < html.length; i++) {
        if (html[i] === '{') depth++;
        if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
      }
    }

    const sandbox = {}; vm.createContext(sandbox);
    vm.runInContext(extractFunction('getGenerationFeedback'), sandbox);

    assert.match(sandbox.getGenerationFeedback('loading', '正在分析资料'), /gen-feedback loading/);
    assert.match(sandbox.getGenerationFeedback('success', '已保存到我的题库'), /gen-feedback success/);
    assert.match(sandbox.getGenerationFeedback('error', '网络连接失败', 'generateExam'), /onclick="generateExam\(\)"/);

    for (const id of ['genStatus', 'reciteGenStatus', 'vocabStatus']) {
      assert.ok(html.includes('id="' + id + '"'), 'missing generator status #' + id);
    }
    assert.match(html, /\\.gen-feedback\{/, 'missing shared feedback card styles');
    assert.match(html, /\\.generation-controls/, 'missing responsive generator control hook');

- [ ] **Step 2: Run the test to verify it fails**

    node --test tests/generation-feedback.test.mjs

Expected: failure because getGenerationFeedback and the shared feedback CSS do not exist.

- [ ] **Step 3: Commit the test-only red state**

    git add tests/generation-feedback.test.mjs
    git commit -m "test: define generation feedback contract"

### Task 2: Implement unified feedback cards and retry actions

**Files:**

- Modify: index.html:367-369 — replace the narrow loading presentation with shared feedback card styles.
- Modify: index.html:904-906, 991-992, 1010-1018 — apply generation-controls to the existing generator-control wrappers without changing IDs or onclick handlers.
- Modify: index.html:1232-1241 — add getGenerationFeedback and setGenerationFeedback.
- Modify: index.html:2150-2211, 4147-4200, 4326-4400 — replace direct status.innerHTML writes with setGenerationFeedback calls.

- [ ] **Step 1: Add shared styles**

    .gen-feedback{display:flex;align-items:flex-start;gap:10px;margin-top:12px;padding:11px 13px;border:1px solid #dbe6f5;border-radius:12px;background:#f8fbff;color:#60718c;font-size:12px;line-height:1.6;}
    .gen-feedback .spinner{flex:0 0 auto;margin-top:2px;}
    .gen-feedback.success{border-color:#bce7d3;background:#f1fcf6;color:#187653;}
    .gen-feedback.error{border-color:#f2c9c6;background:#fff7f6;color:#a63a34;}
    .gen-feedback-retry{margin-left:auto;flex:0 0 auto;border:0;border-radius:8px;padding:5px 9px;background:#fff;color:#2a67d7;font:700 12px var(--font);cursor:pointer;}

- [ ] **Step 2: Add the formatter and DOM writer**

    function getGenerationFeedback(state, message, retryHandler) {
      const safeMessage = String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const icon = state === 'loading' ? '<div class="spinner"></div>' : state === 'success' ? '<span>✓</span>' : '<span>!</span>';
      const retry = state === 'error' && retryHandler ? '<button class="gen-feedback-retry" onclick="' + retryHandler + '()">重新尝试</button>' : '';
      return '<div class="gen-feedback ' + state + '">' + icon + '<span>' + safeMessage + '</span>' + retry + '</div>';
    }

    function setGenerationFeedback(statusEl, state, message, retryHandler) {
      statusEl.innerHTML = getGenerationFeedback(state, message, retryHandler);
    }

- [ ] **Step 3: Update each generator state**

For generateExam, generateReciteExam, and generateVocabStory:

    setGenerationFeedback(status, 'loading', '连接 DeepSeek…');

Use the existing stage wording for long text and chunk progress. On success:

    setGenerationFeedback(status, 'success', '已生成 ' + questions.length + ' 道题，并保存到我的题库');

Use the equivalent existing result count for recitation and vocabulary. In each catch block, preserve the existing message normalization and call:

    setGenerationFeedback(status, 'error', msg, 'generateExam');

Use generateReciteExam and generateVocabStory respectively for the other two catch blocks. Keep the existing toast calls and button reset statements.

- [ ] **Step 4: Run the focused test to verify it passes**

    node --test tests/generation-feedback.test.mjs

Expected: 1 passing test file and all three state variants detected.

- [ ] **Step 5: Commit feedback behavior**

    git add index.html tests/generation-feedback.test.mjs
    git commit -m "feat: add generator feedback and retry states"

### Task 3: Improve generator controls on mobile

**Files:**

- Modify: index.html:788 and 831 — add the mobile generation-control and feedback layout rules.
- Modify: tests/generation-feedback.test.mjs — add mobile style assertions.

- [ ] **Step 1: Extend the failing test**

    assert.match(html, /@media\(max-width:640px\)\{[\s\S]*\.generation-controls\s*\{[\s\S]*flex-direction:column/, 'generator controls should stack on phones');
    assert.match(html, /\\.gen-feedback\{[\s\S]*width:100%/, 'feedback cards should fill the available mobile width');

- [ ] **Step 2: Run the focused test to verify it fails**

    node --test tests/generation-feedback.test.mjs

Expected: failure for the missing mobile generator-control rules.

- [ ] **Step 3: Add the mobile rules**

    @media(max-width:640px){
      .generation-controls{flex-direction:column;align-items:stretch!important;}
      .generation-controls .btn{width:100%;}
      .generation-controls label{padding:3px 0;}
      .gen-feedback{width:100%;margin-top:10px;}
      .gen-feedback-retry{margin-left:0;}
    }

Keep the current sidebar, chat-toggle, and study-page media rules unchanged.

- [ ] **Step 4: Run the focused test to verify it passes**

    node --test tests/generation-feedback.test.mjs

Expected: the focused test passes.

- [ ] **Step 5: Commit responsive polish**

    git add index.html tests/generation-feedback.test.mjs
    git commit -m "style: improve mobile generator controls"

### Task 4: Regression and interaction review

**Files:**

- Verify: index.html
- Verify: tests/generation-feedback.test.mjs and all existing test files.

- [ ] **Step 1: Run the complete test suite**

    node --test tests\*.mjs

Expected: all test files pass with 0 failures.

- [ ] **Step 2: Inspect the patch**

    git diff --check
    git status --short

Expected: no whitespace errors and no user-owned untracked files are staged.

- [ ] **Step 3: Review the local app**

Open http://localhost:4173/index.html. On desktop and mobile width, verify each generator has a full-width mobile action, feedback cards fit inside its content area, and the chat control does not cover the action. Trigger an input validation error to confirm existing validation remains unchanged. With a deliberately invalid API key, confirm the current error card presents a retry action without clearing inputs.
