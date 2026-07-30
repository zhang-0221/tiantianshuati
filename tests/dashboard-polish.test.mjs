import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extractFunction(name) {
  const start = html.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist in index.html`);
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
vm.runInContext(extractFunction('getWorkspaceStats'), sandbox);

assert.deepEqual(JSON.parse(JSON.stringify(sandbox.getWorkspaceStats([
  { questions: [{ id: 0 }, { id: 1 }], isCorrect: { 0: true, 1: false } },
  { questions: [{ id: 0 }], isCorrect: { 0: false } },
], { daily: { '2026-07-14': { total: 6, correct: 4 } } }, '2026-07-14'))), {
  libraryTotal: 2,
  todayAnswered: 6,
  reviewDue: 2,
});

for (const id of ['statLibraryTotal', 'statTodayAnswered', 'statReviewDue']) {
  assert.match(html, new RegExp(`id="${id}"`), `missing live metric #${id}`);
}
assert.match(html, /class="si-icon">📥<\/span>导入/, 'the sidebar should preserve the original emoji import icon');
assert.match(html, /<div class="card-hd">📥 导入资料<\/div>/, 'the import heading should preserve its original emoji icon');
assert.match(html, /<div class="up-icon">📄<\/div>/, 'the upload area should preserve its original emoji icon');
assert.match(html, /\.chat-toggle\{bottom:28px/, 'the mobile chat button should sit below the generation action');

console.log('dashboard polish contract passed');
