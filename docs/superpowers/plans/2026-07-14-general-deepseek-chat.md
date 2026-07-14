# General DeepSeek Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the built-in chat behave as a general DeepSeek conversation instead of a constrained learning Q&A assistant.

**Architecture:** Modify only the chat system prompt and response token limit in `index.html`; add a static test so these limits cannot regress.

**Tech Stack:** Vanilla JavaScript and Node.js built-in test runner.

---

### Task 1: Lock the general-chat contract

**Files:**

- Create: `tests/general-chat.test.mjs`
- Modify: `index.html:3279-3321`

- [ ] **Step 1: Write the failing test**

    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /const CHAT_SYS = '你是一个通用的 DeepSeek 助手/, 'chat should use the general DeepSeek prompt');
    assert.match(html, /max_tokens: 4096/, 'chat should allow complete answers');
    assert.doesNotMatch(html, /鼓励用户思考，引导式提问/, 'chat should not force a tutoring style');

- [ ] **Step 2: Verify red**

    node --test tests/general-chat.test.mjs

Expected: failure because the existing prompt is a constrained learning-assistant prompt and max_tokens is 1024.

- [ ] **Step 3: Implement the minimal change**

    const CHAT_SYS = '你是一个通用的 DeepSeek 助手。自然、准确地回答用户的问题；根据问题复杂度自行决定回答长度和结构。可以解释概念、分析问题、协助写作和代码。未知或不确定时明确说明，不编造信息。默认使用用户的语言回答。';

Replace the chat request setting `max_tokens: 1024` with `max_tokens: 4096`.

- [ ] **Step 4: Verify green and run full suite**

    node --test tests/general-chat.test.mjs
    node --test tests\*.mjs

Expected: all test files pass.

- [ ] **Step 5: Commit**

    git add index.html tests/general-chat.test.mjs
    git commit -m "feat: make chat a general DeepSeek assistant"
