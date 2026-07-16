import { Request } from 'express';

/**
 * 获取客户端真实 IP（多方案兜底）
 *
 * 优先级：
 * 1. X-Forwarded-For（取第一个，最靠近客户端）
 * 2. X-Real-IP（Nginx 等反向代理常用）
 * 3. CF-Connecting-IP（Cloudflare）
 * 4. req.ip（Express trust proxy 启用后自动解析）
 * 5. req.socket.remoteAddress（直连）
 * 6. req.connection.remoteAddress（旧版 Node.js）
 */
export function getClientIp(req: Request): string {
  // 1. X-Forwarded-For: "client, proxy1, proxy2"
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const xffStr = Array.isArray(xff) ? xff[0] : xff;
    const ip = xffStr.split(',')[0]?.trim();
    if (ip && ip !== '::1' && ip !== '127.0.0.1') return ip;
  }

  // 2. X-Real-IP
  const xri = req.headers['x-real-ip'] as string;
  if (xri && xri !== '::1' && xri !== '127.0.0.1') return xri;

  // 3. CF-Connecting-IP
  const cf = req.headers['cf-connecting-ip'] as string;
  if (cf && cf !== '::1' && cf !== '127.0.0.1') return cf;

  // 4. req.ip（trust proxy 启用后有效）
  const rIp = req.ip;
  if (rIp && rIp !== '::1' && rIp !== '127.0.0.1') {
    // 去掉 IPv6 前缀 "::ffff:"
    return rIp.replace(/^::ffff:/, '');
  }

  // 5. req.socket.remoteAddress
  const sIp = req.socket?.remoteAddress;
  if (sIp && sIp !== '::1' && sIp !== '127.0.0.1') {
    return sIp.replace(/^::ffff:/, '');
  }

  // 6. req.connection.remoteAddress（旧版）
  const cIp = (req as any).connection?.remoteAddress;
  if (cIp && cIp !== '::1' && cIp !== '127.0.0.1') {
    return cIp.replace(/^::ffff:/, '');
  }

  return 'unknown';
}