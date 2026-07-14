import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

for (const fn of ['buildLearningSnapshot', 'applyLearningSnapshot', 'queueCloudSync', 'flushCloudSync', 'resolveInitialMigration']) {
  assert.match(html, new RegExp(`(?:async )?function ${fn}\\(`), `missing cloud sync function: ${fn}`);
}

assert.match(html, /const CLOUD_SYNC_DELAY\s*=\s*900/, 'cloud writes must be debounced by 900ms');
assert.match(html, /library:\s*[^,}]+,\s*progress:\s*[^,}]+,\s*vocab_history:\s*[^,}]+,\s*settings:/s, 'snapshot must have the four supported learning fields');
const snapshotSource = html.match(/function buildLearningSnapshot\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
assert.doesNotMatch(snapshotSource, /apiKey|chat|token/i, 'the API key, chat history, and auth tokens must not be included in a learning snapshot');
assert.match(html, /from\('learning_snapshots'\)/, 'sync must use the account snapshot table');
assert.match(html, /upsert\(/, 'sync must upsert a single user snapshot');
assert.match(html, /else \{\s*queueCloudSync\(0\);\s*setSyncStatus\('已同步'\);\s*\}/, 'a verified account with no learning data must create its snapshot row');
assert.match(html, /addEventListener\('online'/, 'sync must retry when the network comes back');
assert.match(html, /visibilitychange/, 'sync must retry when the page becomes visible');
assert.match(html, /function mergeLibraries\(/, 'initial migration needs a deterministic library merge');
assert.match(html, /cloudById\.has\(exam\.id\)/, 'cloud exams must win ID collisions during a merge');
assert.match(html, /function saveLib\(\)[\s\S]*?queueCloudSync\(/, 'library saves must schedule cloud sync');
assert.match(html, /function recordAnswer\([\s\S]*?queueCloudSync\(/, 'answer progress must schedule cloud sync');
assert.match(html, /function saveVocabHistory\(\)[\s\S]*?queueCloudSync\(/, 'vocabulary saves must schedule cloud sync');

console.log('cloud sync contract passed');
