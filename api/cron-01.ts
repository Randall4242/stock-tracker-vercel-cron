import type { VercelRequest, VercelResponse } from '@vercel/node';

const REPO = 'Randall4242/mavis-output';
const EVENT_TYPE = 'stock-trigger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 简单鉴权：Vercel cron 触发会带特殊的 header，但我们这里只用环境变量防护
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    // 首次部署可以先注释掉这行测试，确认能跑再打开
    return res.status(401).json({ error: 'unauthorized' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not set' });
  }

  const r = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'vercel-cron-trigger',
    },
    body: JSON.stringify({ event_type: EVENT_TYPE }),
  });

  if (!r.ok) {
    const text = await r.text();
    return res.status(r.status).json({ error: 'github dispatch failed', detail: text });
  }

  return res.status(200).json({
    ok: true,
    triggered: '01-daily-collect',
    at: new Date().toISOString(),
  });
}
