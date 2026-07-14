'use client';

import { useState, useEffect } from 'react';
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
            <p className="font-medium font-mono">{data.cardPrefix || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">卡密明文</span>
            <p className="font-medium font-mono text-blue-700 text-xs break-all">{data.cardPlain || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">备注</span>
            <p className="font-medium">{data.note || '-'}</p>
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
            <p className="font-medium">{data.bannedReason || '-'}</p>
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
              <p className="font-medium">{data.endUser.username}</p>
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
                <td className="px-6 py-3 font-mono text-xs text-gray-600 break-all">{d.deviceFingerprint}</td>
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