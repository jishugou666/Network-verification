import express from 'express';
import cors from 'cors';
import { config, validateProductionConfig } from './config';
import authRoutes from './routes/auth';
import programRoutes from './routes/program';
import cardRoutes from './routes/card';
import verifyRoutes from './routes/verify';
import userRoutes from './routes/user';

validateProductionConfig();
const app = express();

// 信任反向代理（Render 等云平台必须设置，否则 X-Forwarded-For 不生效）
app.set('trust proxy', true);

// ==================== 全局中间件 ====================

// CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Key'],
}));

// JSON 解析
app.use(express.json({ limit: '1mb' }));

// 强制 HTTPS（生产环境通过 Render 反向代理处理）

// 健康检查（冷启动友好，无需数据库连接）
app.get('/api/health', (_req, res) => {
  res.json({ code: 0, message: 'ok', data: { status: 'running', timestamp: new Date().toISOString() } });
});

// ==================== 路由注册 ====================

// 认证路由
app.use('/api/auth', authRoutes);

// 程序管理路由
app.use('/api/programs', programRoutes);

// 卡密管理路由
app.use('/api/cards', cardRoutes);

// 客户端验证 API（签名校验 + 限流）
app.use('/api/client', verifyRoutes);

// 用户管理 + 仪表盘 + 代理管理
app.use('/api', userRoutes);

// IP 地理位置查询（代理到 ip-api.com，免费且对中国 IP 精确度更高）
app.post('/api/geoip', async (req, res) => {
  try {
    const { ips } = req.body;
    if (!Array.isArray(ips) || ips.length === 0) {
      res.json({ code: 400, message: '请提供 IP 列表', data: null });
      return;
    }
    const results = await Promise.all(
      ips.map(async (ip: string) => {
        try {
          const resp = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=country,countryCode,regionName,city,lat,lon,query&lang=zh-CN`);
          const data = await resp.json();
          return {
            ip: data.query || ip,
            country: data.country || '-',
            countryCode: data.countryCode || '-',
            region: data.regionName || '-',
            city: data.city || '-',
            lat: data.lat || 0,
            lon: data.lon || 0,
          };
        } catch {
          return { ip, country: '-', countryCode: '-', region: '-', city: '-', lat: 0, lon: 0 };
        }
      })
    );
    res.json({ code: 0, message: 'ok', data: results });
  } catch (e: any) {
    console.error('[geoip]', e.message);
    res.status(500).json({ code: 500, message: '服务器错误', data: null });
  }
});

// ==================== 全局错误处理 ====================
// 禁止暴露服务端堆栈
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    data: null,
  });
});

// 404 处理
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', data: null });
});

// ==================== 启动服务 ====================
// 冷启动友好：不预加载大量数据，按需连接数据库
app.listen(config.port, () => {
  console.log(`[Server] 卡密验证系统后端已启动，端口: ${config.port}`);
  console.log(`[Server] 环境: ${config.isProduction ? 'production' : 'development'}`);
  console.log(`[Server] 前端地址: ${config.frontendUrl}`);
});

export default app;
