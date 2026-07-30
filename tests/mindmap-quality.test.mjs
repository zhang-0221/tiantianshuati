import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extractFunction(name) {
  const marker = `function ${name}`;
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, `${name} should exist in index.html`);
  const braceStart = html.indexOf('{', start);
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

const sandbox = {};
vm.createContext(sandbox);
for (const fn of ['getOutlineStats', 'isGenericMindTitle', 'isSubstantialMaterial', 'validateGeneratedOutline']) {
  vm.runInContext(extractFunction(fn), sandbox);
}

const richOutline = [
  {
    title: 'Chapter A',
    keyPoints: [],
    children: [
      {
        title: 'Module A1',
        keyPoints: [],
        children: [
          {
            title: 'Concept A1',
            keyPoints: [],
            children: [
              { title: 'Definition A1', keyPoints: ['a', 'b'], children: [] },
              { title: 'Rule A1', keyPoints: ['a', 'b'], children: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Chapter B',
    keyPoints: [],
    children: [
      {
        title: 'Module B1',
        keyPoints: [],
        children: [
          {
            title: 'Concept B1',
            keyPoints: [],
            children: [
              { title: 'Definition B1', keyPoints: ['a', 'b'], children: [] },
              { title: 'Rule B1', keyPoints: ['a', 'b'], children: [] },
            ],
          },
        ],
      },
    ],
  },
];

const sparseOutline = [
  { title: 'Summary', keyPoints: [], children: [{ title: 'Other', keyPoints: [], children: [] }] },
];

assert.deepEqual(JSON.parse(JSON.stringify(sandbox.getOutlineStats(richOutline))), {
  total: 10,
  maxDepth: 4,
  leafCount: 4,
  leavesMissingKeyPoints: 0,
  genericTitleCount: 0,
});

assert.equal(sandbox.isGenericMindTitle('Other'), true);
assert.equal(sandbox.isGenericMindTitle('core definition'), false);
assert.equal(sandbox.isSubstantialMaterial('中'.repeat(1000)), true);
assert.equal(sandbox.isSubstantialMaterial('short text'), false);

assert.equal(sandbox.validateGeneratedOutline(richOutline, 'short text').ok, true);

const result = sandbox.validateGeneratedOutline(sparseOutline, '中'.repeat(1200));
assert.equal(result.ok, false);
assert.match(result.message, /too simple|过于简略/i);

console.log('mindmap quality tests passed');
