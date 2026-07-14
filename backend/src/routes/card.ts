import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as cardService from '../services/card';
import { success, fail, serverError } from '../utils/response';
import { ErrorCode } from '../types';

const router = Router();

router.use(authMiddleware);

// 批量生成卡密
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { programId, cardType, count, durationDays, prefix } = req.body;
    if (!programId || !cardType || !count) {
      fail(res, ErrorCode.BAD_REQUEST, '缺少必要参数：programId, cardType, count');
      return;
    }
    const result = await cardService.generateCards(req.ctx!.userId, req.ctx!.role, {
      programId, cardType, count, durationDays, prefix,
    });
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message);
    }
  } catch (e) {
    serverError(res);
  }
});

// 卡密列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { programId, status, cardType, search, page, pageSize } = req.query;
    const result = await cardService.listCards(req.ctx!.userId, req.ctx!.role, {
      programId: programId as string,
      status: status as string,
      cardType: cardType as string,
      search: search as string,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    });
    success(res, result.data, result.message);
  } catch (e) {
    serverError(res);
  }
});

// 封禁卡密
router.post('/ban', async (req: Request, res: Response) => {
  try {
    const { cardIds, reason } = req.body;
    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      fail(res, ErrorCode.BAD_REQUEST, '请提供要封禁的卡密 ID 列表');
      return;
    }
    const result = await cardService.banCards(req.ctx!.userId, req.ctx!.role, cardIds, reason);
    success(res, result.data, result.message);
  } catch (e) {
    serverError(res);
  }
});

// 删除卡密
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const { cardIds } = req.body;
    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      fail(res, ErrorCode.BAD_REQUEST, '请提供要删除的卡密 ID 列表');
      return;
    }
    const result = await cardService.deleteCards(req.ctx!.userId, req.ctx!.role, cardIds);
    success(res, result.data, result.message);
  } catch (e) {
    serverError(res);
  }
});

// 延期卡密
router.post('/extend', async (req: Request, res: Response) => {
  try {
    const { cardIds, extendDays } = req.body;
    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0 || !extendDays) {
      fail(res, ErrorCode.BAD_REQUEST, '请提供卡密 ID 列表和延期天数');
      return;
    }
    const result = await cardService.extendCards(req.ctx!.userId, req.ctx!.role, cardIds, extendDays);
    success(res, result.data, result.message);
  } catch (e) {
    serverError(res);
  }
});

// 重置设备绑定
router.post('/:id/reset-device', async (req: Request, res: Response) => {
  try {
    const result = await cardService.resetDeviceBinding(req.ctx!.userId, req.ctx!.role, req.params.id);
    if (result.code === 0) {
      success(res, null, result.message);
    } else {
      fail(res, result.code, result.message);
    }
  } catch (e) {
    serverError(res);
  }
});

// 导出卡密
router.get('/export/:programId', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) === 'csv' ? 'csv' : 'txt';
    const result = await cardService.exportCards(req.ctx!.userId, req.ctx!.role, req.params.programId, format);
    if (result.code === 0) {
      const { content, format: fmt } = result.data!;
      res.setHeader('Content-Type', fmt === 'csv' ? 'text/csv' : 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename=cards.${fmt}`);
      res.send(content);
    } else {
      fail(res, result.code, result.message);
    }
  } catch (e) {
    serverError(res);
  }
});

// 卡密详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await cardService.getCardDetail(req.ctx!.userId, req.ctx!.role, req.params.id);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message);
    }
  } catch (e) {
    serverError(res);
  }
});

export default router;