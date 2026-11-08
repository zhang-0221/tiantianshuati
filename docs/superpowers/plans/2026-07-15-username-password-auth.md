# Username Password Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public email-and-OTP signup flow with direct username-and-password accounts while preserving per-user cloud data and existing logins.

**Architecture:** The browser submits only a normalized username and password to Vercel. The registration route derives a reserved internal email identifier, uses Supabase's server-only admin API to create an already-confirmed user, then obtains a normal user session with the existing anonymous client; the browser stores only that session. Existing profiles retain their stored email and use the unchanged username lookup login route.

**Tech Stack:** Static HTML/CSS/JavaScript, Vercel Edge Functions, Supabase Auth JS v2, Node built-in test runner.

---

### Task 1: Lock the direct-account contract with failing tests

**Files:**
- Modify: `tests/account-auth-contract.test.mjs`
- Modify: `tests/auth-api-contract.test.mjs`

- [ ] **Step 1: Replace public-email assertions with direct-account assertions**

In `tests/account-auth-contract.test.mjs`, replace assertions for `registerEmail`, `verificationForm`, `resetForm`, resend controls, and OTP handlers with:

```js
assert.doesNotMatch(html, /id="registerEmail"/);
assert.doesNotMatch(html, /id="verificationForm"/);
assert.doesNotMatch(html, /id="resetForm"/);
assert.doesNotMatch(html, /resend-verification/);
assert.match(html, /apiFetch\('\\/api\\/auth\\/register', \{ username, password \}\)/);
assert.match(html, /!data\?\.session\?\.access_token/);
assert.match(html, /applyAuthenticatedSession\(restored\.data\.session, userResult\.data\.user, username\)/);
```

In `tests/auth-api-contract.test.mjs`, test only `register` and `login` routes for shared route safety, then assert:

```js
const register = read('api/auth/register.mjs');
assert.match(register, /internalEmailForUsername\(username\)/);
assert.match(register, /service\.auth\.admin\.createUser\(/);
assert.match(register, /email_confirm:\s*true/);
assert.match(register, /anonymous\.auth\.signInWithPassword/);
assert.doesNotMatch(register, /auth\.signUp\(/);
```

- [ ] **Step 2: Run the targeted tests and verify RED**

Run: `node --test tests/account-auth-contract.test.mjs tests/auth-api-contract.test.mjs`

Expected: FAIL because the existing UI still has email/OTP/reset elements and registration still calls `auth.signUp`.

- [ ] **Step 3: Commit the failing contract tests**

```powershell
git add tests/account-auth-contract.test.mjs tests/auth-api-contract.test.mjs
git commit -m "test: define username password auth contract"
```

### Task 2: Create confirmed internal identities at registration

**Files:**
- Modify: `api/auth/_shared.mjs`
- Modify: `api/auth/register.mjs`
- Test: `tests/auth-api-contract.test.mjs`

- [ ] **Step 1: Add the internal identifier helper**

Add immediately after `normalizeUsername` in `api/auth/_shared.mjs`:

```js
export function internalEmailForUsername(username) {
  return `${username}@users.tiantianshuati.invalid`;
}
```

- [ ] **Step 2: Replace public signup with an admin-confirmed user**

In `api/auth/register.mjs`, import `internalEmailForUsername`. Read only `username` and `password`; reject an invalid username or a password shorter than eight characters. Keep the existing profile collision check. Replace the anonymous `auth.signUp` call with:

```js
const email = internalEmailForUsername(username);
const created = await service.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { username },
});
if (created.error || !created.data.user) {
  const collision = await service.from('profiles').select('id').eq('username', username).maybeSingle();
  if (collision.data) return json({ ok: false, code: 'USERNAME_TAKEN' }, 409, cors(req, env.ALLOWED_ORIGIN));
  return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503, cors(req, env.ALLOWED_ORIGIN));
}
const signedIn = await anonymous.auth.signInWithPassword({ email, password });
if (signedIn.error || !signedIn.data.session) {
  return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503, cors(req, env.ALLOWED_ORIGIN));
}
return json({ ok: true, session: signedIn.data.session }, 201, cors(req, env.ALLOWED_ORIGIN));
```

- [ ] **Step 3: Run the API contract test and verify GREEN**

Run: `node --test tests/auth-api-contract.test.mjs`

Expected: PASS.

- [ ] **Step 4: Commit the server registration change**

