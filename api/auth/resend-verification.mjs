import { createClient } from '@supabase/supabase-js';
import { cors, json, normalizeUsername, parseJson, rateLimit, requireEnv } from './_shared.mjs';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405, cors(req));

  const limited = await rateLimit(req, 'resend-verification', 3, 300);
  if (limited) return limited;

  try {
    const env = requireEnv('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SITE_URL', 'ALLOWED_ORIGIN');
    const body = await parseJson(req);
    const username = normalizeUsername(body?.username);
    if (username) {
      const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const profile = await service.from('profiles').select('email').eq('username', username).maybeSingle();
      if (profile.data?.email) {
        const anonymous = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        await anonymous.auth.resend({
          type: 'signup',
          email: profile.data.email,
          options: { emailRedirectTo: `${env.SITE_URL}?verified=1` },
        });
      }
    }
  } catch {}

  // Always acknowledge so this endpoint cannot reveal whether a username exists.
  return json({ ok: true }, 200, cors(req));
}
