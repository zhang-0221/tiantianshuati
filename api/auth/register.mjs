import { createClient } from '@supabase/supabase-js';
import { cors, json, normalizeUsername, parseJson, rateLimit, requireEnv } from './_shared.mjs';

export const config = { runtime: 'edge' };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405, cors(req));

  const limited = await rateLimit(req, 'register', 5, 60);
  if (limited) return limited;

  try {
    const env = requireEnv('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SITE_URL', 'ALLOWED_ORIGIN');
    const body = await parseJson(req);
    const username = normalizeUsername(body?.username);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!username || !EMAIL_PATTERN.test(email) || password.length < 8) {
      return json({ ok: false, code: 'INVALID_INPUT' }, 400, cors(req, env.ALLOWED_ORIGIN));
    }

    const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const existing = await service.from('profiles').select('id').eq('username', username).maybeSingle();
    if (existing.error) return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503, cors(req, env.ALLOWED_ORIGIN));
    if (existing.data) return json({ ok: false, code: 'USERNAME_TAKEN' }, 409, cors(req, env.ALLOWED_ORIGIN));

    const anonymous = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const signup = await anonymous.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${env.SITE_URL}?verified=1`,
      },
    });
    if (signup.error) {
      // A concurrent registration can make the auth trigger reject this insert.
      const collision = await service.from('profiles').select('id').eq('username', username).maybeSingle();
      if (collision.data) return json({ ok: false, code: 'USERNAME_TAKEN' }, 409, cors(req, env.ALLOWED_ORIGIN));
      return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503, cors(req, env.ALLOWED_ORIGIN));
    }

    // Supabase deliberately obscures an already-registered email during sign-up.
    if (!signup.data.user || signup.data.user.identities?.length === 0) {
      return json({ ok: true, needsVerification: true }, 200, cors(req, env.ALLOWED_ORIGIN));
    }

    return json({ ok: true, needsVerification: true }, 201, cors(req, env.ALLOWED_ORIGIN));
  } catch {
    return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503, cors(req));
  }
}
