/**
 * 喜刷刷 - 云端同步 API
 * POST /api/sync  → 上传题库，返回6位同步码
 * GET  /api/sync?code=XXXXXX → 下载题库
 *
 * 依赖 Vercel KV，数据7天自动过期。
 * 初次使用需要在 Vercel 控制台创建 KV 数据库并绑定到此项目。
 */

export const config = { runtime: 'edge' };

// 生成6位大写字母数字同步码
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆字符 0/O/1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  // GET: 根据同步码拉取数据
  if (req.method === 'GET') {
    if (!code) {
      return new Response(JSON.stringify({ ok: false, message: '缺少同步码参数 ?code=XXXXXX' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    try {
      const kv = await import('@vercel/kv');
      const data = await kv.get('sync_' + code.toUpperCase());
      if (!data) {
        return new Response(JSON.stringify({ ok: false, message: '同步码无效或已过期（7天后自动失效）' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, message: '服务未配置 Vercel KV。请在 Vercel 控制台创建 KV 数据库并绑定到项目。' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // POST: 上传题库数据，生成同步码
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (!body || !Array.isArray(body)) {
        return new Response(JSON.stringify({ ok: false, message: '数据格式错误，需要题库数组' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (body.length === 0) {
        return new Response(JSON.stringify({ ok: false, message: '题库为空，无需同步' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // 限制大小（约2MB）
      const json = JSON.stringify(body);
      if (json.length > 2 * 1024 * 1024) {
        return new Response(JSON.stringify({ ok: false, message: '数据过大，请先清理题库再同步（最大2MB）' }), {
          status: 413,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const kv = await import('@vercel/kv');
      let code;
      // 最多重试5次，避免同步码冲突
      for (let i = 0; i < 5; i++) {
        code = generateCode();
        const exists = await kv.get('sync_' + code);
        if (!exists) break;
        if (i >= 4) {
          return new Response(JSON.stringify({ ok: false, message: '生成同步码失败，请重试' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
      // 存储7天
      await kv.set('sync_' + code, body, { ex: 7 * 24 * 3600 });
      return new Response(JSON.stringify({ ok: true, code }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, message: '服务未配置 Vercel KV。请在 Vercel 控制台创建 KV 数据库并绑定到项目。' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // OPTIONS: CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  return new Response(JSON.stringify({ ok: false, message: '不支持的方法' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}
