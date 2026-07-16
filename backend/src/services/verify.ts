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

  // 保存 challenge 用于激活时一次性消费（不记录日志，加速响应）
  await prisma.challenge.create({
    data: { programId: program.id, challenge },
  });

  return { code: 0, message: 'ok', data: { challenge } };
}

// ==================== 卡密激活（优化版） ====================
// 用户名 = 设备指纹 SHA-256，自动生成无需用户输入
// 同设备+有效期内可无数次重复登录（重新下发心跳Token）
// 异设备使用同一卡密则拒绝（除非 allowReActivate 开启）

export async function activateCard(
  appKey: string,
  cardKeyPlain: string,
  username: string, // 现在就是 deviceFingerprint
  hardwareInfo: string,
  challengeResponse: string,
  ip: string,
) {
  // 并行获取 program 和 deviceFingerprint
  const deviceFingerprint = hashDeviceFingerprint(hardwareInfo);

  const program = await prisma.program.findUnique({ where: { appKey } });
  if (!program) {
    return { code: 404, message: 'AppKey 无效', data: null };
  }
  if (program.status === 'disabled') {
    return { code: 2006, message: '程序已停用', data: null };
  }

  // 解密 AppSecret
  let appSecret: string;
  try {
    appSecret = aesDecrypt(program.appSecretEncrypted);
  } catch {
    return { code: 500, message: '服务端配置错误', data: null };
  }

  // 校验 challengeResponse
  const parts = challengeResponse.split(':');
  if (parts.length !== 2) {
    return { code: 2009, message: '挑战响应格式错误', data: null };
  }
  const [challenge, responseSig] = parts;
  const expectedData = challenge + cardKeyPlain + username;
  if (!hmacVerify(expectedData, responseSig, appSecret)) {
    return { code: 2009, message: '挑战响应校验失败', data: null };
  }

  // P1: 一次性 challenge — 验证 challenge 存在且未被消费
  const challengeRecord = await prisma.challenge.findUnique({ where: { challenge } });
  if (!challengeRecord) {
    return { code: 2009, message: '挑战不存在或已过期', data: null };
  }
  if (challengeRecord.used) {
    return { code: 2009, message: '挑战已被使用（重放攻击）', data: null };
  }
  // 检查过期（5分钟）
  if (challengeRecord.createdAt < new Date(Date.now() - 300000)) {
    return { code: 2009, message: '挑战已过期', data: null };
  }
  // 原子消费 challenge
  await prisma.challenge.update({ where: { id: challengeRecord.id }, data: { used: true } });

  // P1: 使用 HMAC 索引快速查找卡密，避免遍历所有 bcrypt 哈希
  const hmacIndex = hmacSign(cardKeyPlain, appSecret);
  const indexedCard = await prisma.cardKey.findFirst({
    where: { programId: program.id, cardHmacIndex: hmacIndex, status: { in: ['inactive', 'active'] } },
    select: { id: true, cardHash: true, status: true, endUserId: true, expiresAt: true, durationDays: true, activatedAt: true },
  });

  let matchedCard: typeof indexedCard | null = null;
  if (indexedCard) {
    // HMAC 命中后仍需 bcrypt 验证（防止 HMAC 碰撞）
    if (await bcrypt.compare(cardKeyPlain, indexedCard.cardHash)) {
      matchedCard = indexedCard;
    }
  }
  // 回退：如果 HMAC 索引未命中（旧数据无索引），遍历所有卡密
  if (!matchedCard) {
    const allCards = await prisma.cardKey.findMany({
      where: { programId: program.id, status: { in: ['inactive', 'active'] } },
      select: { id: true, cardHash: true, status: true, endUserId: true, expiresAt: true, durationDays: true, activatedAt: true },
    });
    for (const card of allCards) {
      if (await bcrypt.compare(cardKeyPlain, card.cardHash)) { matchedCard = card; break; }
    }
  }

  if (!matchedCard) {
    return { code: 2001, message: '卡密无效', data: null };
  }
  if (matchedCard.status === 'banned') {
    return { code: 2004, message: '卡密已被封禁', data: null };
  }

  // ===== 核心逻辑：同设备重复激活判断 =====
  if (matchedCard.status === 'active' && matchedCard.endUserId) {
    // 检查已绑定的 endUser 下是否有与当前 deviceFingerprint 匹配的设备
    const existingDevice = await prisma.device.findUnique({
      where: { endUserId_deviceFingerprint: { endUserId: matchedCard.endUserId, deviceFingerprint } },
    });

    if (existingDevice) {
      // ★ 同一设备回来：直接刷新 Token，不拒绝
      const endUser = await prisma.endUser.findUnique({ where: { id: matchedCard.endUserId } });
      if (!endUser || endUser.status === 'banned') {
        return { code: 2007, message: '用户已被封禁或不存在', data: null };
      }

      // 失效旧 Token，生成新 Token
      await prisma.heartbeatToken.updateMany({ where: { endUserId: matchedCard.endUserId, used: false }, data: { used: true } });

      const heartbeatToken = uuidv4();
      const expiresAt = matchedCard.durationDays > 0 ? new Date(Date.now() + matchedCard.durationDays * 86400000) : null;

      // 并行：更新卡密/设备/创建Token（绑定设备指纹+程序隔离）/更新用户
      await Promise.all([
        prisma.cardKey.update({ where: { id: matchedCard.id }, data: { expiresAt, activatedAt: new Date() } }),
        prisma.device.update({ where: { id: existingDevice.id }, data: { lastSeen: new Date(), ip } }),
        prisma.heartbeatToken.create({ data: { endUserId: matchedCard.endUserId, programId: program.id, token: heartbeatToken, deviceFingerprint, expiresAt: new Date(Date.now() + program.heartbeatTimeout * 1000) } }),
        prisma.endUser.update({ where: { id: matchedCard.endUserId }, data: { lastOnline: new Date(), lastIp: ip } }),
      ]);

      // 加密响应
      const activatedAt = matchedCard.activatedAt || new Date();
      const responseData = JSON.stringify({ userId: matchedCard.endUserId, username: endUser.username, heartbeatToken, expiresAt: expiresAt?.toISOString() || null, activatedAt: activatedAt instanceof Date ? activatedAt.toISOString() : new Date(activatedAt).toISOString(), maxDevices: program.maxDevices, deviceCount: 1 });
      const encrypted = encryptResponse(responseData, challenge);

      return { code: 0, message: '设备已绑定，登录成功', data: { ...encrypted, userId: matchedCard.endUserId } };
    }

    // 不同设备尝试使用同一卡密 → 拒绝
    if (!program.allowReActivate) {
      return { code: 2002, message: '卡密已被其他设备激活', data: null };
    }
    // allowReActivate：解绑旧用户
    await prisma.$transaction([
      prisma.heartbeatToken.updateMany({ where: { endUserId: matchedCard.endUserId, used: false }, data: { used: true } }),
      prisma.cardKey.update({ where: { id: matchedCard.id }, data: { endUserId: null, status: 'inactive' } }),
    ]);
  }

  // ===== 卡密过期检查 =====
  if (matchedCard.expiresAt && matchedCard.expiresAt < new Date()) {
    await prisma.cardKey.update({ where: { id: matchedCard.id }, data: { status: 'expired' } });
    return { code: 2003, message: '卡密已过期', data: null };
  }

  // ===== 新用户激活（卡密首次使用或被 allowReActivate 解绑后） =====
  // username 即 deviceFingerprint，查找是否已有同名 endUser
  let endUser = await prisma.endUser.findFirst({
    where: { programId: program.id, devices: { some: { deviceFingerprint } } },
    select: { id: true, status: true },
  });

  if (endUser) {
    if (endUser.status === 'banned') {
      return { code: 2007, message: '用户已被封禁', data: null };
    }
    // 更新用户最后在线
    await prisma.endUser.update({ where: { id: endUser.id }, data: { lastOnline: new Date(), lastIp: ip } });
  } else {
    endUser = await prisma.endUser.create({
      data: { agentId: program.agentId, programId: program.id, username: deviceFingerprint, lastOnline: new Date(), lastIp: ip },
    });
  }

  const expiresAt = matchedCard.expiresAt || (matchedCard.durationDays > 0 ? new Date(Date.now() + matchedCard.durationDays * 86400000) : null);
  const heartbeatToken = uuidv4();

  // 并行执行：更新卡密、绑定设备、创建Token（绑定设备指纹）
  await Promise.all([
    prisma.cardKey.update({ where: { id: matchedCard.id }, data: { status: 'active', endUserId: endUser.id, activatedAt: new Date(), expiresAt } }),
    prisma.device.upsert({
      where: { endUserId_deviceFingerprint: { endUserId: endUser.id, deviceFingerprint } },
      update: { lastSeen: new Date(), ip },
      create: { endUserId: endUser.id, programId: program.id, deviceFingerprint, lastSeen: new Date(), ip },
    }),
    prisma.heartbeatToken.create({ data: { endUserId: endUser.id, programId: program.id, token: heartbeatToken, deviceFingerprint, expiresAt: new Date(Date.now() + program.heartbeatTimeout * 1000) } }),
  ]);

  const responseData = JSON.stringify({ userId: endUser.id, username: deviceFingerprint, heartbeatToken, expiresAt: expiresAt?.toISOString() || null, activatedAt: new Date().toISOString(), maxDevices: program.maxDevices, deviceCount: 1 });
  const encrypted = encryptResponse(responseData, challenge);

  return { code: 0, message: '激活成功', data: { ...encrypted, userId: endUser.id } };
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

  // P0: 跨程序令牌隔离 — Token 必须属于当前请求的程序
  if (token.programId !== program.id) {
    await prisma.verifyLog.create({
      data: { programId: program.id, action: 'heartbeat', success: false, ip, detail: 'token_program_mismatch' },
    });
    return { code: 2008, message: '心跳 Token 与程序不匹配', data: null };
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

  // 生成新 Token（继承原 Token 的设备指纹绑定+程序隔离）
  const newToken = uuidv4();
  await prisma.heartbeatToken.create({
    data: {
      endUserId: userId,
      programId: program.id,
      token: newToken,
      deviceFingerprint: token.deviceFingerprint,
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
      challenge,
      userId,
    },
  };
}

// ==================== 加密脚本下发 ====================
// 客户端必须已激活且持有有效 heartbeatToken
// 脚本在 DB 中 AES-256-GCM 加密存储，下发时重新加密
export async function getEncryptedScript(appKey: string, userId: string, heartbeatToken: string) {
  const program = await prisma.program.findUnique({ where: { appKey } });
  if (!program) {
    return { code: 404, message: 'AppKey 无效', data: null };
  }
  if (program.status === 'disabled') {
    return { code: 2006, message: '程序已停用', data: null };
  }
  if (!program.scriptEnabled || !program.scriptEncrypted) {
    return { code: 2010, message: '该程序未启用脚本下发', data: null };
  }

  // 校验心跳 Token
  const token = await prisma.heartbeatToken.findUnique({ where: { token: heartbeatToken } });
  if (!token || token.used) {
    return { code: 2008, message: '心跳 Token 无效或已使用', data: null };
  }
  if (token.expiresAt < new Date()) {
    return { code: 2008, message: '心跳 Token 已过期', data: null };
  }
  if (token.endUserId !== userId) {
    return { code: 2008, message: '心跳 Token 与用户不匹配', data: null };
  }

  // P0: 跨程序令牌隔离
  if (token.programId !== program.id) {
    return { code: 2008, message: '心跳 Token 与程序不匹配', data: null };
  }

  // 检查用户是否被封禁
  const endUser = await prisma.endUser.findUnique({ where: { id: userId } });
  if (!endUser || endUser.status === 'banned') {
    return { code: 2007, message: '用户已被封禁或不存在', data: null };
  }

  // 从 DB 解密脚本明文（使用全局 AES 密钥）
  let plainScript: string;
  try {
    plainScript = aesDecrypt(program.scriptEncrypted);
  } catch {
    return { code: 500, message: '脚本解密失败', data: null };
  }

  // 生成新的 challenge 用于传输层加密
  const challenge = generateChallenge();
  const encrypted = encryptResponse(plainScript, challenge);

  // 记录日志
  await prisma.verifyLog.create({
    data: {
      programId: program.id,
      action: 'script_fetch',
      success: true,
      detail: JSON.stringify({ userId, scriptSize: program.scriptSize }),
    },
  });

  return {
    code: 0,
    message: 'ok',
    data: {
      ...encrypted,
      challenge,
      userId,
      scriptSize: program.scriptSize,
    },
  };
}

// ==================== 设备解绑 ====================
export async function unbindDevice(appKey: string, userId: string, heartbeatToken: string) {
  const program = await prisma.program.findUnique({ where: { appKey } });
  if (!program) return { code: 404, message: 'AppKey 无效', data: null };
  if (program.status === 'disabled') return { code: 2006, message: '程序已停用', data: null };

  const token = await prisma.heartbeatToken.findUnique({ where: { token: heartbeatToken } });
  if (!token || token.used || token.expiresAt < new Date()) return { code: 2008, message: 'Token 无效或已过期', data: null };
  if (token.endUserId !== userId) return { code: 2008, message: 'Token 与用户不匹配', data: null };
  // P0: 跨程序令牌隔离
  if (token.programId !== program.id) return { code: 2008, message: 'Token 与程序不匹配', data: null };

  const activeCard = await prisma.cardKey.findFirst({ where: { endUserId: userId, status: 'active' } });
  if (!activeCard) return { code: 2011, message: '未找到绑定卡密', data: null };
  if (activeCard.unbindCount >= activeCard.unbindMax) return { code: 2012, message: `解绑次数已达上限 (${activeCard.unbindMax}次)`, data: null };

  await prisma.$transaction([
    prisma.heartbeatToken.updateMany({ where: { endUserId: userId, used: false }, data: { used: true } }),
    prisma.cardKey.update({ where: { id: activeCard.id }, data: { endUserId: null, status: 'inactive', unbindCount: { increment: 1 } } }),
  ]);

  return { code: 0, message: `解绑成功（已用 ${activeCard.unbindCount + 1}/${activeCard.unbindMax} 次）`, data: { used: activeCard.unbindCount + 1, max: activeCard.unbindMax } };
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