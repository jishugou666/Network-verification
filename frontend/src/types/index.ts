export interface User {
  id: string;
  username: string;
  email: string | null;
  role: 'root' | 'agent';
  status: string;
  createdAt: string;
}

export interface Program {
  id: string;
  agentId: string;
  name: string;
  slug: string;
  description: string | null;
  appKey: string;
  appSecretPreview: string;
  status: 'active' | 'disabled';
  maxDevices: number;
  allowReActivate: boolean;
  heartbeatTimeout: number;
  createdAt: string;
  updatedAt: string;
  _count?: { cardKeys: number; endUsers: number };
}

export interface CardKey {
  id: string;
  programId: string;
  cardPrefix: string | null;
  cardType: string;
  durationDays: number;
  status: string;
  note: string | null;
  generatedAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  endUserId: string | null;
  bannedAt: string | null;
  bannedReason: string | null;
  program?: { name: string; slug: string };
  endUser?: { username: string };
}

export interface EndUser {
  id: string;
  programId: string;
  username: string;
  status: string;
  firstActivated: string;
  lastOnline: string | null;
  totalOnlineSec: number;
  lastIp: string | null;
  program?: { name: string; slug: string };
  _count?: { devices: number; cardKeys: number };
  cardKeys?: CardKey[];
  devices?: Device[];
}

export interface Device {
  id: string;
  deviceFingerprint: string;
  deviceName: string | null;
  firstSeen: string;
  lastSeen: string;
  ip: string | null;
}

export interface Agent {
  id: string;
  username: string;
  email: string | null;
  status: string;
  createdAt: string;
  _count?: { programs: number; cardKeys: number };
}

export interface DashboardData {
  totalAgents?: number;
  totalPrograms?: number;
  todayVerifyCount?: number;
  activeEndUsers?: number;
  myPrograms?: number;
  totalCards?: number;
  todayActivated?: number;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
}