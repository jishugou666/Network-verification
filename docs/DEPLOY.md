# 卡密验证系统 - 全流程部署指南

## 部署架构

```
本地开发机 → GitHub 仓库 → Render (后端 API) + Vercel (前端管理后台)
                                │
                           TiDB Serverless (数据库)
```

## 前置准备：推送到 GitHub

部署前必须将项目推送到 GitHub 仓库，Render 和 Vercel 都从 GitHub 自动拉取代码。

```bash
cd "c:\Users\Natsume\Desktop\卡密验证"

# 初始化 Git 仓库
git init

# 创建 .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
.next/
EOF

# 提交并推送
git add -A
git commit -m "init: 卡密验证系统 v1.0"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

---

## 第一步：TiDB Serverless 数据库初始化

### 1.1 注册 TiDB Cloud

打开 [https://tidbcloud.com](https://tidbcloud.com)，用 GitHub 账号注册登录。

### 1.2 创建 Serverless 集群

1. 进入控制台，点击 **Create Cluster** → 选择 **Serverless**
2. **Cluster Name**：`card-verify`
3. **Region**：选择 `ap-southeast-1 (Singapore)`（离国内最近，延迟低）
4. 点击 **Create**，等待 1-2 分钟集群创建完成

### 1.3 获取连接字符串

1. 集群创建完成后，点击集群名称进入详情页
2. 左侧菜单点击 **Connect**
3. 选择 **Standard Connection**
4. 在弹出的面板中，**Endpoint** 选择 **Public**
5. 复制连接字符串，格式如下：

```
mysql://用户名:密码@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict
```

### 1.4 创建数据库

点击 TiDB Cloud Console 中的 **SQL Editor**（或使用 Navicat/DBeaver 连接），执行：

```sql
CREATE DATABASE IF NOT EXISTS card_verify;
USE card_verify;
```

### 1.5 配置 IP 白名单

Serverless 集群默认允许所有 IP 连接，无需额外配置。如果后续需要限制，在 **Connect** 面板的 **Allow Access from Anywhere** 中管理。

### 1.6 生成安全的密钥

在本地终端执行以下命令，生成部署所需的随机密钥：

```bash
# JWT 签名密钥（64 字符 hex）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# AES-256-GCM 加密密钥（64 字符 hex）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**记录下生成的密钥，下一步要用。**

---

## 第二步：Render 后端部署

### 2.1 注册 Render

