import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = html.slice(html.indexOf('async function readDocxText('), html.indexOf('async function processFileGetText('));
const text = value => ({ nodeType: 3, textContent: value });
const element = (tagName, ...childNodes) => ({ nodeType: 1, tagName, childNodes, children: childNodes.filter(node => node.nodeType === 1), getAttribute: () => null });
async function read(body) {
  const buffer = new ArrayBuffer(0);
  const sandbox = {
    mammoth: { convertToHtml: async ({ arrayBuffer }) => { assert.equal(arrayBuffer, buffer); return { value: '<converted-document>' }; } },
    DOMParser: class { parseFromString(value, type) { assert.equal(value, '<converted-document>'); assert.equal(type, 'text/html'); return { body }; } },
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return sandbox.readDocxText(buffer);
}

test('Word soft breaks preserve individual options rather than concatenating them', async () => {
  const result = await read(element('BODY', element('P', text('原题')), element('P', text('A. 数据'), element('BR'), text('B. 信息'), element('BR'), text('C. 联系'), element('BR'), text('D. 模型'))));
  assert.equal(result, '原题\n\nA. 数据\nB. 信息\nC. 联系\nD. 模型');
});

test('automatic numbering and table answer columns survive conversion to text', async () => {
  const result = await read(element('BODY', element('OL', element('LI', element('P', text('第一题'))), element('LI', element('P', text('第二题')))), element('TABLE', element('TR', element('TD', element('P', text('题号'))), element('TD', element('P', text('答案')))), element('TR', element('TD', text('1')), element('TD', text('C'))))));
  assert.ok(result.includes('1. 第一题\n\n2. 第二题'));
  assert.ok(result.includes('题号\t答案'));
  assert.ok(result.includes('1\tC'));
});

test('non-content HTML is excluded from text supplied to the model', async () => {
  const result = await read(element('BODY', element('SCRIPT', text('script-code')), element('STYLE', text('style-code')), element('P', text('真实题目'))));
  assert.equal(result, '真实题目');
});
