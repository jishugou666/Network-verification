import { prisma } from '../utils/prisma';

// ==================== 终端用户列表 ====================
// 三层权限隔离：agent 只能查看自己代理下的用户

export async function listEndUsers(
  agentId: string,
  role: string,
  params: {
    programId?: string;
    status?: string;
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
  if (params.search) {
    where.username = { contains: params.search };
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  const [users, total] = await Promise.all([
    prisma.endUser.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { firstActivated: 'desc' },
      select: {
        id: true,
        programId: true,
        username: true,
        status: true,
        firstActivated: true,
        lastOnline: true,
        totalOnlineSec: true,
        lastIp: true,
        bannedAt: true,
        bannedReason: true,
        program: { select: { name: true, slug: true } },
        _count: { select: { devices: true, cardKeys: true } },
      },
    }),
    prisma.endUser.count({ where }),
  ]);

  return { code: 0, message: 'ok', data: { users, total, page, pageSize } };
}

// ==================== 用户详情（含设备列表） ====================
export async function getEndUser(agentId: string, role: string, userId: string) {
  const where: any = { id: userId };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const user = await prisma.endUser.findUnique({
    where,
    select: {
      id: true,
      programId: true,
      username: true,
      status: true,
      firstActivated: true,
      lastOnline: true,
      totalOnlineSec: true,
      lastIp: true,
      bannedAt: true,
      bannedReason: true,
      program: { select: { name: true, slug: true } },
      cardKeys: {
        select: {
          id: true,
          cardPrefix: true,
          cardType: true,
          status: true,
          activatedAt: true,
          expiresAt: true,
        },
      },
      devices: {
        select: {
          id: true,
          deviceFingerprint: true,
          deviceName: true,
          firstSeen: true,
          lastSeen: true,
          ip: true,
        },
      },
    },
  });

  if (!user) {
    return { code: 404, message: '用户不存在或无权访问', data: null };
  }

  return { code: 0, message: 'ok', data: user };
}

// ==================== 封禁/解封用户 ====================
export async function banEndUser(agentId: string, role: string, userId: string, reason?: string) {
  const where: any = { id: userId };
  if (role !== 'root') {
    where.agentId = agentId;
  }

  const user = await prisma.endUser.findUnique({ where });
  if (!user) {
    return { code: 404, message: '用户不存在或无权操作', data: null };
  }

  const newStatus = user.status === 'banned' ? 'active' : 'banned';
  await prisma.endUser.update({
    where: { id: userId },
    data: {
      status: newStatus,
      bannedAt: newStatus === 'banned' ? new Date() : null,
      bannedReason: newStatus === 'banned' ? (reason || null) : null,
    },
  });

  // 如果封禁用户，同时失效所有心跳 Token
  if (newStatus === 'banned') {
    await prisma.heartbeatToken.updateMany({
      where: { endUserId: userId, used: false },
      data: { used: true },
    });
  }

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: newStatus === 'banned' ? 'ban_end_user' : 'unban_end_user',
      target: 'end_user',
      targetId: userId,
      detail: JSON.stringify({ reason }),
    },
  });

  return { code: 0, message: newStatus === 'banned' ? '用户已封禁' : '用户已解封', data: null };
}

// ==================== 远程解绑设备 ====================
export async function unbindDevice(agentId: string, role: string, deviceId: string) {
  // 三层权限隔离：先查设备归属的终端用户，再校验用户归属的代理
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: { endUser: { select: { agentId: true } } },
  });

  if (!device) {
    return { code: 404, message: '设备不存在', data: null };
  }

  if (role !== 'root' && device.endUser.agentId !== agentId) {
    return { code: 403, message: '无权操作此设备', data: null };
  }

  await prisma.device.delete({ where: { id: deviceId } });

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: 'unbind_device',
      target: 'device',
      targetId: deviceId,
      detail: JSON.stringify({ endUserId: device.endUserId }),
    },
  });

  return { code: 0, message: '设备已解绑', data: null };
}

// ==================== 仪表盘数据 ====================
export async function getDashboard(agentId: string, role: string) {
  if (role === 'root') {
    // 超级管理员：全平台概览
    const [totalAgents, totalPrograms, todayVerifyCount, activeEndUsers] = await Promise.all([
      prisma.user.count({ where: { role: 'agent' } }),
      prisma.program.count(),
      prisma.verifyLog.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          success: true,
        },
      }),
      // 在线用户：最近 5 分钟有心跳的用户
      prisma.endUser.count({
        where: {
          lastOnline: { gte: new Date(Date.now() - 5 * 60000) },
        },
      }),
    ]);

    return {
      code: 0,
      message: 'ok',
      data: { totalAgents, totalPrograms, todayVerifyCount, activeEndUsers },
    };
  }

  // 代理：仅自己的数据
  const [myPrograms, totalCards, todayActivated, activeEndUsers] = await Promise.all([
    prisma.program.count({ where: { agentId } }),
    prisma.cardKey.count({ where: { agentId } }),
    prisma.cardKey.count({
      where: {
        agentId,
        activatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.endUser.count({
      where: {
        agentId,
        lastOnline: { gte: new Date(Date.now() - 5 * 60000) },
      },
    }),
  ]);

  return {
    code: 0,
    message: 'ok',
    data: { myPrograms, totalCards, todayActivated, activeEndUsers },
  };
}

// ==================== 超级管理员：代理管理 ====================
export async function listAgents(params: { status?: string; page?: number; pageSize?: number }) {
  const where: any = { role: 'agent' };
  if (params.status) {
    where.status = params.status;
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  const [agents, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        createdAt: true,
        _count: { select: { programs: true, cardKeys: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { code: 0, message: 'ok', data: { agents, total, page, pageSize } };
}

// ==================== 超级管理员：封禁/解封代理 ====================
export async function toggleAgentStatus(agentId: string) {
  const agent = await prisma.user.findUnique({ where: { id: agentId } });
  if (!agent || agent.role === 'root') {
    return { code: 404, message: '代理不存在', data: null };
  }

  const newStatus = agent.status === 'banned' ? 'active' : 'banned';
  await prisma.user.update({ where: { id: agentId }, data: { status: newStatus } });

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      userId: agentId,
      action: newStatus === 'banned' ? 'ban_agent' : 'unban_agent',
      target: 'user',
      targetId: agentId,
    },
  });

  return { code: 0, message: newStatus === 'banned' ? '代理已封禁' : '代理已解封', data: null };
}