import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

const shared = read('api/auth/_shared.mjs');
assert.match(shared, /export function normalizeUsername/);
assert.match(shared, /export async function rateLimit/);
assert.match(shared, /Access-Control-Allow-Origin/);
assert.match(shared, /\^\[a-z0-9_\]\{3,24\}\$/);
assert.match(shared, /@vercel\/kv/);

for (const route of ['register', 'login', 'password-reset']) {
  const source = read(`api/auth/${route}.mjs`);
  assert.match(source, /req\.method !== 'POST'/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /console\.log\([^)]*password/i);
}

assert.match(read('api/auth/login.mjs'), /signInWithPassword/);
assert.match(read('api/auth/password-reset.mjs'), /resetPasswordForEmail/);

console.log('auth api contract passed');
