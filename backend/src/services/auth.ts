import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { JwtPayload } from '../types';

// ==================== 密码哈希 ====================
const BCRYPT_ROUNDS = 12; // bcrypt 加盐轮数

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ==================== JWT ====================
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

// ==================== 登录 ====================
// 登录失败 5 次锁定 15 分钟

export async function login(username: string, password: string, ip: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return { code: 3001, message: '用户名或密码错误', data: null };
  }

  // 检查是否被锁定
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainSec = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
    return { code: 3002, message: `账号已锁定，请 ${remainSec} 秒后重试`, data: null };
  }

  // 检查是否被封禁
  if (user.status === 'banned') {
    return { code: 3002, message: '账号已被封禁', data: null };
  }

  // 验证密码
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const attempts = user.loginAttempts + 1;
    const updateData: any = { loginAttempts: attempts };
    // 5 次失败锁定 15 分钟
    if (attempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await prisma.user.update({ where: { id: user.id }, data: updateData });

    // 记录操作日志
    await prisma.operationLog.create({
      data: { userId: user.id, action: 'login_failed', ip, detail: JSON.stringify({ attempt: attempts }) },
    });

    return { code: 3001, message: '用户名或密码错误', data: null };
  }

  // 登录成功，重置失败计数
  await prisma.user.update({
    where: { id: user.id },
    data: { loginAttempts: 0, lockedUntil: null },
  });

  // 记录操作日志
  await prisma.operationLog.create({
    data: { userId: user.id, action: 'login_success', ip },
  });

  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role as 'root' | 'agent',
  });

  return {
    code: 0,
    message: '登录成功',
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    },
  };
}

// ==================== 注册（仅代理账号） ====================
export async function registerAgent(username: string, password: string, email?: string) {
  // 检查用户名唯一性
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { code: 409, message: '用户名已存在', data: null };
  }

  if (email) {
    const emailExist = await prisma.user.findUnique({ where: { email } });
    if (emailExist) {
      return { code: 409, message: '邮箱已被注册', data: null };
    }
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      email: email || null,
      role: 'agent',
    },
  });

  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: 'agent',
  });

  return {
    code: 0,
    message: '注册成功',
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    },
  };
}

// ==================== 获取当前用户信息 ====================
export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
  if (!user) {
    return { code: 404, message: '用户不存在', data: null };
  }
  return { code: 0, message: 'ok', data: user };
}

// ==================== 修改密码 ====================
export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { code: 404, message: '用户不存在', data: null };
  }

  const valid = await verifyPassword(oldPassword, user.passwordHash);
  if (!valid) {
    return { code: 3001, message: '原密码错误', data: null };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { code: 0, message: '密码修改成功', data: null };
}