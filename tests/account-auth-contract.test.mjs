import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /const LS_KEY = 'ttsk_ds_key'/);
assert.match(html, /const AUTH_CONFIG = window\.TTSK_AUTH_CONFIG/);
assert.doesNotMatch(html, /service[_-]?role|serviceRole|SUPABASE_SERVICE_ROLE_KEY/i);
assert.match(html, /id="authGate"/, 'the learning workspace should be protected by an account gate');
assert.match(html, /id="authGate"[^>]*hidden/, 'the unfinished gate must not block the existing app by default');
assert.match(html, /const AUTH_GATE_ENABLED = Boolean\(AUTH_CONFIG\?\.enableGate === true\)/, 'only explicit public config may enable the gate');
assert.match(html, /function setAuthGateActive\(/, 'gate activation must have one explicit accessibility boundary');
assert.match(html, /workspace\.inert = active/, 'the learning workspace must be inert behind an active gate');
assert.match(html, /workspace\.setAttribute\('aria-hidden', String\(active\)\)/, 'the learning workspace must be hidden from assistive technology behind an active gate');
assert.match(html, /id="loginUsername"/, 'the login form needs a username field');
assert.match(html, /id="registerEmail"/, 'registration must collect a recovery email');
assert.match(html, /id="forgotPasswordBtn"/, 'password recovery must be reachable from login');
assert.match(html, /login-landscape\.webp/, 'the supplied landscape must use the optimized WebP background');
assert.match(html, /class="auth-card/, 'the login form needs a dedicated glass card');
assert.match(html, /id="registerForm"/, 'registration must be available without leaving the gate');
assert.match(html, /id="resetForm"/, 'password reset must be available without leaving the gate');
assert.match(html, /@media\(max-width:640px\)[\s\S]*?\.auth-card/, 'the auth card requires a mobile layout');
assert.match(html, /<h1 id="authGateTitle">喜刷刷账号<\/h1>/, 'the gate needs a stable accessible title');
assert.match(html, /\.auth-gate\{[^}]*z-index:3000/s, 'the gate must visually sit above application toasts and dialogs');
assert.doesNotMatch(html, /数据将按账号隔离保存/, 'the static shell must not promise isolation before session wiring exists');

console.log('account auth client contract passed');
