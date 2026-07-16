import { Router, Request, Response } from 'express';
import { signatureMiddleware, cleanupExpiredNonces } from '../middleware/signature';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import * as verifyService from '../services/verify';
import { success, fail, serverError } from '../utils/response';
import { getClientIp } from '../utils/network';
import { ErrorCode } from '../types';

const router = Router();

// 所有客户端 API 使用签名校验 + 限流
router.use(rateLimitMiddleware);

// ==================== 获取挑战 ====================
// POST /api/client/challenge
// Body: { appKey, timestamp, nonce, signature }
// 注意：获取挑战接口也需要签名，防止恶意请求
router.post('/challenge', signatureMiddleware, async (req: Request, res: Response) => {
  try {
    const { appKey } = req.body;
    const result = await verifyService.getChallenge(appKey);
    await cleanupExpiredNonces();
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message);
    }
  } catch (e) {
    serverError(res);
  }
});

// ==================== 卡密激活 ====================
// POST /api/client/activate
// Body: { appKey, cardKey, username, hardwareInfo, challengeResponse, timestamp, nonce, signature }
router.post('/activate', signatureMiddleware, async (req: Request, res: Response) => {
  try {
    const { appKey, cardKey, username, hardwareInfo, challengeResponse } = req.body;
    if (!cardKey || !username || !hardwareInfo || !challengeResponse) {
      fail(res, ErrorCode.BAD_REQUEST, '缺少必要参数');
      return;
    }
    const ip = getClientIp(req);
    const result = await verifyService.activateCard(appKey, cardKey, username, hardwareInfo, challengeResponse, ip);
    await cleanupExpiredNonces();
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message);
    }
  } catch (e) {
    serverError(res);
  }
});

// ==================== 心跳验证 ====================
// POST /api/client/heartbeat
// Body: { appKey, userId, heartbeatToken, timestamp, nonce, signature }
router.post('/heartbeat', signatureMiddleware, async (req: Request, res: Response) => {
  try {
    const { appKey, userId, heartbeatToken } = req.body;
    if (!userId || !heartbeatToken) {
      fail(res, ErrorCode.BAD_REQUEST, '缺少必要参数');
      return;
    }
    const ip = getClientIp(req);
    const result = await verifyService.heartbeat(appKey, userId, heartbeatToken, ip);
    await cleanupExpiredNonces();
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message);
    }
  } catch (e) {
    serverError(res);
  }
});

// ==================== 脚本下发 ====================
// POST /api/client/script
// Body: { appKey, userId, heartbeatToken, timestamp, nonce, signature }
// 三次加密保障：DB存储AES-256-GCM → 传输层challenge派生密钥加密 → HMAC签名校验
// 客户端必须已激活且持有有效 heartbeatToken 才能获取
router.post('/script', signatureMiddleware, async (req: Request, res: Response) => {
  try {
    const { appKey, userId, heartbeatToken } = req.body;
    if (!userId || !heartbeatToken) {
      fail(res, ErrorCode.BAD_REQUEST, '缺少必要参数');
      return;
    }
    const result = await verifyService.getEncryptedScript(appKey, userId, heartbeatToken);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message);
    }
  } catch (e) {
    serverError(res);
  }
});

// ==================== 设备解绑 ====================
// POST /api/client/unbind
// Body: { appKey, userId, heartbeatToken, timestamp, nonce, signature }
router.post('/unbind', signatureMiddleware, async (req: Request, res: Response) => {
  try {
    const { appKey, userId, heartbeatToken } = req.body;
    if (!userId || !heartbeatToken) {
      fail(res, ErrorCode.BAD_REQUEST, '缺少必要参数');
      return;
    }
    const result = await verifyService.unbindDevice(appKey, userId, heartbeatToken);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message);
    }
  } catch (e) {
    serverError(res);
  }
});

// ==================== 登出 ====================
// POST /api/client/logout
// Body: { appKey, userId, timestamp, nonce, signature }
router.post('/logout', signatureMiddleware, async (req: Request, res: Response) => {
  try {
    const { appKey, userId } = req.body;
    if (!userId) {
      fail(res, ErrorCode.BAD_REQUEST, '缺少必要参数');
      return;
    }
    const ip = getClientIp(req);
    const result = await verifyService.logout(appKey, userId, ip);
    await cleanupExpiredNonces();
    if (result.code === 0) {
      success(res, null, result.message);
    } else {
      fail(res, result.code, result.message);
    }
  } catch (e) {
    serverError(res);
  }
});

export default router;