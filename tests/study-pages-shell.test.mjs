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

assert.deepEqual(JSON.parse(JSON.stringify(sandbox.getStudyPageStats([
  { questions: [{ type: 'short' }, { type: 'single' }], outline: [{ name: 'A' }] },
  { questions: [{ type: 'essay' }], outline: [] },
], [{ words: ['apple', 'banana'] }]))), {
  library: [2, 3, 2],
  recite: [2, 2, 0],
  vocab: [1, 2, 0],
  mind: [1, 1, 1],
});

console.log('study page shell contract passed');
