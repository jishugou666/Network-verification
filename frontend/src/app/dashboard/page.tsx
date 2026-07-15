'use client';

import { useState, useEffect, useMemo } from 'react';
import { userApi } from '@/lib/api';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userApi.dashboard().then(res => {
      if (res.code === 0 && res.data) {
        setData(res.data);
      } else {
        setError(res.message || '加载失败');
      }
    }).catch(() => {
      setError('网络错误，请刷新重试');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">加载数据中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <span className="text-sm text-red-500">{error}</span>
          <button onClick={() => window.location.reload()} className="text-sm text-blue-500 hover:text-blue-600 underline">
            刷新页面
          </button>
        </div>
      </div>
    );
  }

  const hasRootData = data?.totalAgents !== undefined;
  const stats = [
    { label: '程序总数', value: data?.totalPrograms ?? data?.myPrograms ?? 0, color: '#6366f1', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    { label: '卡密总量', value: data?.totalCards ?? 0, color: '#f59e0b', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
    { label: '今日激活', value: data?.todayActivated ?? 0, color: '#10b981', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: '今日验证', value: data?.todayVerifyCount ?? 0, color: '#3b82f6', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  if (hasRootData) {
    stats.unshift({ label: '代理总数', value: data?.totalAgents ?? 0, color: '#8b5cf6', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' });
  }

  const chartBars = useMemo(() => {
    const total = stats.reduce((s, st) => s + st.value, 0) || 1;
    return stats.map(s => ({
      label: s.label,
      value: s.value,
      color: s.color,
      pct: Math.min((s.value / total) * 100, 100),
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
          <p className="text-sm text-gray-500 mt-1">数据概览与业务趋势</p>
        </div>
        <div className="text-xs text-gray-400">
          更新于 {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="group relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 tabular-nums">{Number(stat.value).toLocaleString()}</p>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                style={{ backgroundColor: stat.color + '15', color: stat.color }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
            </div>
            <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${chartBars[i]?.pct ?? 0}%`,
                  backgroundColor: stat.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-gray-800">数据分布</h3>
            <span className="text-xs text-gray-400">总览</span>
          </div>
          <BarChart data={chartBars} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-gray-800">占比分析</h3>
            <span className="text-xs text-gray-400">今日</span>
          </div>
          <div className="flex items-center gap-8">
            <DonutChart segments={chartBars} />
            <div className="space-y-3 flex-1">
              {chartBars.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-500 flex-1">{item.label}</span>
                  <span className="font-medium text-gray-700">{Number(item.value).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 活跃趋势 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-gray-800">活跃趋势</h3>
          <span className="text-xs text-gray-400">今日</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {[
            { label: '程序', value: data?.totalPrograms ?? data?.myPrograms ?? 0, color: '#6366f1' },
            { label: '卡密', value: data?.totalCards ?? 0, color: '#f59e0b' },
            { label: '激活', value: data?.todayActivated ?? 0, color: '#10b981' },
            { label: '验证', value: data?.todayVerifyCount ?? 0, color: '#3b82f6' },
            { label: '在线', value: data?.activeEndUsers ?? 0, color: '#8b5cf6' },
            { label: '代理', value: data?.totalAgents ?? 0, color: '#ec4899' },
            { label: '设备', value: data?.totalDevices ?? 0, color: '#14b8a6' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-bold text-gray-900 tabular-nums">{Number(item.value).toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">{item.label}</div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: '100%',
                    backgroundColor: item.color,
                    opacity: item.value > 0 ? 0.8 : 0.2,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== SVG 柱状图（无动画，纯静态） =====
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const h = 160;
  const w = 400;
  const count = data.length;
  const barW = Math.min(48, (w - 60) / count - 12);
  const gap = Math.max(8, (w - 60) / count - barW);

  if (count === 0) return null;

  return (
    <svg viewBox={`0 0 ${w} ${h + 40}`} className="w-full h-auto">
      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
        <g key={pct}>
          <line x1={40} y1={h - pct * h} x2={w - 10} y2={h - pct * h} stroke="#f1f5f9" strokeWidth={1} />
          <text x={34} y={h - pct * h + 4} textAnchor="end" fill="#9ca3af" fontSize="10">{Math.round(maxVal * pct)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const barH = Math.max((d.value / maxVal) * h, 2);
        const x = 40 + i * (barW + gap) + gap / 2;
        const y = h - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color} fillOpacity={0.85} />
            <text x={x + barW / 2} y={h + 20} textAnchor="middle" fill="#9ca3af" fontSize="10">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ===== SVG 环形图（无动画） =====
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const size = 120;
  const radius = 50;
  const strokeW = 12;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = segments.map(seg => {
    const pct = seg.value / total;
    const len = Math.max(pct * circumference, 0);
    const arc = { ...seg, len, offset };
    offset += len;
    return arc;
  });

  return (
    <div className="relative flex-shrink-0">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${arc.len} ${circumference - arc.len}`}
            strokeDashoffset={-arc.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{total.toLocaleString()}</div>
          <div className="text-[10px] text-gray-400">总计</div>
        </div>
      </div>
    </div>
  );
}