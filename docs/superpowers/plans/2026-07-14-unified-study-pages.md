# Unified Study Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Give the library, recitation, vocabulary, and mind-map views one consistent learning-workspace hierarchy while preserving every current action and data flow.

**Architecture:** Keep the single-file application structure. Add shared study-page CSS and static page-header/summary containers to index.html; add one small renderer that derives display statistics from existing library and vocabHistory arrays. Existing list renderers keep their IDs, handlers, and detailed subviews unchanged.

**Tech Stack:** Semantic HTML, CSS custom properties, vanilla browser JavaScript, Node.js built-in test runner.

---

## File structure

- Modify: index.html — shared study-page styles, four page shells, derived-stat renderer, responsive rules.
- Create: tests/study-pages-shell.test.mjs — static shell contract and pure derived-stat tests.
- Modify: tests/ui-workspace-shell.test.mjs — retain the import-workspace and sidebar contract while learning pages are restyled.

### Task 1: Define the shared-page contract

**Files:**

- Create: tests/study-pages-shell.test.mjs

- [ ] **Step 1: Write the failing test**

    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import vm from 'node:vm';

    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    for (const id of ['libraryPageStats', 'recitePageStats', 'vocabPageStats', 'mindPageStats']) {
      assert.ok(html.includes('id="' + id + '"'), 'missing shared stats container #' + id);
    }
    for (const id of ['tabLibrary', 'tabRecite', 'tabVocab', 'tabMindmap']) {
      assert.ok(html.includes('class="tab-content study-page" id="' + id + '"'), id + ' should use the shared page shell');
    }

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
    vm.runInContext(extractFunction('getStudyPageStats'), sandbox);
    assert.deepEqual(JSON.parse(JSON.stringify(sandbox.getStudyPageStats([
      { questions:[{type:'short'},{type:'single'}], outline:[{name:'A'}] },
      { questions:[{type:'essay'}], outline:[] },
    ], [{ words:['apple','banana'] }]))), {
      library: [2, 3, 2], recite: [2, 2, 0], vocab: [1, 2, 0], mind: [1, 2, 1],
    });

- [ ] **Step 2: Run the test to verify it fails**

    node --test tests/study-pages-shell.test.mjs

Expected: failure reporting the missing libraryPageStats container and getStudyPageStats function.

- [ ] **Step 3: Commit the test-only red state**

    git add tests/study-pages-shell.test.mjs
    git commit -m "test: define unified study page shell"

### Task 2: Add the page shells and live display summaries

**Files:**

- Modify: index.html:760-815 — add shared page-shell styles after workspace styles.
- Modify: index.html:916-1016 — wrap the four learning views in the shared page shell and insert presentation containers around current controls and lists.
- Modify: index.html:1669-1688, 3307-3328, 4135-4164, 4370-4391 — invoke the derived-stat renderer from existing render functions.
- Modify: index.html near getWorkspaceStats() — add the pure derived-stat helper and DOM updater.

