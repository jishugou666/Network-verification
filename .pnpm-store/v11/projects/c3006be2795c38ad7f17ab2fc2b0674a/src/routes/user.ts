import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import * as userService from '../services/user';
import { success, fail, serverError } from '../utils/response';
import { ErrorCode } from '../types';

const router = Router();

router.use(authMiddleware);

// ==================== 终端用户管理 ====================

// 终端用户列表
router.get('/end-users', async (req: Request, res: Response) => {
  try {
    const { programId, status, search, page, pageSize } = req.query;
    const result = await userService.listEndUsers(req.ctx!.userId, req.ctx!.role, {
      programId: programId as string,
      status: status as string,
      search: search as string,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    });
    success(res, result.data, result.message);
  } catch (e) {
    serverError(res);
  }
});

// 终端用户详情
router.get('/end-users/:id', async (req: Request, res: Response) => {
  try {
    const result = await userService.getEndUser(req.ctx!.userId, req.ctx!.role, req.params.id);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, 404);
    }
  } catch (e) {
    serverError(res);
  }
});

// 封禁/解封用户
router.post('/end-users/:id/ban', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const result = await userService.banEndUser(req.ctx!.userId, req.ctx!.role, req.params.id, reason);
    if (result.code === 0) {
      success(res, null, result.message);
    } else {
      fail(res, result.code, result.message, 404);
    }
  } catch (e) {
    serverError(res);
  }
});

// 解绑设备
router.delete('/devices/:id', async (req: Request, res: Response) => {
  try {
    const result = await userService.unbindDevice(req.ctx!.userId, req.ctx!.role, req.params.id);
    if (result.code === 0) {
      success(res, null, result.message);
    } else {
      fail(res, result.code, result.message, result.code === 403 ? 403 : 404);
    }
  } catch (e) {
    serverError(res);
  }
});

// ==================== 仪表盘 ====================
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const result = await userService.getDashboard(req.ctx!.userId, req.ctx!.role);
    success(res, result.data, result.message);
  } catch (e) {
    serverError(res);
  }
});

// ==================== 超级管理员专用：代理管理 ====================
// 代理列表
router.get('/agents', requireRole('root'), async (req: Request, res: Response) => {
  try {
    const { status, page, pageSize } = req.query;
    const result = await userService.listAgents({
      status: status as string,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    });
    success(res, result.data, result.message);
  } catch (e) {
    serverError(res);
  }
});

// 封禁/解封代理
router.post('/agents/:id/toggle-status', requireRole('root'), async (req: Request, res: Response) => {
  try {
    const result = await userService.toggleAgentStatus(req.params.id);
    if (result.code === 0) {
      success(res, null, result.message);
    } else {
      fail(res, result.code, result.message, 404);
    }
  } catch (e) {
    serverError(res);
  }
});

export default router;