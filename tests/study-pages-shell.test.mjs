import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

for (const id of ['libraryPageStats', 'recitePageStats', 'vocabPageStats', 'mindPageStats']) {
  assert.ok(html.includes(`id="${id}"`), `missing shared stats container #${id}`);
}

for (const id of ['tabLibrary', 'tabRecite', 'tabVocab', 'tabMindmap']) {
  assert.ok(html.includes(`class="tab-content study-page" id="${id}"`), `${id} should use the shared page shell`);
}
assert.match(html, /class="empty-state study-empty"/, 'each shared page should use the study empty-state treatment');
assert.match(html, /\.study-page-content\{grid-template-columns:1fr/, 'the mobile layout should collapse the study content column');
assert.doesNotMatch(html, /可背诵资料/, 'the library should not show an unhelpful recitation stat');
assert.match(html, /getElementById\('libraryStudyLayout'\)\.style\.display = 'none'/, 'library chrome should hide while viewing details');
assert.match(
  html,
  /function practiceNode\(\)[\s\S]*?getElementById\('libraryStudyLayout'\)\.style\.display = 'none'/,
  'mind-map practice should also hide the library chrome instead of leaving a blank gap'
);
assert.match(html, /DeepSeek API Key 无效或已过期/, 'chat should explain authentication failures clearly');

function extractFunction(name) {
  const start = html.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const braceStart = html.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(extractFunction('getStudyPageStats'), sandbox);

assert.match(
  html,
  /\.library-practice-mode \.study-page-head,\.library-practice-mode \.library-page-stats\{display:none;\}/,
  'practice mode should hide the library heading and summary stats'
);
assert.match(
  extractFunction('setLibraryPracticeMode'),
  /classList\.toggle\('library-practice-mode', isPractice\)/,
  'practice mode should be controlled through the library page shell'
);
for (const functionName of ['showQuizView', 'startTypePracticeWithOptions', 'startPractice', 'practiceNode']) {
  assert.match(
    extractFunction(functionName),
    /setLibraryPracticeMode\(true\)/,
    `${functionName} should enter focused practice mode`
  );
}
assert.match(
  extractFunction('showExamDetail'),
  /setLibraryPracticeMode\(true\)/,
  'exam details should also hide the library heading and summary stats'
);
assert.match(
  extractFunction('showLibView'),
  /setLibraryPracticeMode\(false\)/,
  'returning to the library list should restore the library page chrome'
);

assert.deepEqual(JSON.parse(JSON.stringify(sandbox.getStudyPageStats([
  { questions: [{ type: 'short' }, { type: 'single' }], outline: [{ name: 'A' }] },
  { questions: [{ type: 'essay' }], outline: [] },
], [{ words: ['apple', 'banana'] }]))), {
  library: [2, 3],
  recite: [2, 2, 0],
  vocab: [1, 2, 0],
  mind: [1, 1, 1],
});

console.log('study page shell contract passed');