- [ ] **Step 1: Add the minimal shared styles**

    .study-page{padding:4px 0 18px;}
    .study-page-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin:4px 0 22px;}
    .study-page-kicker{font-size:11px;letter-spacing:.08em;font-weight:800;color:#4c78ba;}
    .study-page-title{margin:4px 0 0;color:#10213e;font-size:30px;line-height:1.16;letter-spacing:-.06em;}
    .study-page-desc{margin:7px 0 0;color:var(--muted);font-size:13px;}
    .study-page-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 22px;}
    .study-stat{padding:15px 17px;border:1px solid #e3ebf6;border-radius:14px;background:#f8fbff;}
    .study-stat b{display:block;font-size:23px;line-height:1;color:#173f7d;}
    .study-stat span{display:block;margin-top:6px;font-size:11px;color:var(--muted);}
    .study-page-content{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px;align-items:start;}
    .study-side-note{padding:17px;border:1px solid #e3ebf6;border-radius:15px;background:#f9fbff;color:var(--muted);font-size:12px;line-height:1.75;}

- [ ] **Step 2: Add static shells without moving functional nodes**

Use this structure for each view. Preserve libView, reciteListView, vocabHistory, mindListView, input IDs, list IDs, and every existing onclick handler inside it.

    <div class="tab-content study-page" id="tabLibrary">
      <header class="study-page-head">
        <div>
          <div class="study-page-kicker">LEARNING LIBRARY</div>
          <h2 class="study-page-title">我的题库</h2>
          <p class="study-page-desc">集中管理资料、试卷与学习进度。</p>
        </div>
        <button class="btn btn-p btn-sm" onclick="switchTab('import')">＋ 导入新资料</button>
      </header>
      <div class="study-page-stats" id="libraryPageStats"></div>
      <div class="study-page-content">
        <div id="libView">existing library controls, list, and empty state</div>
        <aside class="study-side-note">资料导入后可继续练习、背诵或查看知识导图。</aside>
      </div>
      <div id="detailView" style="display:none;"></div>
      <div id="quizView" style="display:none;"></div>
    </div>

For the other views use kickers RECITATION, VOCABULARY, and KNOWLEDGE MAP. Use stat IDs recitePageStats, vocabPageStats, and mindPageStats. Keep their existing import/generation controls in their own content area; do not add new behavior.

- [ ] **Step 3: Add the pure stat helper and DOM updater**

    function getStudyPageStats(exams, histories) {
      const countNodes = nodes => nodes.reduce((n, node) => n + 1 + (node.children ? countNodes(node.children) : 0), 0);
      const reciteExams = exams.filter(e => e.questions.some(q => q.type === 'short' || q.type === 'essay'));
      const reciteQuestions = reciteExams.reduce((n, e) => n + e.questions.filter(q => q.type === 'short' || q.type === 'essay').length, 0);
      const outlineExams = exams.filter(e => e.outline && e.outline.length);
      const outlineNodes = outlineExams.reduce((n, e) => n + countNodes(e.outline), 0);
      const words = histories.reduce((n, h) => n + h.words.length, 0);
      return {
        library:[exams.length, exams.reduce((n,e) => n + e.questions.length,0), reciteExams.length],
        recite:[reciteExams.length,reciteQuestions,0],
        vocab:[histories.length,words,0],
        mind:[outlineExams.length,outlineNodes,outlineExams.length]
      };
    }

    function renderStudyPageStats() {
      const stats = getStudyPageStats(library, vocabHistory);
      const labels = {
        library:['资料','题目','可背诵资料'],
        recite:['背诵资料','大题','今日复习'],
        vocab:['短文','累计单词','待巩固'],
        mind:['导图','知识点','已覆盖资料']
      };
      for (const key of Object.keys(labels)) {
        const el = document.getElementById(key + 'PageStats');
        if (el) el.innerHTML = stats[key].map((value, i) => '<div class="study-stat"><b>' + value + '</b><span>' + labels[key][i] + '</span></div>').join('');
      }
    }

Call renderStudyPageStats() at the start of renderLib(), renderReciteList(), renderVocabHistory(), and renderMindList().

- [ ] **Step 4: Run the focused test to verify it passes**

    node --test tests/study-pages-shell.test.mjs

Expected: 1 passing test file with the exact expected getStudyPageStats output.

- [ ] **Step 5: Commit the shell and renderer**

    git add index.html tests/study-pages-shell.test.mjs
    git commit -m "feat: unify learning page workspace shells"

### Task 3: Make empty states and responsive layout consistent

**Files:**

- Modify: index.html:759-788 — add module-aware empty-state and mobile rules.
- Modify: tests/study-pages-shell.test.mjs — assert responsive and empty-state hooks.

- [ ] **Step 1: Extend the failing test**

    assert.match(html, /class="empty-state study-empty"/, 'each shared page should use the study empty-state treatment');
    assert.match(html, /\.study-page-content\{grid-template-columns:1fr/, 'the mobile layout should collapse the study content column');

- [ ] **Step 2: Run the focused test to verify it fails**

    node --test tests/study-pages-shell.test.mjs

Expected: failure for the missing study-empty class.

- [ ] **Step 3: Add the minimal empty-state and mobile styles**

    .study-empty{border:1px dashed #d7e3f3;border-radius:15px;background:#fbfdff;}
    @media(max-width:768px){.study-page-content{grid-template-columns:1fr;}.study-side-note{display:none;}}
    @media(max-width:640px){.study-page-head{display:block;}.study-page-head .btn{margin-top:15px;width:100%;}.study-page-title{font-size:26px;}.study-page-stats{gap:8px;}.study-stat{padding:13px 10px;}.study-stat b{font-size:20px;}}

Add study-empty alongside empty-state for libEmpty, reciteEmpty, vocabHistoryEmpty, and mindEmpty. Do not change their text or IDs.

- [ ] **Step 4: Run the focused test to verify it passes**

    node --test tests/study-pages-shell.test.mjs

Expected: the focused test passes.

- [ ] **Step 5: Commit responsive polish**

    git add index.html tests/study-pages-shell.test.mjs
    git commit -m "style: polish shared learning page states"

### Task 4: Full regression and visual review

**Files:**

- Verify: index.html
- Verify: tests/dashboard-polish.test.mjs
- Verify: tests/mindmap-quality.test.mjs
- Verify: tests/study-pages-shell.test.mjs
- Verify: tests/ui-workspace-shell.test.mjs

- [ ] **Step 1: Run the full automated suite**

    node --test tests\*.mjs

Expected: all test files pass with 0 failures.

- [ ] **Step 2: Check the patch is clean**

    git diff --check
    git status --short

Expected: no whitespace errors. Do not stage .agents, .superpowers, or the user-owned JPG.

- [ ] **Step 3: Review the local app**

Open http://localhost:4173/index.html and verify desktop and 390 px mobile layouts. Switch through all four modules and confirm existing list clicks, import controls, generation controls, detail views, empty states, and the floating chat control still work without overlap.

- [ ] **Step 4: Commit only if review required a tracked correction**

    git add index.html tests/study-pages-shell.test.mjs
    git commit -m "fix: resolve shared learning page review findings"
