// ==================== 统一响应格式 ====================
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
}

// ==================== 错误码 ====================
export enum ErrorCode {
  SUCCESS = 0,
  // 通用错误
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_ERROR = 500,
  // 业务错误
  INVALID_INPUT = 1000,
  INVALID_SIGNATURE = 1001,
  TIMESTAMP_EXPIRED = 1002,
  NONCE_REUSED = 1003,
  INVALID_CARD = 2001,
  CARD_ALREADY_ACTIVATED = 2002,
  CARD_EXPIRED = 2003,
  CARD_BANNED = 2004,
  DEVICE_LIMIT_EXCEEDED = 2005,
  PROGRAM_DISABLED = 2006,
  USER_BANNED = 2007,
  HEARTBEAT_TOKEN_INVALID = 2008,
  CHALLENGE_FAILED = 2009,
  SCRIPT_NOT_ENABLED = 2010,
  CARD_NOT_BOUND = 2011,
  UNBIND_LIMIT_EXCEEDED = 2012,
  LOGIN_FAILED = 3001,
  ACCOUNT_LOCKED = 3002,
  DUPLICATE_SLUG = 4001,
}

// ==================== JWT Payload ====================
export interface JwtPayload {
  userId: string;
  username: string;
  role: 'root' | 'agent';
}

// ==================== 请求上下文（中间件注入） ====================
export interface RequestContext {
  userId: string;
  username: string;
  role: 'root' | 'agent';
}

// ==================== 卡密类型 ====================
export type CardType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'permanent' | 'custom';

// 卡密类型对应的天数
export const CARD_TYPE_DAYS: Record<CardType, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
  permanent: 0,
  custom: 0, // 自定义时由 durationDays 指定
};

// ==================== 请求体类型 ====================
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface CreateProgramRequest {
  name: string;
  slug: string;
  description?: string;
  maxDevices?: number;
  allowReActivate?: boolean;
  heartbeatTimeout?: number;
  announcement?: string;
}

export interface GenerateCardsRequest {
  programId: string;
  cardType: CardType;
  count: number;
  durationDays?: number; // 自定义时长
  prefix?: string;       // 卡密前缀
}

export interface ActivateRequest {
  appKey: string;
  cardKey: string;       // 卡密明文
  username: string;      // 终端用户自定义用户名
  hardwareInfo: string;  // 硬件信息 JSON 字符串
  timestamp: number;
  nonce: string;
  signature: string;
}

export interface ChallengeRequest {
  appKey: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

export interface VerifyRequest {
  appKey: string;
  userId: string;
  challengeResponse: string; // HMAC-SHA256(challenge + userId)
  timestamp: number;
  nonce: string;
  signature: string;
}

export interface HeartbeatRequest {
  appKey: string;
  userId: string;
  heartbeatToken: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

export interface LogoutRequest {
  appKey: string;
  userId: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

declare global {
  namespace Express {
    interface Request {
      ctx?: RequestContext;
    }
  }
}