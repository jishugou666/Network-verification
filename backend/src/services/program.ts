import { prisma } from '../utils/prisma';
import { generateAppKey, generateAppSecret, aesEncrypt, aesDecrypt, maskSecret } from '../utils/crypto';
import { CreateProgramRequest } from '../types';

// ==================== 创建程序 ====================
// 代理创建自有程序，自动生成 AppKey 和 AppSecret
// Secret 仅首次返回明文，后续仅显示脱敏值

export async function createProgram(agentId: string, data: CreateProgramRequest) {
  // 检查 slug 唯一性
  const existing = await prisma.program.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return { code: 4001, message: '程序标识已存在', data: null };
  }

  const appKey = generateAppKey();
  const appSecret = generateAppSecret();
  const appSecretEncrypted = aesEncrypt(appSecret);
  const appSecretPreview = maskSecret(appSecret);

  const program = await prisma.program.create({
    data: {
      agentId,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      appKey,
      appSecretEncrypted,
      appSecretPreview,
      maxDevices: data.maxDevices ?? 3,
      allowReActivate: data.allowReActivate ?? false,
      heartbeatTimeout: data.heartbeatTimeout ?? 120,
    },
  });

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: 'create_program',
      target: 'program',
      targetId: program.id,
      detail: JSON.stringify({ name: program.name, slug: program.slug }),
    },
  });

  return {
    code: 0,
    message: '程序创建成功',
    data: {
      ...program,
      appSecret, // 仅首次返回明文
      appSecretPreview,
    },
  };
}

// ==================== 编辑程序 ====================
// 三层权限隔离：agent 只能编辑自己的程序

export async function updateProgram(agentId: string, role: string, programId: string, data: Partial<CreateProgramRequest>) {
  const where: any = { id: programId };
  // root 可编辑任意程序，agent 仅限自己的
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const program = await prisma.program.findUnique({ where });
  if (!program) {
    return { code: 404, message: '程序不存在或无权操作', data: null };
  }

  // 如果修改 slug，检查唯一性
  if (data.slug && data.slug !== program.slug) {
    const slugExist = await prisma.program.findUnique({ where: { slug: data.slug } });
    if (slugExist) {
      return { code: 4001, message: '程序标识已存在', data: null };
    }
  }

  const updated = await prisma.program.update({
    where: { id: programId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.maxDevices !== undefined && { maxDevices: data.maxDevices }),
      ...(data.allowReActivate !== undefined && { allowReActivate: data.allowReActivate }),
      ...(data.heartbeatTimeout !== undefined && { heartbeatTimeout: data.heartbeatTimeout }),
    },
  });

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: 'update_program',
      target: 'program',
      targetId: programId,
      detail: JSON.stringify(data),
    },
  });

  return { code: 0, message: '程序更新成功', data: { ...updated, appSecretEncrypted: undefined } };
}

// ==================== 删除程序 ====================
export async function deleteProgram(agentId: string, role: string, programId: string) {
  const where: any = { id: programId };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const program = await prisma.program.findUnique({ where });
  if (!program) {
    return { code: 404, message: '程序不存在或无权操作', data: null };
  }

  // 删除关联数据：卡密、终端用户、设备、心跳 token、验证日志
  await prisma.$transaction([
    prisma.heartbeatToken.deleteMany({ where: { endUser: { programId } } }),
    prisma.device.deleteMany({ where: { programId } }),
    prisma.cardKey.deleteMany({ where: { programId } }),
    prisma.endUser.deleteMany({ where: { programId } }),
    prisma.verifyLog.deleteMany({ where: { programId } }),
    prisma.program.delete({ where: { id: programId } }),
  ]);

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: 'delete_program',
      target: 'program',
      targetId: programId,
      detail: JSON.stringify({ name: program.name }),
    },
  });

  return { code: 0, message: '程序已删除', data: null };
}

// ==================== 程序列表 ====================
export async function listPrograms(agentId: string, role: string, page: number = 1, pageSize: number = 20) {
  const where: any = {};
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const [programs, total] = await Promise.all([
    prisma.program.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        agentId: true,
        name: true,
        slug: true,
        description: true,
        appKey: true,
        appSecretPreview: true,
        status: true,
        maxDevices: true,
        allowReActivate: true,
        heartbeatTimeout: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { cardKeys: true, endUsers: true } },
      },
    }),
    prisma.program.count({ where }),
  ]);

  return { code: 0, message: 'ok', data: { programs, total, page, pageSize } };
}

