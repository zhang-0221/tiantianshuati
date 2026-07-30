import { createClient } from '@supabase/supabase-js';
import { cors, json, normalizeUsername, parseJson, rateLimit, requireEnv } from './_shared.mjs';

export const config = { runtime: 'edge' };

function isEmailUnverifiedError(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code === 'email_not_confirmed' || /email[\s_-]*(is[\s_-]*)?not[\s_-]*confirmed/.test(message);
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405, cors(req));

  const limited = await rateLimit(req, 'login', 10, 60);
  if (limited) return limited;

  try {
    const env = requireEnv('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SITE_URL', 'ALLOWED_ORIGIN');
    const body = await parseJson(req);
    const username = normalizeUsername(body?.username);
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!username || !password) return json({ ok: false, code: 'INVALID_CREDENTIALS' }, 401, cors(req, env.ALLOWED_ORIGIN));

    const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const profile = await service.from('profiles').select('id, email').eq('username', username).maybeSingle();
    if (profile.error) return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503, cors(req, env.ALLOWED_ORIGIN));
    if (!profile.data?.email) return json({ ok: false, code: 'INVALID_CREDENTIALS' }, 401, cors(req, env.ALLOWED_ORIGIN));

    const anonymous = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    let signedIn = await anonymous.auth.signInWithPassword({ email: profile.data.email, password });
    if (signedIn.error || !signedIn.data.session) {
      if (isEmailUnverifiedError(signedIn.error)) {
        const confirmed = await service.auth.admin.updateUserById(profile.data.id, { email_confirm: true });
        if (!confirmed.error) {
          signedIn = await anonymous.auth.signInWithPassword({ email: profile.data.email, password });
        }
      }
      if (signedIn.error || !signedIn.data.session) {
        return json({ ok: false, code: 'INVALID_CREDENTIALS' }, 401, cors(req, env.ALLOWED_ORIGIN));
      }
    }
    const { access_token, refresh_token, expires_in, token_type } = signedIn.data.session;
    return json({ ok: true, session: { access_token, refresh_token, expires_in, token_type } }, 200, cors(req, env.ALLOWED_ORIGIN));
  } catch {
    return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503, cors(req));
  }
}
