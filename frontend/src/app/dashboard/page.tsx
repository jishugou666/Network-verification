'use client';

import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');

  useEffect(() => {
    userApi.dashboard().then(res => {
      if (res.code === 0) setData(res.data);
    }).finally(() => setLoading(false));
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    setRole(user.role || '');
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">仪表盘</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data?.totalAgents !== undefined && (
          <StatCard label="代理总数" value={data.totalAgents} />
        )}
        {data?.totalPrograms !== undefined && (
          <StatCard label="程序总数" value={data.totalPrograms} />
        )}
        {data?.myPrograms !== undefined && (
          <StatCard label="我的程序" value={data.myPrograms} />
        )}
        {data?.totalCards !== undefined && (
          <StatCard label="卡密总量" value={data.totalCards} />
        )}
        {data?.todayActivated !== undefined && (
          <StatCard label="今日激活" value={data.todayActivated} />
        )}
        {data?.todayVerifyCount !== undefined && (
          <StatCard label="今日验证" value={data.todayVerifyCount} />
        )}
        {data?.activeEndUsers !== undefined && (
          <StatCard label="在线用户" value={data.activeEndUsers} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-blue-600 mt-1">{value}</div>
    </div>
  );
}