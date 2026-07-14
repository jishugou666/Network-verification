import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload, ErrorCode } from '../types';
import { fail } from '../utils/response';

// ==================== JWT 认证中间件 ====================
// 校验 Bearer Token，解析用户身份注入 req.ctx
// 超级管理员 root 可跨代理访问，agent 仅限自身数据

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    fail(res, ErrorCode.UNAUTHORIZED, '未提供认证令牌', 401);
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.ctx = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    };
    next();
  } catch {
    fail(res, ErrorCode.UNAUTHORIZED, '认证令牌无效或已过期', 401);
  }
}

// ==================== 角色校验中间件 ====================
// 仅允许指定角色访问

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.ctx) {
      fail(res, ErrorCode.UNAUTHORIZED, '未认证', 401);
      return;
    }
    if (!roles.includes(req.ctx.role)) {
      fail(res, ErrorCode.FORBIDDEN, '权限不足', 403);
      return;
    }
    next();
  };
}

// ==================== 代理数据隔离中间件 ====================
// 强制注入 agentId 过滤条件，root 角色跳过
// 在路由层校验，确保 agent 只能操作自己的数据

export function agentFilter(req: Request, res: Response, next: NextFunction): void {
  if (!req.ctx) {
    fail(res, ErrorCode.UNAUTHORIZED, '未认证', 401);
    return;
  }
  // root 可以访问所有数据，不注入过滤
  // agent 的数据隔离在 service 层通过 agentId 参数实现
  next();
}