'use client';

import { useState, useEffect, useMemo } from 'react';
import { userApi } from '@/lib/api';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.dashboard().then(res => {
      if (res.code === 0) setData(res.data);
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

  // Mock chart data for visualization
  const chartBars = useMemo(() => {
    const total = stats.reduce((s, st) => s + st.value, 0) || 1;
    return stats.map(s => ({ label: s.label, value: s.value, color: s.color, pct: ((s.value / total) * 100 || 0) }));
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
                <p className="text-3xl font-bold text-gray-900 tabular-nums">{stat.value.toLocaleString()}</p>
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
            {/* 底部进度条 */}
            <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(chartBars[i]?.pct || 0, 100)}%`, backgroundColor: stat.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 柱状图 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-gray-800">数据分布</h3>
            <span className="text-xs text-gray-400">总览</span>
          </div>
          <BarChart data={chartBars} />
        </div>

        {/* 环形图 */}
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
                  <span className="font-medium text-gray-700">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 趋势区域 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-gray-800">活跃趋势</h3>
          <span className="text-xs text-gray-400">近 7 天</span>
        </div>
        <LineChart
          data={[
            { label: '周一', value: Math.floor((data?.todayVerifyCount || 0) * 0.6) },
            { label: '周二', value: Math.floor((data?.todayVerifyCount || 0) * 0.75) },
            { label: '周三', value: Math.floor((data?.todayVerifyCount || 0) * 0.9) },
            { label: '周四', value: Math.floor((data?.todayVerifyCount || 0) * 0.85) },
            { label: '周五', value: Math.floor((data?.todayVerifyCount || 0) * 1.0) },
            { label: '周六', value: Math.floor((data?.todayVerifyCount || 0) * 0.7) },
            { label: '周日', value: data?.todayVerifyCount ?? 0 },
          ]}
        />
      </div>
    </div>
  );
}

// ===== SVG 柱状图 =====
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const h = 160;
  const w = 400;
  const barW = Math.min(48, (w - 60) / data.length - 12);
  const gap = Math.max(8, (w - 60) / data.length - barW);

  return (
    <svg viewBox={`0 0 ${w} ${h + 40}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
        <g key={pct}>
          <line x1={40} y1={h - pct * h} x2={w - 10} y2={h - pct * h} stroke="#f1f5f9" strokeWidth={1} />
          <text x={34} y={h - pct * h + 4} textAnchor="end" className="text-[10px] fill-gray-400">{Math.round(maxVal * pct)}</text>
        </g>
      ))}
      {/* Bars */}
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * h;
        const x = 40 + i * (barW + gap) + gap / 2;
        const y = h - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color} fillOpacity={0.85}>
              <animate attributeName="height" from="0" to={barH} dur="0.6s" begin={`${i * 0.1}s`} fill="freeze" />
              <animate attributeName="y" from={h} to={y} dur="0.6s" begin={`${i * 0.1}s`} fill="freeze" />
            </rect>
            <text x={x + barW / 2} y={h + 20} textAnchor="middle" className="text-[10px] fill-gray-400">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ===== SVG 环形图 =====
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
    const len = pct * circumference;
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
          >
            <animate attributeName="stroke-dasharray" from={`0 ${circumference}`} to={`${arc.len} ${circumference - arc.len}`} dur="0.8s" begin={`${i * 0.15}s`} fill="freeze" />
          </circle>
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

// ===== SVG 折线图 =====
function LineChart({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const h = 100;
  const w = 500;
  const pad = 30;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - (d.value / maxVal) * (h - 20);
    return { x, y, ...d };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = pathD + ` L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full h-auto">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaD} fill="url(#areaGrad)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dasharray" from={`0 ${w * 2}`} to={`${w * 2} 0`} dur="1s" fill="freeze" />
      </path>
      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="white" stroke="#3b82f6" strokeWidth={2}>
            <animate attributeName="r" from="0" to="4" dur="0.3s" begin={`${i * 0.1 + 0.7}s`} fill="freeze" />
          </circle>
          <text x={p.x} y={h + 20} textAnchor="middle" className="text-[10px] fill-gray-400">{p.label}</text>
          <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[10px] fill-gray-500 font-medium">{p.value}</text>
        </g>
      ))}
    </svg>
  );
}