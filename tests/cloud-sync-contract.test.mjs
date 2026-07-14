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
assert.match(html, /id="migrationModal"/, 'migration requires an explicit blocking choice modal');
assert.match(html, /function decideInitialMigration\(/, 'migration choices need explicit handlers');
assert.doesNotMatch(html, /window\.confirm\(/, 'migration must not use ambiguous browser confirmation dialogs');
assert.match(html, /function queueCloudSync\([\s\S]*?!cloudSyncMigrationResolved/, 'no cloud write may be queued before migration consent resolves');
assert.match(html, /function flushCloudSync\([\s\S]*?!cloudSyncMigrationResolved/, 'a stale queued write must also be blocked before migration consent resolves');
assert.match(html, /if \(document\.hidden\) \{\s*void flushPendingSync\(\);\s*return;\s*\}/, 'pending data must flush when the page is hidden');
assert.match(html, /!Array\.isArray\(snapshot\?\.progress\?\.daily\)/, 'snapshot progress objects must reject arrays');
assert.match(html, /!Array\.isArray\(snapshot\?\.progress\)/, 'the progress container itself must reject arrays');
assert.match(html, /!Array\.isArray\(snapshot\?\.settings\)/, 'snapshot settings must reject arrays');
assert.match(html, /function clearLearningCache\(/, 'declining local migration must clear account-unsafe cached data');
assert.match(html, /function clearLearningCache\([\s\S]*?reciteQuestions = \[\];[\s\S]*?currentMindExamId = null/, 'clearing an empty new account must also discard active study views');
assert.match(html, /if \(authenticatedUser\?\.id !== userId \|\| cloudSyncInitializedFor !== userId\) return;/, 'a stale migration response must not apply data after an account switch');
const migrationSource = html.match(/async function resolveInitialMigration\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
assert.doesNotMatch(migrationSource, /setSyncStatus\('已同步'\)/, 'only a successful upsert may show the synced status');
assert.match(html, /addEventListener\('online'/, 'sync must retry when the network comes back');
assert.match(html, /visibilitychange/, 'sync must retry when the page becomes visible');
assert.match(html, /function mergeLibraries\(/, 'initial migration needs a deterministic library merge');
assert.match(html, /cloudById\.has\(exam\.id\)/, 'cloud exams must win ID collisions during a merge');
assert.match(html, /function saveLib\(\)[\s\S]*?queueCloudSync\(/, 'library saves must schedule cloud sync');
assert.match(html, /function recordAnswer\([\s\S]*?queueCloudSync\(/, 'answer progress must schedule cloud sync');
assert.match(html, /function saveVocabHistory\(\)[\s\S]*?queueCloudSync\(/, 'vocabulary saves must schedule cloud sync');

console.log('cloud sync contract passed');
