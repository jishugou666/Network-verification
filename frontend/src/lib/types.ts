// ==================== 前端共享类型定义 ====================

export interface UserInfo {
  id: string;
  username: string;
  role: 'root' | 'agent';
  email?: string;
  status: string;
  createdAt: string;
}

export interface Program {
  id: string;
  name: string;
  slug: string;
  appKey: string;
  status: 'active' | 'disabled';
  description?: string;
  maxDevices: number;
  allowReActivate: boolean;
  heartbeatTimeout: number;
  scriptSize?: number;
  scriptPreview?: string;
  _count?: { cardKeys: number; endUsers: number };
}

export interface CardKey {
  id: string;
  cardPrefix?: string;
  cardPlain?: string;
  cardType: string;
  status: 'inactive' | 'active' | 'expired' | 'banned';
  generatedAt?: string;
  expiresAt?: string;
  unbindCount?: number;
  unbindMax?: number;
  program?: { name: string };
  endUser?: { username: string };
  endUserId?: string;
}

export interface EndUser {
  id: string;
  username: string;
  status: 'active' | 'banned';
  lastOnline?: string;
  lastIp?: string;
  totalOnlineSec: number;
  firstActivated?: string;
  _count?: { devices: number };
  program?: { name: string };
  cardKeys?: CardKey[];
  devices?: Device[];
}

export interface Device {
  id: string;
  deviceFingerprint: string;
  lastSeen: string;
  ip?: string;
}

export interface Agent {
  id: string;
  username: string;
  email?: string;
  status: 'active' | 'banned';
  createdAt: string;
  _count?: { programs: number; cardKeys: number };
}

export interface DashboardData {
  totalPrograms?: number;
  myPrograms?: number;
  totalCards?: number;
  todayActivated?: number;
  todayVerifyCount?: number;
  activeEndUsers?: number;
  totalAgents?: number;
}

export interface ApiResponse<T = null> {
  code: number;
  message: string;
  data: T | null;
}

export interface PaginatedList<T> {
  list: T[];
  total: number;
}