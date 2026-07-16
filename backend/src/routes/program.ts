import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import * as programService from '../services/program';
import { generateClientCode, LANG_META, CLIENT_LANGUAGES, ClientLang } from '../services/client';
import { buildClient, getBuildCapabilities } from '../services/build';
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
  } catch (e: any) {
    console.error('[POST /api/programs]', e.message, e.stack);
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

// ===== 静态路由（必须在 :id 之前） =====

// 代码混淆
router.post('/obfuscate', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      fail(res, ErrorCode.INVALID_INPUT, 'code 不能为空');
      return;
    }
    const result = await programService.obfuscateScript(code);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, 400);
    }
  } catch (e: any) {
    console.error('[POST /api/programs/obfuscate]', e.message);
    serverError(res);
  }
});

// 获取支持的语言列表
router.get('/languages', (_req: Request, res: Response) => {
  try {
    const langs = CLIENT_LANGUAGES.map(lang => ({
      id: lang,
      ...LANG_META[lang],
    }));
    success(res, langs);
  } catch (e: any) {
    console.error('[GET /languages]', e.message);
    serverError(res);
  }
});

// ===== 参数化路由 =====

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

// 程序对接信息（返回 appKey + 解密后的 appSecret）
router.get('/:id/integration', async (req: Request, res: Response) => {
  try {
    const result = await programService.getProgramIntegration(req.ctx!.userId, req.ctx!.role, req.params.id);
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

// 获取程序UI配置
router.get('/:id/ui-config', async (req: Request, res: Response) => {
  try {
    const result = await programService.getProgramUIConfig(req.ctx!.userId, req.ctx!.role, req.params.id);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, 404);
    }
  } catch (e) {
    serverError(res);
  }
});

// 更新程序UI配置
router.put('/:id/ui-config', async (req: Request, res: Response) => {
  try {
    const result = await programService.updateProgramUIConfig(req.ctx!.userId, req.ctx!.role, req.params.id, req.body);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, result.code === 404 ? 404 : 409);
    }
  } catch (e) {
    serverError(res);
  }
});

// 保存脚本代码
router.put('/:id/script', async (req: Request, res: Response) => {
  try {
    const { scriptCode } = req.body;
    if (scriptCode === undefined || scriptCode === null) {
      fail(res, ErrorCode.BAD_REQUEST, '缺少脚本代码');
      return;
    }
    if (typeof scriptCode !== 'string' || scriptCode.trim().length === 0) {
      fail(res, ErrorCode.BAD_REQUEST, '脚本代码不能为空');
      return;
    }
    const result = await programService.saveProgramScript(req.ctx!.userId, req.ctx!.role, req.params.id, scriptCode);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, result.code === 404 ? 404 : 400);
    }
  } catch (e: any) {
    console.error('[PUT /programs/:id/script]', e.message, e.stack);
    serverError(res);
  }
});

// 禁用脚本下发
router.delete('/:id/script', async (req: Request, res: Response) => {
  try {
    const result = await programService.disableProgramScript(req.ctx!.userId, req.ctx!.role, req.params.id);
    if (result.code === 0) {
      success(res, null, result.message);
    } else {
      fail(res, result.code, result.message, 404);
    }
  } catch (e) {
    serverError(res);
  }
});

// 重新混淆已保存脚本
router.post('/:id/reobfuscate', async (req: Request, res: Response) => {
  try {
    const result = await programService.reobfuscateProgramScript(req.ctx!.userId, req.ctx!.role, req.params.id);
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, result.code === 404 ? 404 : 400);
    }
  } catch (e: any) {
    console.error('[POST /:id/reobfuscate]', e.message);
    serverError(res);
  }
});

// 更新公告
router.put('/:id/announcement', async (req: Request, res: Response) => {
  try {
    const { announcement } = req.body;
    const result = await programService.updateProgram(req.ctx!.userId, req.ctx!.role, req.params.id, { announcement });
    if (result.code === 0) {
      success(res, result.data, result.message);
    } else {
      fail(res, result.code, result.message, 404);
    }
  } catch (e: any) {
    console.error('[PUT /:id/announcement]', e.message);
    serverError(res);
  }
});

