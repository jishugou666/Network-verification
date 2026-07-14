import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { generateCardKey } from '../utils/crypto';
import { CardType, CARD_TYPE_DAYS, GenerateCardsRequest } from '../types';

const BCRYPT_ROUNDS = 10; // 卡密哈希轮数（略低于密码，兼顾性能）

// ==================== 批量生成卡密 ====================
// 生成时即时返回明文，数据库仅存储 bcrypt 哈希
// 支持自定义前缀

export async function generateCards(agentId: string, role: string, data: GenerateCardsRequest) {
  // 三层权限隔离：校验程序归属
  const where: any = { id: data.programId };
  if (role !== 'root') {
    where.agentId = agentId;
  }
  const program = await prisma.program.findUnique({ where });
  if (!program) {
    return { code: 404, message: '程序不存在或无权操作', data: null };
  }

  if (data.count < 1 || data.count > 500) {
    return { code: 400, message: '生成数量应在 1-500 之间', data: null };
  }

  const cardType = data.cardType as CardType;
  const prefix = data.prefix || '';
  let durationDays = CARD_TYPE_DAYS[cardType];
  if (cardType === 'custom') {
    durationDays = data.durationDays || 0;
    if (durationDays < 1) {
      return { code: 400, message: '自定义时长必须大于 0', data: null };
    }
  }

  // 批量生成卡密
  const generatedCards: { plain: string; hash: string }[] = [];
  for (let i = 0; i < data.count; i++) {
    const plain = generateCardKey(prefix);
    const hash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
    generatedCards.push({ plain, hash });
  }

  // 批量写入数据库
  const cardData = generatedCards.map(c => ({
    agentId,
    programId: data.programId,
    cardHash: c.hash,
    cardPrefix: prefix || null,
    cardType,
    durationDays,
    status: 'inactive',
    generatedAt: new Date(),
  }));

  await prisma.cardKey.createMany({ data: cardData });

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: 'generate_cards',
      target: 'card_key',
      targetId: data.programId,
      detail: JSON.stringify({ count: data.count, cardType, durationDays, programName: program.name }),
    },
  });

  return {
    code: 0,
    message: `成功生成 ${data.count} 张卡密`,
    data: {
      cards: generatedCards.map(c => c.plain), // 仅此次返回明文
      cardType,
      durationDays,
    },
  };
}

// ==================== 卡密列表 ====================
export async function listCards(
  agentId: string,
  role: string,
  params: {
    programId?: string;
    status?: string;
    cardType?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const where: any = {};
  if (role !== 'root') {
    where.agentId = agentId;
  }
  if (params.programId) {
    where.programId = params.programId;
  }
  if (params.status) {
    where.status = params.status;
  }
  if (params.cardType) {
    where.cardType = params.cardType;
  }
  // 搜索：按前缀模糊匹配
  if (params.search) {
    where.cardPrefix = { contains: params.search };
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  const [cards, total] = await Promise.all([
    prisma.cardKey.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true,
        programId: true,
        cardPrefix: true,
        cardType: true,
        durationDays: true,
        status: true,
        note: true,
        generatedAt: true,
        activatedAt: true,
        expiresAt: true,
        endUserId: true,
        bannedAt: true,
        bannedReason: true,
        program: { select: { name: true, slug: true } },
        endUser: { select: { username: true } },
      },
    }),
    prisma.cardKey.count({ where }),
  ]);

  return { code: 0, message: 'ok', data: { cards, total, page, pageSize } };
}

// ==================== 封禁卡密 ====================
export async function banCards(agentId: string, role: string, cardIds: string[], reason?: string) {
  // 三层权限隔离
  const where: any = { id: { in: cardIds } };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const result = await prisma.cardKey.updateMany({
    where,
    data: {
      status: 'banned',
      bannedAt: new Date(),
      bannedReason: reason || null,
    },
  });

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: 'ban_cards',
      target: 'card_key',
      detail: JSON.stringify({ cardIds, count: result.count, reason }),
    },
  });

  return { code: 0, message: `已封禁 ${result.count} 张卡密`, data: { count: result.count } };
}

