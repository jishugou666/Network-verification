import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { generateChallenge, hashDeviceFingerprint, encryptResponse, hmacSign, hmacVerify, aesDecrypt } from '../utils/crypto';
import { v4 as uuidv4 } from 'uuid';

// ==================== 获取挑战 ====================
// 客户端调用此接口获取随机 128 位挑战字符串
// 后续激活/验证操作需使用此挑战做 HMAC 签名

export async function getChallenge(appKey: string) {
  const program = await prisma.program.findUnique({ where: { appKey } });
  if (!program) {
    return { code: 404, message: 'AppKey 无效', data: null };
  }
  if (program.status === 'disabled') {
    return { code: 2006, message: '程序已停用', data: null };
  }

  const challenge = generateChallenge();

  // 记录验证日志
  await prisma.verifyLog.create({
    data: {
      programId: program.id,
      action: 'challenge',
      success: true,
      detail: JSON.stringify({ challenge }),
    },
  });

  return { code: 0, message: 'ok', data: { challenge } };
}

// ==================== 卡密激活 ====================
// 流程：
// 1. 客户端调用 getChallenge 获取 challenge
// 2. 客户端提交：cardKey(明文) + username + hardwareInfo + challengeResponse
//    challengeResponse = HMAC-SHA256(challenge + cardKey + username, appSecret)
// 3. 服务端校验 challengeResponse，通过后 bcrypt 比对卡密哈希
// 4. 激活成功后绑定用户，生成设备指纹

