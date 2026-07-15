import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { ErrorCode } from '../types';
import { fail } from '../utils/response';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ==================== 基于 IP + AppKey 双维度限流 ====================
// 单 AppKey 每分钟最多 N 次请求
// 使用 TiDB 存储计数，适配 Serverless 无状态环境
// 不使用内存缓存，确保多实例部署时一致性

interface RateLimitRecord {
  count: number;
  windowStart: Date;
}

// 内存缓存限流计数（Serverless 冷启动可接受短暂不一致）
// 同时写入数据库作为持久化保障
const memCache = new Map<string, RateLimitRecord>();

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const appKey = req.body?.appKey || req.headers['x-app-key'] as string;
  if (!appKey) {
    // 如果没有 appKey，使用 IP 限流
    const ip = getClientIp(req);
    const key = `ip:${ip}`;
    if (checkMemLimit(key)) {
      fail(res, ErrorCode.TOO_MANY_REQUESTS, '请求过于频繁，请稍后重试', 429);
      return;
    }
    next();
    return;
  }

  const ip = getClientIp(req);
  // 程序与来源 IP 双维度计数，避免一个来源耗尽全部正常用户的额度。
  const key = `app:${appKey}:ip:${ip}`;
  if (checkMemLimit(key)) {
    fail(res, ErrorCode.TOO_MANY_REQUESTS, `请求频率超过限制（${config.rateLimitPerMinute}次/分钟）`, 429);
    return;
  }

  // 持久化限流记录到数据库
  try {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    // 清理过期记录
    await prisma.$executeRawUnsafe(
      `DELETE FROM \`Nonce\` WHERE \`appKey\` = ? AND \`createdAt\` < ?`,
      getPersistentRateLimitKey(appKey, ip),
      oneMinuteAgo,
    ).catch(() => {});

    // 插入当前请求记录
    await prisma.nonce.create({
      data: {
        appKey: getPersistentRateLimitKey(appKey, ip),
        nonce: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      },
    }).catch(() => {});

    // 检查当前窗口内请求数
    const count = await prisma.nonce.count({
      where: {
        appKey: getPersistentRateLimitKey(appKey, ip),
        createdAt: { gte: oneMinuteAgo },
      },
    });

    if (count > config.rateLimitPerMinute) {
      fail(res, ErrorCode.TOO_MANY_REQUESTS, `请求频率超过限制（${config.rateLimitPerMinute}次/分钟）`, 429);
      return;
    }
  } catch {
    // 数据库限流失败时，仅依赖内存限流
  }

  next();
}

/** 内存限流检查 */
function checkMemLimit(key: string): boolean {
  const now = Date.now();
  const record = memCache.get(key);
  if (!record || now - record.windowStart.getTime() > 60000) {
    memCache.set(key, { count: 1, windowStart: new Date(now) });
    return false;
  }
  record.count++;
  return record.count > config.rateLimitPerMinute;
}

/** 获取客户端真实 IP */
function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.headers['x-real-ip'] as string
    || req.socket.remoteAddress
    || '127.0.0.1';
}

// Nonce.appKey 最多 64 字符；用固定长度散列保存限流维度，避免泄漏或截断 IP。
function getPersistentRateLimitKey(appKey: string, ip: string): string {
  return crypto.createHash('sha256').update(`rate:${appKey}:${ip}`).digest('hex');
}
