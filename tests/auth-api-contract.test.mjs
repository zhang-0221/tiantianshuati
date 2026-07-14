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
assert.match(shared, /kv\.eval\(/);
assert.doesNotMatch(shared, /kv\.expire\(/);

for (const route of ['register', 'login', 'password-reset', 'resend-verification']) {
  const source = read(`api/auth/${route}.mjs`);
  assert.match(source, /req\.method !== 'POST'/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /console\.log\([^)]*password/i);
}

assert.match(read('api/auth/login.mjs'), /signInWithPassword/);
assert.match(read('api/auth/login.mjs'), /EMAIL_UNVERIFIED/, 'an otherwise valid login must distinguish an unverified email');
assert.match(read('api/auth/login.mjs'), /email[_\s-]?not[_\s-]?confirmed|email not confirmed/i, 'the login route must only classify Supabase\'s explicit unconfirmed-email error');
assert.match(read('api/auth/password-reset.mjs'), /resetPasswordForEmail/);

const resendVerification = read('api/auth/resend-verification.mjs');
assert.match(resendVerification, /auth\.resend\(/, 'unverified users need a safe way to request another verification email');
assert.match(resendVerification, /type:\s*['"]signup['"]/, 'the resend route must only send signup verification emails');
assert.match(resendVerification, /return json\(\{ ok: true \}/, 'the resend route must not reveal whether a username exists');

const register = read('api/auth/register.mjs');
assert.match(register, /data:\s*\{\s*username\s*\}/);
assert.doesNotMatch(register, /\.from\('profiles'\)\.insert\(/);

console.log('auth api contract passed');
