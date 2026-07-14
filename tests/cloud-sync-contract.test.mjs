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
assert.match(html, /if \(authSessionGeneration !== sessionGeneration \|\| authenticatedUser\?\.id !== userId \|\| cloudSyncInitializedFor !== userId\) return;/, 'a stale migration response must not apply data after an account switch');
assert.match(html, /const LS_MIGRATION_BUFFER\s*=\s*'ttsk_pending_migration'/, 'an unresolved migration needs an account-scoped local buffer');
assert.match(html, /function learningStorageKey\(key, userId = activeLearningUserId\)/, 'learning cache keys must be namespaced by the active account');
assert.match(html, /return userId \? key \+ ':' \+ userId : key;/, 'anonymous legacy data must remain separate from authenticated caches');
assert.match(html, /function migrationBufferKey\(userId\)/, 'pending migrations must use account-scoped storage keys');
assert.match(html, /let authSessionGeneration = 0/, 'async work must be tied to an authentication generation');
assert.match(html, /authSessionGeneration !== sessionGeneration/, 'stale fetches and writes must be ignored after an account switch');
assert.match(html, /const CLOUD_RETRY_LIMIT\s*=\s*3/, 'transient retries must be bounded');
assert.match(html, /function scheduleCloudRetry\(/, 'transient failures need scheduled retry handling');
assert.match(html, /cloudRetryAttempt \+= 1/, 'scheduled retries must increase their backoff attempt');
assert.match(html, /clearTimeout\(cloudRetryTimer\)/, 'retry timers must be cancelled on account changes');
const applySessionSource = html.match(/function applyAuthenticatedSession\([^)]*\) \{([\s\S]*?)\n\}/)?.[1] || '';
assert.match(applySessionSource, /clearTimeout\(cloudSyncTimer\)/, 'a new authenticated account must cancel the previous account write timer');
assert.match(html, /function beginInitialMigration\([\s\S]*?setAuthGateActive\(true\)/, 'account switches must keep the neutral gate up before clearing the previous account cache');
assert.match(html, /if \(error\) \{[\s\S]*?setAuthStatus\('网络不可用，恢复网络后会继续准备学习数据。'\)/, 'a failed initial fetch must remain a visible loading/retry state rather than expose the previous account');
assert.match(html, /function resolveInitialMigration\([\s\S]*?const localSnapshot = getPendingMigrationSnapshot\(userId\)/, 'migration must read the isolated pending buffer instead of the newly-cleared active cache');
assert.match(html, /let cloudSyncMigrationPending = false/, 'failed migration fetches need a pending retry state');
assert.match(html, /addEventListener\('online'[\s\S]*?cloudSyncMigrationPending[\s\S]*?resolveInitialMigration\(\)/, 'coming online must retry a pending snapshot fetch before sync');
assert.match(html, /cloudSyncAwaitingInitialCreate = true;[\s\S]*?queueCloudSync\(0\)/, 'a verified empty account must enqueue creation of its empty snapshot row');
assert.match(html, /if \(cloudSyncAwaitingInitialCreate\)[\s\S]*?setAuthGateActive\(false\)/, 'the empty-account loading gate may only release after a successful upsert');
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
