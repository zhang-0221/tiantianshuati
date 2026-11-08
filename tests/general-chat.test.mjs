import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /const CHAT_SYS = '你是一个通用的 DeepSeek 助手/, 'chat should use the general DeepSeek prompt');
assert.match(html, /max_tokens: 4096/, 'chat should allow complete answers');
assert.doesNotMatch(html, /鼓励用户思考，引导式提问/, 'chat should not force a tutoring style');
console.log('general chat contract passed');
