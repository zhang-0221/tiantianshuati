import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

assert.equal(fs.existsSync(new URL('../api/auth/password-reset.mjs', import.meta.url)), false);
assert.equal(fs.existsSync(new URL('../api/auth/resend-verification.mjs', import.meta.url)), false);

const shared = read('api/auth/_shared.mjs');
assert.match(shared, /export function normalizeUsername/);
assert.match(shared, /export async function rateLimit/);
assert.match(shared, /Access-Control-Allow-Origin/);
assert.match(shared, /\^\[a-z0-9_\]\{3,24\}\$/);
assert.match(shared, /@vercel\/kv/);
assert.match(shared, /kv\.eval\(/);
assert.doesNotMatch(shared, /kv\.expire\(/);
assert.match(shared, /localRateLimit/, 'a free Vercel deployment must keep a conservative fallback when KV is unavailable');

for (const route of ['register', 'login']) {
  const source = read(`api/auth/${route}.mjs`);
  assert.match(source, /req\.method !== 'POST'/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /console\.log\([^)]*password/i);
}

const login = read('api/auth/login.mjs');
assert.match(login, /signInWithPassword/);
assert.match(login, /select\('id, email'\)/, 'legacy account lookup must include the auth user id');
assert.match(login, /service\.auth\.admin\.updateUserById\(/, 'a correct legacy password must unlock an unconfirmed account');
assert.match(login, /email_confirm:\s*true/, 'legacy confirmation must not require a new email');

const register = read('api/auth/register.mjs');
assert.match(register, /internalEmailForUsername\(username\)/);
assert.match(register, /service\.auth\.admin\.createUser\(/);
assert.match(register, /email_confirm:\s*true/);
assert.match(register, /anonymous\.auth\.signInWithPassword/);
assert.doesNotMatch(register, /auth\.signUp\(/);
assert.doesNotMatch(register, /\.from\('profiles'\)\.insert\(/);

console.log('auth api contract passed');
