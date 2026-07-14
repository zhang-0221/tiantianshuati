import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /const LS_KEY = 'ttsk_ds_key'/);
assert.match(html, /const AUTH_CONFIG = window\.TTSK_AUTH_CONFIG/);
assert.doesNotMatch(html, /service[_-]?role|serviceRole|SUPABASE_SERVICE_ROLE_KEY/i);

console.log('account auth client contract passed');