// 预览客户端源码（选择语言后实时展示）
router.get('/:id/client/preview', async (req: Request, res: Response) => {
  try {
    const lang = req.query.lang as ClientLang;
    if (!lang || !CLIENT_LANGUAGES.includes(lang)) {
      fail(res, ErrorCode.INVALID_INPUT, '无效的语言类型');
      return;
    }
    const program = await programService.getProgramIntegration(req.ctx!.userId, req.ctx!.role, req.params.id);
    if (program.code !== 0 || !program.data) {
      fail(res, program.code, program.message, 404);
      return;
    }
    const apiBase = process.env.FRONTEND_URL || process.env.API_BASE || `http://localhost:${process.env.PORT || 3000}`;
    const code = generateClientCode(program.data.appKey, program.data.appSecret, `${apiBase}/api`, {
      lang,
      appName: 'MyApp',
      appVersion: '1.0.0',
      appDescription: 'CDK 卡密验证客户端',
    });
    const meta = LANG_META[lang as keyof typeof LANG_META];
    success(res, { code, filename: `MyApp${meta.ext}`, lang: meta.label });
  } catch (e: any) {
    console.error('[GET /:id/client/preview]', e.message);
    serverError(res);
  }
});

// 生成客户端代码
router.post('/:id/client', async (req: Request, res: Response) => {
  try {
    const { lang, appName, appVersion, appDescription } = req.body;
    if (!lang || !CLIENT_LANGUAGES.includes(lang)) {
      fail(res, ErrorCode.INVALID_INPUT, '无效的语言类型');
      return;
    }
    const program = await programService.getProgramIntegration(req.ctx!.userId, req.ctx!.role, req.params.id);
    if (program.code !== 0 || !program.data) {
      fail(res, program.code, program.message, 404);
      return;
    }
    const apiBase = process.env.FRONTEND_URL || process.env.API_BASE || `http://localhost:${process.env.PORT || 3000}`;
    const code = generateClientCode(program.data.appKey, program.data.appSecret, `${apiBase}/api`, {
      lang,
      appName,
      appVersion,
      appDescription,
    });
    const meta = LANG_META[lang as keyof typeof LANG_META];
    success(res, { code, filename: `${appName || 'client'}${meta.ext}`, lang: meta.label });
  } catch (e: any) {
    console.error('[POST /:id/client]', e.message);
    serverError(res);
  }
});

// 获取编译能力（哪些语言支持在线打包）
router.get('/:id/client/build/capabilities', async (req: Request, res: Response) => {
  try {
    const caps = getBuildCapabilities();
    success(res, caps);
  } catch (e: any) {
    console.error('[GET /build/capabilities]', e.message);
    serverError(res);
  }
});

// 在线编译客户端为 EXE
router.post('/:id/client/build', async (req: Request, res: Response) => {
  try {
    const { lang, appName, appVersion, appDescription } = req.body;
    if (!lang || !CLIENT_LANGUAGES.includes(lang)) {
      fail(res, ErrorCode.INVALID_INPUT, '无效的语言类型');
      return;
    }
    const program = await programService.getProgramIntegration(req.ctx!.userId, req.ctx!.role, req.params.id);
    if (program.code !== 0 || !program.data) {
      fail(res, program.code, program.message, 404);
      return;
    }
    const apiBase = process.env.FRONTEND_URL || process.env.API_BASE || `http://localhost:${process.env.PORT || 3000}`;
    const code = generateClientCode(program.data.appKey, program.data.appSecret, `${apiBase}/api`, {
      lang,
      appName,
      appVersion,
      appDescription,
    });

    const result = buildClient(lang, code, appName || 'client');

    if (result.success && result.buffer) {
      // 返回编译好的 EXE 文件
      res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename || 'client.exe')}"`);
      res.setHeader('Content-Length', result.buffer.length);
      res.send(result.buffer);
    } else {
      // 返回错误信息 + 构建脚本
      success(res, {
        built: false,
        error: result.error,
        buildScript: result.buildScript || null,
        scriptLang: result.scriptLang || null,
        buildLog: result.buildLog || null,
      });
    }
  } catch (e: any) {
    console.error('[POST /:id/client/build]', e.message);
    serverError(res);
  }
});

export default router;