import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { ErrorCode } from '../types';
import { fail } from '../utils/response';
import { hmacVerify, aesDecrypt } from '../utils/crypto';

const prisma = new PrismaClient();

// ==================== 客户端 API 签名校验中间件 ====================
// 适用于客户端验证接口（/api/client/*）
// 校验流程：
// 1. 提取 timestamp、nonce、signature 参数
// 2. 校验 timestamp 与服务器时间差是否 <= 30 秒
// 3. 校验 nonce 是否在 5 分钟内重复使用
// 4. 根据 AppKey 查找对应程序，获取 AppSecret
// 5. 使用 HMAC-SHA256(timestamp + nonce + body, appSecret) 校验签名
// 6. 签名通过后，将 nonce 存入数据库

export async function signatureMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { timestamp, nonce, signature, appKey } = req.body;

  // 参数完整性检查
  if (!timestamp || !nonce || !signature || !appKey) {
    fail(res, ErrorCode.BAD_REQUEST, '缺少签名参数：timestamp, nonce, signature, appKey', 400);
    return;
  }

  // 校验 timestamp 格式
  const ts = Number(timestamp);
  if (isNaN(ts)) {
    fail(res, ErrorCode.BAD_REQUEST, 'timestamp 格式无效', 400);
    return;
  }

  // 时间戳偏差校验：与服务器时间差超过 30 秒直接拒绝
  const nowTs = Date.now();
  const diff = Math.abs(nowTs - ts);
  if (diff > config.signatureTimestampTolerance * 1000) {
    fail(res, ErrorCode.TIMESTAMP_EXPIRED, `时间戳偏差超过 ${config.signatureTimestampTolerance} 秒`, 400);
    return;
  }

  // 查找程序获取 AppSecret
  const program = await prisma.program.findUnique({
    where: { appKey },
  });
  if (!program) {
    fail(res, ErrorCode.NOT_FOUND, 'AppKey 无效', 404);
    return;
  }

  // 程序状态检查：停用则拒绝所有请求
  if (program.status === 'disabled') {
    fail(res, ErrorCode.PROGRAM_DISABLED, '程序已停用', 403);
    return;
  }

  // 解密 AppSecret
  let appSecret: string;
  try {
    appSecret = aesDecrypt(program.appSecretEncrypted);
  } catch {
    fail(res, ErrorCode.INTERNAL_ERROR, '密钥解密失败', 500);
    return;
  }

  // 构建签名原文：timestamp + nonce + 请求体 JSON（排除 signature 字段）
  const bodyForSign = { ...req.body };
  delete bodyForSign.signature;
  const bodyStr = JSON.stringify(bodyForSign);
  const signData = timestamp + nonce + bodyStr;

  // HMAC-SHA256 签名校验
  if (!hmacVerify(signData, signature, appSecret)) {
    fail(res, ErrorCode.INVALID_SIGNATURE, '签名校验失败', 401);
    return;
  }

  // 签名通过后原子写入 nonce。数据库唯一约束消除“先查询再写入”的并发重放窗口。
  try {
    await prisma.nonce.create({ data: { appKey, nonce } });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      fail(res, ErrorCode.NONCE_REUSED, '请求已过期或重复', 400);
      return;
    }
    throw e;
  }

  // 将 program 信息注入请求，后续路由使用
  (req as any).program = program;

  next();
}

// ==================== 定期清理过期 Nonce ====================
// 清理超过 5 分钟的 nonce 记录，避免数据库膨胀
// 在每次签名校验时附带清理（概率性清理，避免每次请求都执行）

let lastCleanup = 0;
const CLEANUP_INTERVAL = 60000; // 每分钟最多清理一次

export async function cleanupExpiredNonces(): Promise<void> {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  try {
    const cutoff = new Date(now - config.nonceTtlSeconds * 1000);
    await Promise.all([
      prisma.nonce.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      prisma.challenge.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    ]);
  } catch {
    // 清理失败不影响主流程
  }
}
