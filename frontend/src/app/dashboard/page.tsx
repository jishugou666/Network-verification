'use client';

import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.dashboard().then(res => {
      if (res.code === 0) setData(res.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>;

  return (
    <div className="glass-enter">
      <h1 className="glass-title mb-6">仪表盘</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data?.totalAgents !== undefined && (
          <StatCard label="代理总数" value={data.totalAgents} color="blue" />
        )}
        {data?.totalPrograms !== undefined && (
          <StatCard label="程序总数" value={data.totalPrograms} color="purple" />
        )}
        {data?.myPrograms !== undefined && (
          <StatCard label="我的程序" value={data.myPrograms} color="indigo" />
        )}
        {data?.totalCards !== undefined && (
          <StatCard label="卡密总量" value={data.totalCards} color="orange" />
        )}
        {data?.todayActivated !== undefined && (
          <StatCard label="今日激活" value={data.todayActivated} color="green" />
        )}
        {data?.todayVerifyCount !== undefined && (
          <StatCard label="今日验证" value={data.todayVerifyCount} color="teal" />
        )}
        {data?.activeEndUsers !== undefined && (
          <StatCard label="在线用户" value={data.activeEndUsers} color="emerald" />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600', purple: 'text-purple-600', indigo: 'text-indigo-600',
    orange: 'text-orange-600', green: 'text-green-600', teal: 'text-teal-600', emerald: 'text-emerald-600',
  };
  return (
    <div className="glass p-5">
      <div className="text-sm text-gray-500 font-medium">{label}</div>
      <div className={`text-3xl font-bold mt-2 ${colorMap[color] || 'text-blue-600'}`}>{value}</div>
    </div>
  );
}