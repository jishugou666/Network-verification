import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import * as authService from '../services/auth';
import { success, fail, serverError } from '../utils/response';
import { getClientIp } from '../utils/network';
import { ErrorCode } from '../types';

const router = Router();

// 登录限流更严格
router.post('/login', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      fail(res, ErrorCode.BAD_REQUEST, '用户名和密码不能为空');
      return;
    }
    if (typeof username !== 'string' || username.length < 2 || username.length > 64) {
      fail(res, ErrorCode.BAD_REQUEST, '用户名格式无效');
      return;
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      fail(res, ErrorCode.BAD_REQUEST, '密码格式无效');
      return;
    }
    const ip = getClientIp(req);
    const result = await authService.login(username, password, ip);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, result.code === 3002 ? 423 : 401);
    }
  } catch (e) {
    serverError(res);
  }
});

// 注册（仅代理）
router.post('/register', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) {
      fail(res, ErrorCode.BAD_REQUEST, '用户名和密码不能为空');
      return;
    }
    if (username.length < 3 || username.length > 64) {
      fail(res, ErrorCode.BAD_REQUEST, '用户名长度应在 3-64 个字符之间');
      return;
    }
    if (password.length < 6) {
      fail(res, ErrorCode.BAD_REQUEST, '密码长度不能少于 6 个字符');
      return;
    }
    const result = await authService.registerAgent(username, password, email);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, 409);
    }
  } catch (e) {
    serverError(res);
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await authService.getCurrentUser(req.ctx!.userId);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, 404);
    }
  } catch (e) {
    serverError(res);
  }
});

// 修改密码
router.put('/password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      fail(res, ErrorCode.BAD_REQUEST, '原密码和新密码不能为空');
      return;
    }
    if (newPassword.length < 6) {
      fail(res, ErrorCode.BAD_REQUEST, '新密码长度不能少于 6 个字符');
      return;
    }
    const result = await authService.changePassword(req.ctx!.userId, oldPassword, newPassword);
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