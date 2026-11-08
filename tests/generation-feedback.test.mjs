import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function extractFunction(name) {
  const start = html.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const braceStart = html.indexOf('{', start); let depth = 0;
  for (let i = braceStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}
const sandbox = {}; vm.createContext(sandbox);
vm.runInContext(extractFunction('getGenerationFeedback'), sandbox);

assert.match(sandbox.getGenerationFeedback('loading', '正在分析资料'), /gen-feedback loading/);
assert.match(sandbox.getGenerationFeedback('success', '已保存到我的题库'), /gen-feedback success/);
assert.match(sandbox.getGenerationFeedback('error', '网络连接失败', 'generateExam'), /onclick="generateExam\(\)"/);
for (const id of ['genStatus', 'reciteGenStatus', 'vocabStatus']) assert.ok(html.includes(`id="${id}"`), `missing generator status #${id}`);
assert.match(html, /\.gen-feedback\{/, 'missing shared feedback card styles');
assert.match(html, /\.generation-controls/, 'missing responsive generator control hook');

console.log('generation feedback contract passed');