// ==================== 程序详情 ====================
export async function getProgram(agentId: string, role: string, programId: string) {
  const where: any = { id: programId };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const program = await prisma.program.findUnique({
    where,
    select: {
      id: true,
      agentId: true,
      name: true,
      slug: true,
      description: true,
      appKey: true,
      appSecretPreview: true,
      status: true,
      maxDevices: true,
      allowReActivate: true,
      heartbeatTimeout: true,
      ipWhitelist: true,
      webhookUrl: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { cardKeys: true, endUsers: true } },
    },
  });

  if (!program) {
    return { code: 404, message: '程序不存在或无权访问', data: null };
  }

  return { code: 0, message: 'ok', data: program };
}

// ==================== 切换程序状态 ====================
export async function toggleProgramStatus(agentId: string, role: string, programId: string, status: 'active' | 'disabled') {
  const where: any = { id: programId };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const program = await prisma.program.findUnique({ where });
  if (!program) {
    return { code: 404, message: '程序不存在或无权操作', data: null };
  }

  await prisma.program.update({ where: { id: programId }, data: { status } });

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: status === 'disabled' ? 'disable_program' : 'enable_program',
      target: 'program',
      targetId: programId,
    },
  });

  return { code: 0, message: status === 'disabled' ? '程序已停用' : '程序已启用', data: null };
}

// ==================== 获取程序对接信息 ====================
// 返回 appKey 和解密后的 appSecret，用于对接页面的代码示例
export async function getProgramIntegration(agentId: string, role: string, programId: string) {
  const where: any = { id: programId };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const program = await prisma.program.findUnique({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      appKey: true,
      appSecretEncrypted: true,
      status: true,
      scriptEncrypted: true,
      scriptPreview: true,
      scriptEnabled: true,
      scriptSize: true,
    },
  });

  if (!program) {
    return { code: 404, message: '程序不存在或无权访问', data: null };
  }

  const appSecret = aesDecrypt(program.appSecretEncrypted);

  return {
    code: 0,
    message: 'ok',
    data: {
      appKey: program.appKey,
      appSecret,
      name: program.name,
      slug: program.slug,
      scriptEnabled: program.scriptEnabled,
      scriptPreview: program.scriptPreview,
      scriptSize: program.scriptSize,
    },
  };
}

// ==================== 保存脚本代码 ====================
export async function saveProgramScript(agentId: string, role: string, programId: string, scriptCode: string) {
  const where: any = { id: programId };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const program = await prisma.program.findUnique({ where });
  if (!program) {
    return { code: 404, message: '程序不存在或无权操作', data: null };
  }

  const trimmed = scriptCode.trim();
  if (!trimmed) {
    return { code: 400, message: '脚本代码不能为空', data: null };
  }

  const encrypted = aesEncrypt(trimmed);
  const preview = trimmed.length > 256 ? trimmed.substring(0, 256) + '...' : trimmed;

  await prisma.program.update({
    where: { id: programId },
    data: {
      scriptEncrypted: encrypted,
      scriptPreview: preview,
      scriptEnabled: true,
      scriptSize: trimmed.length,
    },
  });

  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: 'save_script',
      target: 'program',
      targetId: programId,
      detail: JSON.stringify({ scriptSize: trimmed.length }),
    },
  });

  return { code: 0, message: '脚本保存成功', data: { scriptEnabled: true, scriptSize: trimmed.length, scriptPreview: preview } };
}

// ==================== 禁用脚本下发 ====================
export async function disableProgramScript(agentId: string, role: string, programId: string) {
  const where: any = { id: programId };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const program = await prisma.program.findUnique({ where });
  if (!program) {
    return { code: 404, message: '程序不存在或无权操作', data: null };
  }

  await prisma.program.update({
    where: { id: programId },
    data: { scriptEnabled: false },
  });

  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: 'disable_script',
      target: 'program',
      targetId: programId,
    },
  });

  return { code: 0, message: '脚本下发已禁用', data: null };
}