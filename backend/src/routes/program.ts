import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import * as programService from '../services/program';
import { success, fail, serverError } from '../utils/response';
import { ErrorCode } from '../types';

const router = Router();

// 所有路由需要认证
router.use(authMiddleware);

// 创建程序
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, slug, description, maxDevices, allowReActivate, heartbeatTimeout } = req.body;
    if (!name || !slug) {
      fail(res, ErrorCode.BAD_REQUEST, '程序名称和标识不能为空');
      return;
    }
    const result = await programService.createProgram(req.ctx!.userId, {
      name, slug, description, maxDevices, allowReActivate, heartbeatTimeout,
    });
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, 409);
    }
  } catch (e) {
    serverError(res);
  }
});

// 程序列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await programService.listPrograms(req.ctx!.userId, req.ctx!.role, page, pageSize);
    success(res, result.data, result.message);
  } catch (e) {
    serverError(res);
  }
});

// 程序详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await programService.getProgram(req.ctx!.userId, req.ctx!.role, req.params.id);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, 404);
    }
  } catch (e) {
    serverError(res);
  }
});

// 编辑程序
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const result = await programService.updateProgram(req.ctx!.userId, req.ctx!.role, req.params.id, req.body);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, result.code === 404 ? 404 : 409);
    }
  } catch (e) {
    serverError(res);
  }
});

// 删除程序
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await programService.deleteProgram(req.ctx!.userId, req.ctx!.role, req.params.id);
    if (result.code === 0) {
      success(res, null, result.message);
    } else {
      fail(res, result.code, result.message, 404);
    }
  } catch (e) {
    serverError(res);
  }
});

// 切换程序状态
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (status !== 'active' && status !== 'disabled') {
      fail(res, ErrorCode.BAD_REQUEST, '状态值无效');
      return;
    }
    const result = await programService.toggleProgramStatus(req.ctx!.userId, req.ctx!.role, req.params.id, status);
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