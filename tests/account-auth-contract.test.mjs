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

assert.match(html, /const LS_AUTH_SESSION = 'ttsk_auth_session'/, 'authenticated sessions need a dedicated local storage key');
assert.match(html, /cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.57\.0/, 'the browser client must pin the Supabase CDN version');
for (const fn of ['submitRegistration', 'submitLogin', 'submitPasswordReset', 'restoreSession', 'signOutAccount', 'apiFetch']) {
  assert.match(html, new RegExp(`(?:async )?function ${fn}\\(`), `missing browser auth function: ${fn}`);
}
assert.match(html, /auth\.setSession\(/, 'stored sessions must be restored through Supabase');
assert.match(html, /auth\.getUser\(/, 'restored sessions must verify the current user');
assert.match(html, /auth\.signOut\(/, 'logout must invalidate the Supabase session');
assert.match(html, /auth\.onAuthStateChange\(/, 'token refreshes must keep the local session current');
assert.match(html, /access_token/, 'the session contract must use access tokens, never passwords');
assert.match(html, /localStorage\.removeItem\(LS_AUTH_SESSION\)/, 'logout must clear the locally stored session');
assert.doesNotMatch(html, /localStorage\.setItem\([^\n]*password/i, 'passwords must never be written to local storage');
assert.match(html, /id="accountMenu"[^>]*hidden/, 'the sidebar account menu must remain hidden until authentication succeeds');
assert.match(html, /id="accountUsername"/, 'the account menu must show a username without exposing email');
assert.match(html, /onclick="signOutAccount\(\)"/, 'the authenticated sidebar must provide a logout action');
assert.match(html, /if \(!client\) \{\s*setAuthGateActive\(AUTH_GATE_ENABLED\);\s*setAuthStatus\(/, 'a configured gate must fail closed when the auth runtime is unavailable');
assert.doesNotMatch(html, /function initializeAuth\(\)[\s\S]*?if \(!client\) \{ setAuthGateActive\(false\)/, 'a configured gate must never unlock because the client is missing');
assert.doesNotMatch(html, /onAuthStateChange\([\s\S]*?SIGNED_IN[\s\S]*?applyAuthenticatedSession/, 'an unverified SIGNED_IN event must not unlock the workspace');
assert.match(html, /if \(active\) \{[\s\S]*?requestAnimationFrame\([\s\S]*?firstAction\?\.focus\(\)/, 'opening the gate must focus its first actionable control');

console.log('account auth client contract passed');
