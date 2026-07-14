const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

let authToken: string | null = null;

if (typeof window !== 'undefined') {
  authToken = localStorage.getItem('token');
}

export function setToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<{ code: number; message: string; data: T | null }> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const json = await res.json();
  return json;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: any) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Auth
export const authApi = {
  login: (username: string, password: string) => api.post<{ token: string; user: any }>('/auth/login', { username, password }),
  register: (username: string, password: string, email?: string) => api.post<{ token: string; user: any }>('/auth/register', { username, password, email }),
  getMe: () => api.get<any>('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) => api.put('/auth/password', { oldPassword, newPassword }),
};

// Programs
export const programApi = {
  list: (page = 1, pageSize = 20) => api.get<{ programs: any[]; total: number }>(`/programs?page=${page}&pageSize=${pageSize}`),
  get: (id: string) => api.get<any>(`/programs/${id}`),
  create: (data: any) => api.post<any>('/programs', data),
  update: (id: string, data: any) => api.put<any>(`/programs/${id}`, data),
  delete: (id: string) => api.delete(`/programs/${id}`),
  toggleStatus: (id: string, status: string) => api.put(`/programs/${id}/status`, { status }),
  getIntegration: (id: string) => api.get<any>(`/programs/${id}/integration`),
};

// Cards
export const cardApi = {
  list: (params: any = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get<{ cards: any[]; total: number }>(`/cards?${qs}`);
  },
  generate: (data: any) => api.post<{ cards: string[] }>('/cards/generate', data),
  ban: (cardIds: string[], reason?: string) => api.post('/cards/ban', { cardIds, reason }),
  delete: (cardIds: string[]) => api.post('/cards/delete', { cardIds }),
  extend: (cardIds: string[], extendDays: number) => api.post('/cards/extend', { cardIds, extendDays }),
  resetDevice: (id: string) => api.post(`/cards/${id}/reset-device`),
  getDetail: (id: string) => api.get<any>(`/cards/${id}`),
};

// Users
export const userApi = {
  listEndUsers: (params: any = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get<{ users: any[]; total: number }>(`/end-users?${qs}`);
  },
  getEndUser: (id: string) => api.get<any>(`/end-users/${id}`),
  banEndUser: (id: string, reason?: string) => api.post(`/end-users/${id}/ban`, { reason }),
  unbindDevice: (id: string) => api.delete(`/devices/${id}`),
  dashboard: () => api.get<any>('/dashboard'),
  listAgents: (params: any = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get<{ agents: any[]; total: number }>(`/agents?${qs}`);
  },
  toggleAgentStatus: (id: string) => api.post(`/agents/${id}/toggle-status`),
};