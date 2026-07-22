// 简化版: 不用 @vercel/node types, 避免 Node 24 runtime type 错
// 用 any 代替 VercelRequest/VercelResponse, 失去 IDE 提示但功能不变

export default async function handler(req: any, res: any) {
  const time = new Date().toISOString();
  const path = req.query?.path || '/';

  return res.status(200).json({
    ok: true,
    serverTime: time,
    beijingTime: new Date(time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    path,
    vercelRegion: process.env.VERCEL_REGION || 'unknown',
    message: 'Vercel cron trigger is healthy. Use /api/cron-01 or /api/cron-02 to trigger GitHub Actions.',
  });
}

