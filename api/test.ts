import type { VercelRequest, VercelResponse } from '@vercel/node';
import { execSync } from 'child_process';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const time = new Date().toISOString();
  const path = req.query.path || '/';

  // 健康检查：返回服务器时间 + 当前 UTC + 触发时间
  return res.status(200).json({
    ok: true,
    serverTime: time,
    utc: new Date().toISOString(),
    beijingTime: new Date(time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    path,
    vercelRegion: process.env.VERCEL_REGION || 'unknown',
    message: 'Vercel cron trigger is healthy. Use /api/cron-01 or /api/cron-02 to trigger GitHub Actions.',
  });
}
