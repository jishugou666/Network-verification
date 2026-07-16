'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cardApi } from '@/lib/api';

const cardTypeLabels: Record<string, string> = {
  day: '天卡', week: '周卡', month: '月卡', quarter: '季卡', year: '年卡', permanent: '永久', custom: '自定义',
};

const statusColors: Record<string, string> = {
  inactive: 'bg-gray-100 text-gray-600', active: 'bg-green-100 text-green-700',
  expired: 'bg-yellow-100 text-yellow-700', banned: 'bg-red-100 text-red-700',
};

function formatDate(d: string | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}

function formatDuration(sec: number) {
  if (sec < 60) return `${sec}秒`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分钟`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}小时`;
  const days = Math.floor(hours / 24);
  return `${days}天 ${hours % 24}小时`;
}

interface IPLocation {
  ip: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
}

// IP 地理位置地图组件
function IPLocationMap({ ips }: { ips: string[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [locations, setLocations] = useState<IPLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const uniqueIps = [...new Set(ips.filter(ip => ip && ip !== '127.0.0.1' && ip !== '::1'))];
    if (uniqueIps.length === 0) { setLoading(false); return; }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    fetch(`${apiUrl}/geoip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ips: uniqueIps }),
    })
      .then(r => r.json())
      .then(res => {
        if (res.code === 0 && res.data) {
          const valid = res.data.filter((l: IPLocation) => l.lat !== 0 && l.lon !== 0);
          setLocations(valid);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ips]);

  // 初始化 Leaflet 地图
  useEffect(() => {
    if (locations.length === 0 || !mapContainerRef.current) return;

    // 动态加载 Leaflet
    const loadLeaflet = async () => {
      if (typeof window === 'undefined') return;
      // @ts-ignore
      if (window.L) {
        initMap();
        return;
      }

      // 加载 CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // 加载 JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (mapRef.current) return;
      // @ts-ignore
      const L = window.L;
      if (!L || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current).setView([locations[0].lat, locations[0].lon], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      locations.forEach(loc => {
        const marker = L.marker([loc.lat, loc.lon])
          .bindPopup(`<b>${loc.city}, ${loc.region}</b><br/>${loc.country}<br/><code>${loc.ip}</code>`)
          .addTo(map);
        bounds.extend(marker.getLatLng());
      });

      if (locations.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }

      mapRef.current = map;
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [locations]);

  if (loading) {
    return <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-400">正在获取位置信息...</span>
      </div>
    </div>;
  }

  if (locations.length === 0) {
    return <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 text-gray-400 text-sm">暂无有效位置数据</div>;
  }

  return (
    <div>
      <div ref={mapContainerRef} className="h-[300px] rounded-xl border border-gray-100 z-0" />
      <div className="flex flex-wrap gap-2 mt-3">
        {locations.map((loc, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {loc.city}, {loc.country}
            <code className="text-gray-400 ml-1">{loc.ip}</code>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cardApi.getDetail(params.id as string).then(res => {
      if (res.code === 0) {
        setData(res.data);
      }
    }).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-400 mb-4">卡密不存在或无权访问</p>
        <button onClick={() => router.back()} className="glass-btn">返回</button>
      </div>
    );
  }

  // 收集所有 IP 用于地图
  const allIps: string[] = [];
  if (data.endUser?.lastIp) allIps.push(data.endUser.lastIp);
  data.endUser?.devices?.forEach((d: any) => { if (d.ip) allIps.push(d.ip); });
  data.verifyLogs?.forEach((log: any) => { if (log.ip) allIps.push(log.ip); });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="glass-title">卡密详情</h1>
        <button onClick={() => router.back()} className="glass-btn">返回列表</button>
      </div>

      {/* Card Info */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">卡密信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">类型</span>
            <p className="font-medium">{cardTypeLabels[data.cardType] || data.cardType}</p>
          </div>
          <div>
            <span className="text-gray-500">状态</span>
            <p><span className={`glass-tag ${statusColors[data.status] || ''}`}>{data.status}</span></p>
          </div>
          <div>
            <span className="text-gray-500">时长</span>
            <p className="font-medium">{data.durationDays > 0 ? `${data.durationDays} 天` : '永久'}</p>
          </div>
          <div>
            <span className="text-gray-500">前缀</span>
            <p className="font-medium font-mono truncate">{data.cardPrefix || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">卡密明文</span>
            <p className="font-medium font-mono text-blue-700 text-xs break-all">{data.cardPlain || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">备注</span>
            <p className="font-medium truncate">{data.note || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">生成时间</span>
            <p className="font-medium text-xs">{formatDate(data.generatedAt)}</p>
          </div>
          <div>
            <span className="text-gray-500">激活时间</span>
            <p className="font-medium text-xs">{formatDate(data.activatedAt)}</p>
          </div>
          <div>
            <span className="text-gray-500">过期时间</span>
            <p className="font-medium text-xs">{formatDate(data.expiresAt)}</p>
          </div>
          <div>
            <span className="text-gray-500">封禁时间</span>
            <p className="font-medium text-xs">{formatDate(data.bannedAt)}</p>
          </div>
          <div>
            <span className="text-gray-500">封禁原因</span>
            <p className="font-medium truncate">{data.bannedReason || '-'}</p>
          </div>
        </div>
      </div>

      {/* Program Info */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">所属程序</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">程序名称</span>
            <p className="font-medium">{data.program?.name || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">Slug</span>
            <p className="font-medium font-mono text-xs">{data.program?.slug || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">AppKey</span>
            <p className="font-medium font-mono text-xs text-blue-700 break-all">{data.program?.appKey || '-'}</p>
          </div>
        </div>
      </div>

      {/* End User Info */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">绑定用户</h2>
        {data.endUser ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">用户名</span>
              <p className="font-medium font-mono text-xs truncate max-w-[180px]" title={data.endUser.username}>{data.endUser.username}</p>
            </div>
            <div>
              <span className="text-gray-500">状态</span>
              <p><span className={`glass-tag ${data.endUser.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{data.endUser.status}</span></p>
            </div>
            <div>
              <span className="text-gray-500">最后 IP</span>
              <p className="font-medium font-mono text-xs">{data.endUser.lastIp || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">累计在线</span>
              <p className="font-medium">{formatDuration(data.endUser.totalOnlineSec)}</p>
            </div>
            <div>
              <span className="text-gray-500">最后在线</span>
              <p className="font-medium text-xs">{formatDate(data.endUser.lastOnline)}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">未绑定用户</p>
        )}
      </div>

      {/* Login Location Map */}
      {allIps.length > 0 && (
        <div className="glass p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">登录位置</h2>
          <IPLocationMap ips={allIps} />
        </div>
      )}

      {/* Devices */}
      <div className="glass-table">
        <h2 className="text-lg font-semibold px-6 pt-4 mb-2 text-gray-800">绑定设备</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-6 py-3">设备指纹</th>
              <th className="text-left px-6 py-3">设备名称</th>
              <th className="text-left px-6 py-3">首次出现</th>
              <th className="text-left px-6 py-3">最后出现</th>
              <th className="text-left px-6 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {data.endUser?.devices?.map((d: any) => (
              <tr key={d.id}>
                <td className="px-6 py-3 font-mono text-xs text-gray-600 truncate max-w-[200px]" title={d.deviceFingerprint}>{d.deviceFingerprint.slice(0, 24)}...</td>
                <td className="px-6 py-3">{d.deviceName || '-'}</td>
                <td className="px-6 py-3 text-xs text-gray-500">{formatDate(d.firstSeen)}</td>
                <td className="px-6 py-3 text-xs text-gray-500">{formatDate(d.lastSeen)}</td>
                <td className="px-6 py-3 font-mono text-xs">{d.ip || '-'}</td>
              </tr>
            ))}
            {(!data.endUser?.devices || data.endUser.devices.length === 0) && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">暂无绑定设备</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Verify Logs */}
      <div className="glass-table">
        <h2 className="text-lg font-semibold px-6 pt-4 mb-2 text-gray-800">验证日志</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-6 py-3">操作</th>
              <th className="text-left px-6 py-3">结果</th>
              <th className="text-left px-6 py-3">详情</th>
              <th className="text-left px-6 py-3">IP</th>
              <th className="text-left px-6 py-3">时间</th>
            </tr>
          </thead>
          <tbody>
            {data.verifyLogs?.map((log: any, i: number) => (
              <tr key={i}>
                <td className="px-6 py-3">
                  <span className="glass-tag">{log.action}</span>
                </td>
                <td className="px-6 py-3">
                  <span className={`glass-tag ${log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {log.success ? '成功' : '失败'}
                  </span>
                </td>
                <td className="px-6 py-3 text-xs text-gray-500 max-w-xs truncate">{log.detail || '-'}</td>
                <td className="px-6 py-3 font-mono text-xs">{log.ip || '-'}</td>
                <td className="px-6 py-3 text-xs text-gray-500">{formatDate(log.createdAt)}</td>
              </tr>
            ))}
            {(!data.verifyLogs || data.verifyLogs.length === 0) && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">暂无验证日志</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}