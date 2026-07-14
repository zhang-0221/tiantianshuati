import { kv } from '@vercel/kv';

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
const RATE_LIMIT_SCRIPT = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return count
`;

export function normalizeUsername(value) {
  const username = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return USERNAME_PATTERN.test(username) ? username : null;
}

export function cors(req, allowedOrigin = process.env.ALLOWED_ORIGIN) {
  const origin = req.headers.get('origin');
  const allowed = new Set([allowedOrigin].filter(Boolean));
  if (process.env.NODE_ENV !== 'production') allowed.add('http://localhost:4173');

  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (origin && allowed.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export async function parseJson(req) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export function requireEnv(...names) {
  const config = {};
  for (const name of names) {
    const value = process.env[name];
    if (!value) throw new Error('Authentication service is not configured');
    config[name] = value;
  }
  return config;
}

export function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
}

export async function rateLimit(req, route, limit = 10, windowSeconds = 60) {
  const key = `auth-rate:${route}:${getClientIp(req)}`;
  try {
    const count = await kv.eval(RATE_LIMIT_SCRIPT, [key], [windowSeconds]);
    if (count > limit) return json({ ok: false, code: 'RATE_LIMITED' }, 429, cors(req));
    return null;
  } catch {
    return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503, cors(req));
  }
}
