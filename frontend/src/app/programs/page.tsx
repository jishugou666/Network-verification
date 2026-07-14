'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { programApi } from '@/lib/api';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', maxDevices: 3, allowReActivate: false, heartbeatTimeout: 120 });

  const fetchPrograms = () => {
    setLoading(true);
    programApi.list(page).then(res => {
      if (res.code === 0) { setPrograms(res.data!.programs); setTotal(res.data!.total); }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPrograms(); }, [page]);

  const handleCreate = async () => {
    if (!form.name || !form.slug) { toast.error('请填写名称和标识'); return; }
    const res = await programApi.create(form);
    if (res.code === 0) {
      toast.success('程序创建成功');
      setNewSecret(res.data!.appSecret);
      setShowCreate(false);
      setForm({ name: '', slug: '', description: '', maxDevices: 3, allowReActivate: false, heartbeatTimeout: 120 });
      fetchPrograms();
    } else {
      toast.error(res.message);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const res = await programApi.toggleStatus(id, newStatus);
    if (res.code === 0) { toast.success(res.message); fetchPrograms(); }
    else toast.error(res.message);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该程序？所有关联卡密和用户数据将被清除！')) return;
    const res = await programApi.delete(id);
    if (res.code === 0) { toast.success(res.message); fetchPrograms(); }
    else toast.error(res.message);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">程序管理</h1>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">创建程序</button>
      </div>

      {newSecret && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
          <p className="text-sm font-bold text-yellow-800">AppSecret（仅显示一次，请立即保存）</p>
          <code className="text-xs text-yellow-700 break-all">{newSecret}</code>
          <button onClick={() => setNewSecret(null)} className="block mt-2 text-sm text-blue-600">已保存，关闭</button>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">创建程序</h2>
            <input className="w-full border rounded px-3 py-2 mb-2 text-sm" placeholder="程序名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="w-full border rounded px-3 py-2 mb-2 text-sm" placeholder="唯一标识（英文）" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
            <textarea className="w-full border rounded px-3 py-2 mb-2 text-sm" placeholder="简介（选填）" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-gray-500">最大设备数</label>
                <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.maxDevices} onChange={e => setForm({ ...form, maxDevices: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">心跳超时(秒)</label>
                <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.heartbeatTimeout} onChange={e => setForm({ ...form, heartbeatTimeout: parseInt(e.target.value) || 60 })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm mb-4">
              <input type="checkbox" checked={form.allowReActivate} onChange={e => setForm({ ...form, allowReActivate: e.target.checked })} />
              允许卡密重复激活
            </label>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">确认创建</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 bg-gray-200 py-2 rounded-lg text-sm">取消</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3">名称</th>
              <th className="text-left px-4 py-3">标识</th>
              <th className="text-left px-4 py-3">AppKey</th>
              <th className="text-left px-4 py-3">状态</th>
              <th className="text-left px-4 py-3">卡密/用户</th>
              <th className="text-left px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {programs.map(p => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.slug}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.appKey}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.status === 'active' ? '启用' : '停用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{p._count?.cardKeys || 0} / {p._count?.endUsers || 0}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleStatus(p.id, p.status)} className="text-xs text-blue-600 hover:underline">
                      {p.status === 'active' ? '停用' : '启用'}
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:underline">删除</button>
                  </div>
                </td>
              </tr>
            ))}
            {programs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-50">上一页</button>
          <span className="px-3 py-1 text-sm text-gray-500">第 {page} 页</span>
          <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-50">下一页</button>
        </div>
      )}
    </div>
  );
}