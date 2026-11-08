import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const requestSource = html.slice(html.indexOf('async function requestAIContent('), html.indexOf('// Call DeepSeek API for newly generated questions only.'));
function requestContext(response) {
  const calls = [];
  const sandbox = { apiKey: 'sk-test', fetchTimeout: async (...args) => { calls.push(args); return response; } };
  vm.createContext(sandbox);
  vm.runInContext(requestSource, sandbox);
  return { sandbox, calls };
}

test('extraction requests use JSON mode and low sampling temperature', async () => {
  const { sandbox, calls } = requestContext({ ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{"questions":[]}' } }] }) });
  assert.equal((await sandbox.requestAIJSON('system', 'source')).questions.length, 0);
  const body = JSON.parse(calls[0][1].body);
  assert.equal(body.response_format.type, 'json_object');
  assert.equal(body.temperature, 0.1);
});

test('length-truncated output is rejected even when it happens to contain valid JSON', async () => {
  const { sandbox } = requestContext({ ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{"questions":[{"question":"partial"}]}' } }] }) });
  await assert.rejects(sandbox.requestAIJSON('system', 'source'), error => error.code === 'AI_INCOMPLETE_RESPONSE');
});

test('unfinished and malformed JSON responses cannot be repaired into success', async () => {
  const { sandbox } = requestContext({ ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{"questions":[{"question":"partial' } }] }) });
  await assert.rejects(sandbox.requestAIJSON('system', 'source'), /JSON 不完整/);
});

test('authentication and rate-limit errors do not trigger extraction retries', async () => {
  for (const status of [401, 402, 429]) {
    const { sandbox } = requestContext({ ok: false, status, json: async () => ({}) });
    await assert.rejects(sandbox.requestAIJSON('system', 'source'), error => error.code === 'AI_HTTP_ERROR');
  }
});

test('answerless questions render a pending state without grading interactions', () => {
  const sandbox = { escH: text => text, expBox: () => '' };
  vm.createContext(sandbox);
  vm.runInContext(html.slice(html.indexOf('function hasObjectiveAnswer('), html.indexOf('function renderSingle(')), sandbox);
  const q = { type: 'single', options: ['数据', '信息'], correctIndex: null };
  assert.equal(sandbox.hasObjectiveAnswer(q), false);
  const area = {};
  sandbox.renderPendingAnswer(area, q, 0);
  assert.match(area.innerHTML, /答案待补充/);
  assert.match(area.innerHTML, /openEditModal\(0\)/);
  assert.doesNotMatch(area.innerHTML, /clickSingle|clickTf|subM/);
});
