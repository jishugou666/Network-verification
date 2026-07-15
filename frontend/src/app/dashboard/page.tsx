'use client';

import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api';
import type { DashboardData } from '@/lib/types';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    userApi.dashboard()
      .then(res => {
        if (res.code === 0 && res.data) {
          setData(res.data as DashboardData);
        } else {
          setError(res.message || '加载失败');
        }
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const isRoot = data.totalAgents !== undefined;
  const stats = [
    { label: '程序总数', value: data.totalPrograms ?? data.myPrograms ?? 0, color: '#6366f1' },
    { label: '卡密总量', value: data.totalCards ?? 0, color: '#f59e0b' },
    { label: '今日激活', value: data.todayActivated ?? 0, color: '#10b981' },
    { label: '今日验证', value: data.todayVerifyCount ?? 0, color: '#3b82f6' },
    { label: '在线用户', value: data.activeEndUsers ?? 0, color: '#8b5cf6' },
  ];
  if (isRoot) {
    stats.unshift({ label: '代理总数', value: data.totalAgents ?? 0, color: '#ec4899' });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{Number(s.value).toLocaleString()}</p>
            <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: '40%', backgroundColor: s.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">数据分布</h3>
        <div className="flex items-end gap-6 h-40 px-4">
          {stats.map((s, i) => {
            const maxVal = Math.max(...stats.map(x => Number(x.value)), 1);
            const h = Math.max((Number(s.value) / maxVal) * 140, 4);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-600">{Number(s.value).toLocaleString()}</span>
                <div
                  className="w-full rounded-t-lg transition-all duration-500"
                  style={{ height: h, backgroundColor: s.color, opacity: 0.8 }}
                />
                <span className="text-xs text-gray-400">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">占比分析</h3>
        <div className="space-y-3">
          {stats.map((s, i) => {
            const total = stats.reduce((sum, x) => sum + Number(x.value), 0) || 1;
            const pct = Math.round((Number(s.value) / total) * 100);
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16">{s.label}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: s.color }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 w-12 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}