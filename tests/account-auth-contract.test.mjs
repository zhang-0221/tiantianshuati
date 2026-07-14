import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /const LS_KEY = 'ttsk_ds_key'/);
assert.match(html, /const AUTH_CONFIG = window\.TTSK_AUTH_CONFIG/);
assert.doesNotMatch(html, /service[_-]?role|serviceRole|SUPABASE_SERVICE_ROLE_KEY/i);
assert.match(html, /id="authGate"/, 'the learning workspace should be protected by an account gate');
assert.match(html, /id="loginUsername"/, 'the login form needs a username field');
assert.match(html, /id="registerEmail"/, 'registration must collect a recovery email');
assert.match(html, /id="forgotPasswordBtn"/, 'password recovery must be reachable from login');
assert.match(html, /login-landscape\.png/, 'the supplied landscape must be the login background');
assert.match(html, /class="auth-card/, 'the login form needs a dedicated glass card');
assert.match(html, /id="registerForm"/, 'registration must be available without leaving the gate');
assert.match(html, /id="resetForm"/, 'password reset must be available without leaving the gate');
assert.match(html, /@media\(max-width:640px\)[\s\S]*?\.auth-card/, 'the auth card requires a mobile layout');

console.log('account auth client contract passed');
