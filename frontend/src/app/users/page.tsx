'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { userApi, programApi } from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<any[]>([]);
  const [filterProgramId, setFilterProgramId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [detailUser, setDetailUser] = useState<any>(null);

  const fetchUsers = () => {
    setLoading(true);
    const params: any = { page, pageSize: 20 };
    if (filterProgramId) params.programId = filterProgramId;
    if (filterStatus) params.status = filterStatus;
    userApi.listEndUsers(params).then(res => {
      if (res.code === 0) { setUsers(res.data!.users); setTotal(res.data!.total); }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    programApi.list(1, 100).then(res => {
      if (res.code === 0) setPrograms(res.data!.programs);
    });
  }, []);

  useEffect(() => { fetchUsers(); }, [page, filterProgramId, filterStatus]);

  const handleBan = async (id: string) => {
    const reason = prompt('封禁原因（选填）：');
    const res = await userApi.banEndUser(id, reason || undefined);
    if (res.code === 0) { toast.success(res.message); fetchUsers(); }
    else toast.error(res.message);
  };

  const handleViewDetail = async (id: string) => {
    const res = await userApi.getEndUser(id);
    if (res.code === 0) setDetailUser(res.data);
    else toast.error(res.message);
  };

  const handleUnbindDevice = async (deviceId: string) => {
    if (!confirm('确定解绑该设备？')) return;
    const res = await userApi.unbindDevice(deviceId);
    if (res.code === 0) { toast.success(res.message); handleViewDetail(detailUser.id); }
    else toast.error(res.message);
  };

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}时${m}分`;
  };

  return (
    <div className="glass-enter">
      <h1 className="glass-title mb-6">用户管理</h1>

      <div className="flex gap-2 mb-4">
        <select className="glass-select" value={filterProgramId} onChange={e => setFilterProgramId(e.target.value)}>
          <option value="">全部程序</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="glass-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="banned">已封禁</option>
        </select>
      </div>

      <div className="glass-table">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-4 py-3">用户名</th>
              <th className="text-left px-4 py-3">程序</th>
              <th className="text-left px-4 py-3">状态</th>
              <th className="text-left px-4 py-3">设备数</th>
              <th className="text-left px-4 py-3">累计在线</th>
              <th className="text-left px-4 py-3">最后在线</th>
              <th className="text-left px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3 text-gray-500">{u.program?.name || '-'}</td>
                <td className="px-4 py-3">
                  <span className="glass-tag" style={{color: u.status === 'active' ? '#16a34a' : '#dc2626'}}>
                    {u.status === 'active' ? '正常' : '已封禁'}
                  </span>
                </td>
                <td className="px-4 py-3">{u._count?.devices || 0}</td>
                <td className="px-4 py-3 text-gray-500">{formatDuration(u.totalOnlineSec)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.lastOnline ? new Date(u.lastOnline).toLocaleString() : '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleViewDetail(u.id)} className="text-xs text-blue-600 hover:underline">详情</button>
                    <button onClick={() => handleBan(u.id)} className="text-xs text-red-500 hover:underline">
                      {u.status === 'banned' ? '解封' : '封禁'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="glass-btn disabled:opacity-50">上一页</button>
          <span className="px-3 py-1 text-sm text-gray-500 self-center">第 {page} 页</span>
          <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="glass-btn disabled:opacity-50">下一页</button>
        </div>
      )}

      {detailUser && (
        <div className="glass-modal-overlay fixed inset-0 flex items-center justify-center z-50">
          <div className="glass-modal p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">用户详情</h2>
            <div className="space-y-2 text-sm mb-4">
              <p><span className="text-gray-500">用户名：</span>{detailUser.username}</p>
              <p><span className="text-gray-500">程序：</span>{detailUser.program?.name}</p>
              <p><span className="text-gray-500">状态：</span>{detailUser.status}</p>
              <p><span className="text-gray-500">首次激活：</span>{new Date(detailUser.firstActivated).toLocaleString()}</p>
              <p><span className="text-gray-500">累计在线：</span>{formatDuration(detailUser.totalOnlineSec)}</p>
              <p><span className="text-gray-500">最后 IP：</span>{detailUser.lastIp || '-'}</p>
            </div>

            <h3 className="font-bold text-sm mb-2">绑定卡密</h3>
            {detailUser.cardKeys?.length > 0 ? (
              <div className="space-y-1 mb-4">
                {detailUser.cardKeys.map((c: any) => (
                  <div key={c.id} className="text-xs glass-flat rounded-lg p-2">
                    <span>{c.cardPrefix || '-'}</span>
                    <span className="ml-2 text-gray-500">{c.cardType}</span>
                    <span className="ml-2 glass-tag">{c.status}</span>
                    {c.expiresAt && <span className="ml-2 text-gray-400">过期: {new Date(c.expiresAt).toLocaleDateString()}</span>}
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 mb-4">无绑定卡密</p>}

            <h3 className="font-bold text-sm mb-2">设备列表</h3>
            {detailUser.devices?.length > 0 ? (
              <div className="space-y-1 mb-4">
                {detailUser.devices.map((d: any) => (
                  <div key={d.id} className="text-xs glass-flat rounded-lg p-2 flex justify-between items-center">
                    <div>
                      <code className="text-gray-600">{d.deviceFingerprint.slice(0, 32)}...</code>
                      <span className="ml-2 text-gray-400">最后: {new Date(d.lastSeen).toLocaleString()}</span>
                    </div>
                    <button onClick={() => handleUnbindDevice(d.id)} className="text-red-500 hover:underline">解绑</button>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 mb-4">无设备</p>}

            <button onClick={() => setDetailUser(null)} className="glass-btn w-full">关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}