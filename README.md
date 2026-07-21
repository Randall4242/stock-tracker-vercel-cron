# Stock Tracker Vercel Cron Trigger

定时准点触发 GitHub Actions `01-daily-collect` + `02-daily-render`，绕过 GitHub Actions schedule 排队延迟。

## 链路

```
Vercel Cron（准点 ±1min）→ 调 /api/cron-01 → POST GitHub repository_dispatch API
                                              ↓
                                    GitHub Actions 立即跑（不排队）
                                              ↓
                                    01-daily-collect / 02-daily-render 执行
```

## 文件结构

- `vercel.json` — Vercel Cron 配置（每天工作日 16:00 / 16:30 北京触发）
- `api/cron-01.ts` — 触发 01-daily-collect
- `api/cron-02.ts` — 触发 02-daily-render
- `api/test.ts` — 健康检查（GET `/api/test` 验证 Vercel 部署）
- `.env.example` — 环境变量模板

## 部署步骤

### 1. 准备 GitHub 仓

**把这个目录作为新仓推到 GitHub**（用任一新仓，跟 stock-tracker 仓分开）：

```bash
cd vercel-deploy
git init
git add .
git commit -m "vercel cron trigger for stock-tracker"
gh repo create stock-tracker-vercel-cron --public --source=. --push
```

或者直接把 4 个文件（vercel.json + api/ + .env.example）手动建一个 GitHub 仓。

### 2. 准备 GitHub PAT

1. 打开 https://github.com/settings/tokens?type=beta
2. **Generate new token** → 选 **Fine-grained**
3. **Token name**: `vercel-cron-stock-trigger`
4. **Expiration**: 90 天（到期前会提醒你 rotate）
5. **Repository access** → **Only select repositories** → 选 `Randall4242/mavis-output`
6. **Permissions** → **Repository permissions**：
   - **Actions**: Read and write ← 必须
   - **Contents**: Read-only ← 可选（验证用）
7. **Generate token** → 复制 token（只显示一次）

### 3. 准备 CRON_SECRET

任意 32+ 字符的随机字符串：

```bash
openssl rand -hex 32
```

复制输出。

### 4. 在 Vercel 部署

1. 打开 https://vercel.com/dashboard
2. **Add New Project** → **Import** 刚才建的 GitHub 仓
3. **Framework Preset**: Other（保持默认）
4. **Environment Variables**（部署前配置）:
   - `GITHUB_TOKEN` = 第 2 步的 token
   - `CRON_SECRET` = 第 3 步的随机字符串
5. **Deploy**
6. 等 1-2 分钟部署完成

### 5. 改 GitHub Actions yml

**两个文件都要改**（在 GitHub Web UI 上直接编辑）：

- `Randall4242/mavis-output/.github/workflows/01-daily-collect.yml`
- `Randall4242/mavis-output/.github/workflows/02-daily-render.yml`

**每个文件改的位置**都是文件顶部的 `on:` 段，加 3 行：

```yaml
on:
  schedule:
    - cron: '0 8 * * 1-5'      # 保留（兜底）
  workflow_dispatch:           # 保留（手动按钮）
  repository_dispatch:          # ← 新增
    types: [stock-trigger]
```

**Commit 即可**，不动其他部分。

### 6. 测试

#### A. 测 Vercel → GitHub 链路

打开浏览器访问：

```
https://<你的-vercel-domain>.vercel.app/api/cron-01
```

需要带 `Authorization: Bearer <CRON_SECRET>` 头。简单测：浏览器开发者工具 → Network → 用 fetch 测，或者用 curl：

```bash
curl -X POST https://<你的-vercel-domain>.vercel.app/api/cron-01 \
  -H "Authorization: Bearer <你的-CRON-SECRET>"
```

返回 `{"ok":true,"triggered":"01-daily-collect"}` = Vercel → GitHub 链路通。

#### B. 测 GitHub Actions 收到 dispatch

去 https://github.com/Randall4242/mavis-output/actions

应该看到 01-daily-collect 有新 run，触发源是 `repository_dispatch`（不是 schedule）。

#### C. 测 Vercel cron 准点

等下一个工作日 16:00 北京 ± 1 分钟：

- Vercel Dashboard → 项目 → **Logs** → 看 `/api/cron-01` 有调用记录
- GitHub Actions 同上

## 排错

| 现象 | 原因 | 修法 |
|---|---|---|
| 401 unauthorized | CRON_SECRET 不匹配 | 检查 Vercel 环境变量 |
| 500 GITHUB_TOKEN not set | 没配 token | 重新配 Vercel 环境变量 |
| 404 github dispatch failed | token 没 Actions 权限 | 重新生成 PAT，勾 Actions: Read and write |
| 403 github dispatch failed | token 没勾 mavis-output 仓 | 重新生成 PAT，选对仓库 |
| GitHub Actions 没新 run | yml 没加 repository_dispatch | 检查 01/02 yml 顶部 on: 段 |
| 跑成功但 GitHub Actions schedule 还在跳号 | schedule 仍作为兜底存在 | 正常，schedule 还在只是 Vercel 优先 |

## 取消兜底（可选）

如果想完全依赖 Vercel cron，**可以删除 yml 里的 schedule 段**（保留 workflow_dispatch 手动按钮）：

```yaml
on:
  workflow_dispatch:
  repository_dispatch:
    types: [stock-trigger]
```

**但建议先保留 schedule 跑几周**（Vercel cron 万一挂了，schedule 还能兜底），确认稳定后再删除。
