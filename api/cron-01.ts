// 简化版: 不用 @vercel/node types, 避免 Node 24 runtime type 错

const REPO = 'Randall4242/mavis-output';
const EVENT_TYPE = 'stock-trigger';

function isAuthorized(req: any): boolean {
  // 1. Vercel Cron 触发（系统调用，带特定 User-Agent）
  const ua = req.headers?.['user-agent'] || '';
  if (typeof ua === 'string' && ua.includes('Vercel-Cron')) return true;

  // 2. 外部调用带正确的 CRON_SECRET
  const auth = req.headers?.authorization;
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true;

  return false;
}

export default async function handler(req: any, res: any) {
  if (!isAuthorized(req)) {
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