// ==================== 删除卡密 ====================
export async function deleteCards(agentId: string, role: string, cardIds: string[]) {
  const where: any = { id: { in: cardIds } };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const result = await prisma.cardKey.deleteMany({ where });

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: 'delete_cards',
      target: 'card_key',
      detail: JSON.stringify({ cardIds, count: result.count }),
    },
  });

  return { code: 0, message: `已删除 ${result.count} 张卡密`, data: { count: result.count } };
}

// ==================== 延期卡密 ====================
export async function extendCards(agentId: string, role: string, cardIds: string[], extendDays: number) {
  if (extendDays < 1) {
    return { code: 400, message: '延期天数必须大于 0', data: null };
  }

  const where: any = { id: { in: cardIds } };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  // 获取需要延期的卡密
  const cards = await prisma.cardKey.findMany({ where, select: { id: true, expiresAt: true } });
  if (cards.length === 0) {
    return { code: 404, message: '未找到可操作的卡密', data: null };
  }

  // 逐条更新过期时间
  let count = 0;
  for (const card of cards) {
    const newExpiresAt = card.expiresAt
      ? new Date(card.expiresAt.getTime() + extendDays * 86400000)
      : new Date(Date.now() + extendDays * 86400000);
    await prisma.cardKey.update({
      where: { id: card.id },
      data: { expiresAt: newExpiresAt, status: 'active' }, // 延期后重新激活
    });
    count++;
  }

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: 'extend_cards',
      target: 'card_key',
      detail: JSON.stringify({ cardIds, extendDays, count }),
    },
  });

  return { code: 0, message: `已延期 ${count} 张卡密`, data: { count } };
}

// ==================== 重置设备绑定 ====================
export async function resetDeviceBinding(agentId: string, role: string, cardId: string) {
  const where: any = { id: cardId };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const card = await prisma.cardKey.findUnique({ where });
  if (!card) {
    return { code: 404, message: '卡密不存在或无权操作', data: null };
  }

  if (!card.endUserId) {
    return { code: 400, message: '该卡密未绑定用户', data: null };
  }

  // 删除该用户的所有设备绑定
  await prisma.device.deleteMany({ where: { endUserId: card.endUserId } });

  // 重置卡密状态
  await prisma.cardKey.update({
    where: { id: cardId },
    data: { endUserId: null, status: 'inactive', activatedAt: null, expiresAt: null },
  });

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: 'reset_device_binding',
      target: 'card_key',
      targetId: cardId,
    },
  });

  return { code: 0, message: '设备绑定已重置', data: null };
}

// ==================== 导出卡密 ====================
export async function exportCards(agentId: string, role: string, programId: string, format: 'txt' | 'csv') {
  const where: any = { programId };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const cards = await prisma.cardKey.findMany({
    where,
    select: {
      cardPrefix: true,
      cardType: true,
      durationDays: true,
      status: true,
      generatedAt: true,
      activatedAt: true,
      expiresAt: true,
    },
  });

  let content: string;
  if (format === 'csv') {
    content = '前缀,类型,时长(天),状态,生成时间,激活时间,过期时间\n';
    content += cards.map(c =>
      `${c.cardPrefix || ''},${c.cardType},${c.durationDays},${c.status},${c.generatedAt?.toISOString() || ''},${c.activatedAt?.toISOString() || ''},${c.expiresAt?.toISOString() || ''}`,
    ).join('\n');
  } else {
    content = cards.map(c =>
      `[${c.cardPrefix || 'N/A'}] ${c.cardType} ${c.durationDays}天 ${c.status}`,
    ).join('\n');
  }

  return { code: 0, message: 'ok', data: { content, format, count: cards.length } };
}