打开 [https://render.com](https://render.com)，用 GitHub 账号注册登录。

### 2.2 创建 Web Service

1. 点击 **New +** → **Web Service**
2. 授权 Render 访问 GitHub，选择你推送的仓库
3. 进入配置页面，按以下设置填写：

| 配置项 | 值 |
|--------|-----|
| **Name** | `card-verify-api`（自定义） |
| **Region** | `Singapore (Southeast Asia)` — 与 TiDB 同区域 |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `npm run render:start` |
| **Instance Type** | `Free` |

### 2.3 添加环境变量

在配置页面的 **Environment Variables** 区域，逐条添加以下变量（**注意：是添加在 Render 的环境变量中，不是 .env 文件**）：

| Key | Value（填写说明） |
|-----|-------------------|
| `DATABASE_URL` | 替换为 TiDB 连接串，数据库名改为 `card_verify`：`mysql://用户名:密码@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/card_verify?sslaccept=strict` |
| `FRONTEND_URL` | 先填 `https://localhost:3000`，Vercel 部署完再回来改成实际地址 |
| `JWT_SECRET` | 粘贴第一步生成的 64 字符 hex |
| `JWT_EXPIRES_IN` | `7d` |
| `AES_ENCRYPTION_KEY` | 粘贴第一步生成的另一个 64 字符 hex |
| `ROOT_USERNAME` | `admin` |
| `ROOT_PASSWORD` | 设置一个强密码，至少 8 位 |
| `ROOT_EMAIL` | `admin@example.com` |
| `SIGNATURE_TIMESTAMP_TOLERANCE` | `30` |
| `NONCE_TTL_SECONDS` | `300` |
| `RATE_LIMIT_PER_MINUTE` | `60` |

### 2.4 部署

1. 点击页面底部的 **Create Web Service**
2. Render 会自动执行：
   - 拉取 GitHub 代码
   - `npm install` 安装依赖
   - `npx prisma generate` 生成 Prisma Client
   - `npm run build` 编译 TypeScript
   - `npm run render:start` 启动服务（自动执行 `prisma db push` 创建表 + `seed` 初始化管理员）
3. 等待 3-5 分钟，日志中出现 `[Server] 卡密验证系统后端已启动` 即部署成功
4. 记录你的后端地址，格式为 `https://card-verify-api.onrender.com`

### 2.5 验证后端

浏览器打开 `https://你的地址.onrender.com/api/health`，应返回：

```json
{"code":0,"message":"ok","data":{"status":"running","timestamp":"..."}}
```

### 2.6 更新 FRONTEND_URL

回到 Render 环境变量设置，将 `FRONTEND_URL` 暂时保持原值，等 Vercel 部署完成后更新（见第四步）。

---

## 第三步：Vercel 前端部署

### 3.1 注册 Vercel

打开 [https://vercel.com](https://vercel.com)，用 GitHub 账号注册登录。

### 3.2 导入项目

1. 点击 **Add New...** → **Project**
2. 选择你的 GitHub 仓库
3. 进入配置页面，按以下设置：

| 配置项 | 值 |
|--------|-----|
| **Framework Preset** | `Next.js` |
| **Root Directory** | `frontend` |
| **Build Command** | 默认（`next build`） |
| **Output Directory** | 默认（`.next`） |

### 3.3 添加环境变量

在 **Environment Variables** 区域添加：

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://card-verify-api.onrender.com/api`（替换为你的 Render 后端地址） |

### 3.4 部署

点击 **Deploy**，等待 1-2 分钟。部署完成后 Vercel 会提供访问地址，格式为 `https://你的项目名.vercel.app`。

### 3.5 验证前端

1. 打开 `https://你的项目名.vercel.app`
2. 使用第一步设置的超级管理员账号登录
3. 登录成功后进入仪表盘，确认数据正常加载

---

## 第四步：打通前后端

### 4.1 更新 Render 的 CORS 白名单

回到 Render Dashboard → 你的 Web Service → **Environment**，找到 `FRONTEND_URL`，将其值改为 Vercel 分配的实际地址：

```
FRONTEND_URL = https://你的项目名.vercel.app
```

修改后 Render 会自动重新部署，等待约 1 分钟生效。

### 4.2 冷启动说明

Render 免费实例在 15 分钟无请求后会进入休眠。首次访问需等待约 30-60 秒冷启动。如需保持活跃，可以用 UptimeRobot 等免费监控服务每 5 分钟 ping 一次 `/api/health`。

---

## 第五步：创建第一个程序并测试

### 5.1 登录后台

用超级管理员账号登录前端。

### 5.2 注册代理账号（可选）

如果不需要代理体系，直接用超级管理员操作。否则注册一个代理账号用于实际运营。

### 5.3 创建程序

1. 进入 **程序管理** → 点击 **创建程序**
2. 填写：
   - **名称**：`我的软件`
   - **标识**：`my-app`（英文唯一标识）
   - **最大设备数**：`3`
   - 其他保持默认
3. 创建成功后，**立即保存弹出的 AppSecret**（仅显示一次）
4. 记录 AppKey 和 AppSecret，后续客户端对接使用

### 5.4 生成卡密

1. 进入 **卡密管理** → 点击 **生成卡密**
2. 选择刚创建的程序、卡密类型、数量
3. 生成后立即保存卡密明文（仅显示一次）

### 5.5 Python 客户端测试

```python
from card_verify_client import CardVerifyClient

client = CardVerifyClient(
    api_base_url='https://card-verify-api.onrender.com',
    app_key='你的AppKey',
    app_secret='你的AppSecret',
)

# 激活卡密
hw = CardVerifyClient.collect_hardware_info()
result = client.activate(
    card_key_plain='生成的卡密明文',
    username='test_user',
    hardware_info=hw,
)
print(f"激活成功: {result}")

# 心跳
hb = client.heartbeat()
print(f"心跳成功: {hb}")

# 登出
client.logout()
```

---

## 环境变量速查表

### Render（后端）— 全部必填

| Key | 示例值 |
|-----|--------|
| `DATABASE_URL` | `mysql://user:pass@gateway01.xxx.tidbcloud.com:4000/card_verify?sslaccept=strict` |
| `FRONTEND_URL` | `https://xxx.vercel.app` |
| `JWT_SECRET` | `a1b2c3...`（64 字符 hex） |
| `JWT_EXPIRES_IN` | `7d` |
| `AES_ENCRYPTION_KEY` | `d4e5f6...`（64 字符 hex） |
| `ROOT_USERNAME` | `admin` |
| `ROOT_PASSWORD` | 强密码 |
| `ROOT_EMAIL` | `admin@example.com` |
| `SIGNATURE_TIMESTAMP_TOLERANCE` | `30` |
| `NONCE_TTL_SECONDS` | `300` |
| `RATE_LIMIT_PER_MINUTE` | `60` |

### Vercel（前端）— 仅一条

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://card-verify-api.onrender.com/api` |

---

## 常见问题排查

### Render 部署失败

1. **`prisma db push` 报错**：检查 `DATABASE_URL` 是否正确，TiDB 集群是否在运行状态
2. **`tsx` 找不到**：确认 `prisma` 和 `tsx` 在 `dependencies` 而非 `devDependencies`（已修复）
3. **端口绑定失败**：Render 会注入 `PORT` 环境变量，代码已适配

### Vercel 前端无法连接后端

1. 检查 `NEXT_PUBLIC_API_URL` 是否正确
2. 检查 Render 的 `FRONTEND_URL` 是否已更新为 Vercel 地址
3. 浏览器 F12 打开 Network，查看具体请求报错

### TiDB 连接超时

1. TiDB Serverless 免费版有连接数限制，确保 Prisma 连接池未超出
2. 检查 Render 所在区域是否与 TiDB 区域一致

### 冷启动慢

Render 免费版休眠后首次唤醒需要 30-60 秒。生产环境建议升级到 Starter 计划（$7/月），或使用 UptimeRobot 保持活跃。