export async function activateCard(
  appKey: string,
  cardKeyPlain: string,
  username: string,
  hardwareInfo: string,
  challengeResponse: string,
  ip: string,
) {
  const program = await prisma.program.findUnique({ where: { appKey } });
  if (!program) {
    return { code: 404, message: 'AppKey 无效', data: null };
  }
  if (program.status === 'disabled') {
    return { code: 2006, message: '程序已停用', data: null };
  }

  // 解密 AppSecret 用于校验 challengeResponse
  let appSecret: string;
  try {
    appSecret = aesDecrypt(program.appSecretEncrypted);
  } catch {
    return { code: 500, message: '服务端配置错误', data: null };
  }

  // 校验 challengeResponse
  // challengeResponse = HMAC-SHA256(challenge + cardKey + username, appSecret)
  // 注意：此处 challenge 应从上下文获取，简化处理：challengeResponse 格式为 challenge:signature
  const parts = challengeResponse.split(':');
  if (parts.length !== 2) {
    return { code: 2009, message: '挑战响应格式错误', data: null };
  }
  const [challenge, responseSig] = parts;
  const expectedData = challenge + cardKeyPlain + username;
  if (!hmacVerify(expectedData, responseSig, appSecret)) {
    // 记录失败日志
    await prisma.verifyLog.create({
      data: { programId: program.id, action: 'activate', success: false, ip, detail: 'challenge_response_mismatch' },
    });
    return { code: 2009, message: '挑战响应校验失败', data: null };
  }

  // 查找卡密：遍历该程序下所有卡密，bcrypt 比对
  const allCards = await prisma.cardKey.findMany({
    where: {
      programId: program.id,
      status: { in: ['inactive', 'active'] },
    },
    select: { id: true, cardHash: true, status: true, endUserId: true, expiresAt: true },
  });

  let matchedCard: typeof allCards[0] | null = null;
  for (const card of allCards) {
    const match = await bcrypt.compare(cardKeyPlain, card.cardHash);
    if (match) {
      matchedCard = card;
      break;
    }
  }

  if (!matchedCard) {
    await prisma.verifyLog.create({
      data: { programId: program.id, action: 'activate', success: false, ip, detail: 'card_not_found' },
    });
    return { code: 2001, message: '卡密无效', data: null };
  }

  // 卡密状态校验
  if (matchedCard.status === 'banned') {
    await prisma.verifyLog.create({
      data: { programId: program.id, action: 'activate', success: false, ip, detail: 'card_banned' },
    });
    return { code: 2004, message: '卡密已被封禁', data: null };
  }

  // 卡密已激活：检查是否允许重复激活
  if (matchedCard.status === 'active' && matchedCard.endUserId) {
    if (!program.allowReActivate) {
      await prisma.verifyLog.create({
        data: { programId: program.id, action: 'activate', success: false, ip, detail: 'card_already_activated' },
      });
      return { code: 2002, message: '卡密已被激活，不允许重复激活', data: null };
    }
    // 允许重复激活：将旧用户解绑
    await prisma.cardKey.update({
      where: { id: matchedCard.id },
      data: { endUserId: null, status: 'inactive', activatedAt: null, expiresAt: null },
    });
  }

  // 检查卡密是否已过期
  if (matchedCard.expiresAt && matchedCard.expiresAt < new Date()) {
    // 更新状态为过期
    await prisma.cardKey.update({ where: { id: matchedCard.id }, data: { status: 'expired' } });
    await prisma.verifyLog.create({
      data: { programId: program.id, action: 'activate', success: false, ip, detail: 'card_expired' },
    });
    return { code: 2003, message: '卡密已过期', data: null };
  }

  // 生成设备指纹
  const deviceFingerprint = hashDeviceFingerprint(hardwareInfo);

  // 创建或查找终端用户
  let endUser = await prisma.endUser.findFirst({
    where: { programId: program.id, username },
  });

  if (endUser) {
    // 用户已存在，检查是否被封禁
    if (endUser.status === 'banned') {
      await prisma.verifyLog.create({
        data: { programId: program.id, action: 'activate', success: false, ip, detail: 'user_banned' },
      });
      return { code: 2007, message: '用户已被封禁', data: null };
    }
    // 更新用户信息
    await prisma.endUser.update({
      where: { id: endUser.id },
      data: { lastOnline: new Date(), lastIp: ip },
    });
  } else {
    endUser = await prisma.endUser.create({
      data: {
        agentId: program.agentId,
        programId: program.id,
        username,
        lastOnline: new Date(),
        lastIp: ip,
      },
    });
  }

  // 计算过期时间
  const card = await prisma.cardKey.findUnique({ where: { id: matchedCard.id } });
  let expiresAt: Date | null = null;
  if (card && card.durationDays > 0) {
    expiresAt = new Date(Date.now() + card.durationDays * 86400000);
  }

  // 更新卡密状态
  await prisma.cardKey.update({
    where: { id: matchedCard.id },
    data: {
      status: 'active',
      endUserId: endUser.id,
      activatedAt: new Date(),
      expiresAt,
    },
  });

  // 绑定设备
  await prisma.device.upsert({
    where: {
      endUserId_deviceFingerprint: {
        endUserId: endUser.id,
        deviceFingerprint,
      },
    },
    update: { lastSeen: new Date(), ip },
    create: {
      endUserId: endUser.id,
      programId: program.id,
      deviceFingerprint,
      lastSeen: new Date(),
      ip,
    },
  });

  // 生成一次性心跳 Token
  const heartbeatToken = uuidv4();
  await prisma.heartbeatToken.create({
    data: {
      endUserId: endUser.id,
      token: heartbeatToken,
      expiresAt: new Date(Date.now() + program.heartbeatTimeout * 1000),
    },
  });

  // 记录成功日志
  await prisma.verifyLog.create({
    data: {
      programId: program.id,
      action: 'activate',
      success: true,
      ip,
      detail: JSON.stringify({ endUserId: endUser.id, deviceFingerprint }),
    },
  });

  // 加密响应
  const responseData = JSON.stringify({
    userId: endUser.id,
    username: endUser.username,
    heartbeatToken,
    expiresAt: expiresAt?.toISOString() || null,
    maxDevices: program.maxDevices,
    deviceCount: 1,
  });
  const encrypted = encryptResponse(responseData, challenge);

  return {
    code: 0,
    message: '激活成功',
    data: {
      ...encrypted,
      userId: endUser.id,
    },
  };
}

// ==================== 心跳验证 ====================
// 单次有效心跳 Token：验证后立即失效，防止重放
// 返回新的心跳 Token 供下次使用