```powershell
git add api/auth/_shared.mjs api/auth/register.mjs tests/auth-api-contract.test.mjs
git commit -m "feat: create direct username password accounts"
```

### Task 3: Simplify the browser account gate

**Files:**
- Modify: `index.html`
- Test: `tests/account-auth-contract.test.mjs`

- [ ] **Step 1: Remove email-only forms and controls**

Delete the email field from `registerForm`, `verificationForm`, `resetForm`, `completeResetForm`, resend controls, and the login “forgot password” link. Change the form map to:

```js
const forms = { login: 'loginForm', register: 'registerForm' };
```

Delete `submitEmailVerification`, `resendPendingVerification`, `submitPasswordReset`, `resendVerification`, `submitNewPassword`, and password-recovery redirect handling. Remove `EMAIL_UNVERIFIED` from auth failure handling.

- [ ] **Step 2: Restore the returned session after registration**

Replace `submitRegistration` with a username/password-only request and the existing session restoration pattern:

```js
const { response, data } = await apiFetch('/api/auth/register', { username, password });
if (!response.ok || !data?.session?.access_token) {
  showAuthFailure(data?.code);
  return false;
}
const client = getAuthClient();
if (!client) {
  setAuthStatus('账号服务配置不完整，请联系管理员。');
  return false;
}
const restored = await client.auth.setSession({
  access_token: data.session.access_token,
  refresh_token: data.session.refresh_token,
});
const userResult = await client.auth.getUser();
if (restored.error || !restored.data.session || userResult.error || !userResult.data.user) {
  setAuthStatus('账号创建成功，但登录会话创建失败，请使用用户名和密码重新登录。');
  return false;
}
applyAuthenticatedSession(restored.data.session, userResult.data.user, username);
```

Update registration copy to state that data follows the account and that there is no self-service password recovery.

- [ ] **Step 3: Run the browser contract test and verify GREEN**

Run: `node --test tests/account-auth-contract.test.mjs`

Expected: PASS.

- [ ] **Step 4: Commit the browser flow**

```powershell
git add index.html tests/account-auth-contract.test.mjs
git commit -m "feat: simplify account gate to username password"
```

### Task 4: Remove email dependencies and validate the release

**Files:**
- Delete: `api/auth/password-reset.mjs`
- Delete: `api/auth/resend-verification.mjs`
- Modify: `tests/auth-api-contract.test.mjs`
- Modify: `docs/ACCOUNT_SETUP.md`

- [ ] **Step 1: Add failing assertions for absent email routes**

Import `fs` in `tests/auth-api-contract.test.mjs` and add:

```js
assert.equal(fs.existsSync(new URL('../api/auth/password-reset.mjs', import.meta.url)), false);
assert.equal(fs.existsSync(new URL('../api/auth/resend-verification.mjs', import.meta.url)), false);
```

- [ ] **Step 2: Run the API test and verify RED**

Run: `node --test tests/auth-api-contract.test.mjs`

Expected: FAIL because both email-specific endpoints still exist.

- [ ] **Step 3: Delete routes and update setup documentation**

Delete the two email-only endpoint files. In `docs/ACCOUNT_SETUP.md`, replace SMTP/template/OTP/reset steps with: registration creates confirmed internal identities, the deployed UI does not collect email, and no SMTP configuration is required for registration.

- [ ] **Step 4: Run full validation**

Run:

```powershell
npm test
git diff --check
git status --short
```

Expected: all tests pass, diff check has no output, and only direct-account task files are staged.

- [ ] **Step 5: Commit cleanup**

```powershell
git add api/auth/password-reset.mjs api/auth/resend-verification.mjs docs/ACCOUNT_SETUP.md tests/auth-api-contract.test.mjs
git commit -m "chore: remove email auth dependencies"
```

### Task 5: Preserve access for previously unverified accounts

**Files:**
- Modify: `api/auth/login.mjs`
- Modify: `tests/auth-api-contract.test.mjs`

- [ ] **Step 1: Write a failing legacy-login contract**

Require the login route to select `id, email`, call `service.auth.admin.updateUserById(profile.data.id, { email_confirm: true })` only after Supabase reports an unconfirmed-email error, and retry password login.

- [ ] **Step 2: Verify RED, implement, and verify GREEN**

Run `node --test tests/auth-api-contract.test.mjs` before the route change and confirm the missing legacy handling fails. Add the minimum confirmation-and-retry branch, then run `npm test` and require all tests to pass.