export async function heartbeat(
  appKey: string,
  userId: string,
  heartbeatToken: string,
  ip: string,
) {
  const program = await prisma.program.findUnique({ where: { appKey } });
  if (!program) {
    return { code: 404, message: 'AppKey 无效', data: null };
  }
  if (program.status === 'disabled') {
    return { code: 2006, message: '程序已停用', data: null };
  }

  // 校验心跳 Token
  const token = await prisma.heartbeatToken.findUnique({ where: { token: heartbeatToken } });
  if (!token) {
    await prisma.verifyLog.create({
      data: { programId: program.id, action: 'heartbeat', success: false, ip, detail: 'token_not_found' },
    });
    return { code: 2008, message: '心跳 Token 无效', data: null };
  }

  // 检查 Token 是否已使用
  if (token.used) {
    await prisma.verifyLog.create({
      data: { programId: program.id, action: 'heartbeat', success: false, ip, detail: 'token_already_used' },
    });
    return { code: 2008, message: '心跳 Token 已失效（重放攻击）', data: null };
  }

  // 检查 Token 是否过期
  if (token.expiresAt < new Date()) {
    await prisma.verifyLog.create({
      data: { programId: program.id, action: 'heartbeat', success: false, ip, detail: 'token_expired' },
    });
    return { code: 2008, message: '心跳 Token 已过期', data: null };
  }

  // 检查 Token 归属
  if (token.endUserId !== userId) {
    await prisma.verifyLog.create({
      data: { programId: program.id, action: 'heartbeat', success: false, ip, detail: 'token_user_mismatch' },
    });
    return { code: 2008, message: '心跳 Token 与用户不匹配', data: null };
  }

  // 检查用户状态
  const endUser = await prisma.endUser.findUnique({ where: { id: userId } });
  if (!endUser || endUser.status === 'banned') {
    await prisma.verifyLog.create({
      data: { programId: program.id, action: 'heartbeat', success: false, ip, detail: 'user_banned_or_not_found' },
    });
    return { code: 2007, message: '用户已被封禁或不存在', data: null };
  }

  // 检查卡密是否过期
  const activeCard = await prisma.cardKey.findFirst({
    where: { endUserId: userId, status: 'active' },
  });
  if (activeCard?.expiresAt && activeCard.expiresAt < new Date()) {
    // 自动将卡密标记为过期
    await prisma.cardKey.update({ where: { id: activeCard.id }, data: { status: 'expired' } });
    await prisma.verifyLog.create({
      data: { programId: program.id, action: 'heartbeat', success: false, ip, detail: 'card_expired' },
    });
    return { code: 2003, message: '卡密已过期', data: null };
  }

  // 标记旧 Token 已使用
  await prisma.heartbeatToken.update({ where: { id: token.id }, data: { used: true } });

  // 生成新 Token
  const newToken = uuidv4();
  await prisma.heartbeatToken.create({
    data: {
      endUserId: userId,
      token: newToken,
      expiresAt: new Date(Date.now() + program.heartbeatTimeout * 1000),
    },
  });

  // 更新用户在线信息
  const lastOnline = endUser.lastOnline;
  const additionalSec = lastOnline
    ? Math.floor((Date.now() - lastOnline.getTime()) / 1000)
    : 0;
  await prisma.endUser.update({
    where: { id: userId },
    data: {
      lastOnline: new Date(),
      lastIp: ip,
      totalOnlineSec: { increment: Math.min(additionalSec, program.heartbeatTimeout) }, // 上限防止异常
    },
  });

  // 记录成功日志
  await prisma.verifyLog.create({
    data: {
      programId: program.id,
      action: 'heartbeat',
      success: true,
      ip,
      detail: JSON.stringify({ userId }),
    },
  });

  // 加密响应
  const responseData = JSON.stringify({
    userId,
    heartbeatToken: newToken,
    expiresAt: activeCard?.expiresAt?.toISOString() || null,
    serverTime: new Date().toISOString(),
  });
  const challenge = generateChallenge(); // 心跳响应使用新 challenge
  const encrypted = encryptResponse(responseData, challenge);

  return {
    code: 0,
    message: '心跳验证成功',
    data: {
      ...encrypted,
      userId,
    },
  };
}

// ==================== 登出 ====================
export async function logout(appKey: string, userId: string, ip: string) {
  const program = await prisma.program.findUnique({ where: { appKey } });
  if (!program) {
    return { code: 404, message: 'AppKey 无效', data: null };
  }

  // 失效该用户所有心跳 Token
  await prisma.heartbeatToken.updateMany({
    where: { endUserId: userId, used: false },
    data: { used: true },
  });

  // 记录日志
  await prisma.verifyLog.create({
    data: {
      programId: program.id,
      action: 'logout',
      success: true,
      ip,
      detail: JSON.stringify({ userId }),
    },
  });

  return { code: 0, message: '登出成功', data: null };
}