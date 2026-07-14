'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { userApi } from '@/lib/api';

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchAgents = () => {
    setLoading(true);
    userApi.listAgents({ page, pageSize: 20 }).then(res => {
      if (res.code === 0) { setAgents(res.data!.agents); setTotal(res.data!.total); }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAgents(); }, [page]);

  const handleToggleStatus = async (id: string) => {
    const res = await userApi.toggleAgentStatus(id);
    if (res.code === 0) { toast.success(res.message); fetchAgents(); }
    else toast.error(res.message);
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">代理管理</h1>

      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3">用户名</th>
              <th className="text-left px-4 py-3">邮箱</th>
              <th className="text-left px-4 py-3">状态</th>
              <th className="text-left px-4 py-3">程序数</th>
              <th className="text-left px-4 py-3">卡密数</th>
              <th className="text-left px-4 py-3">注册时间</th>
              <th className="text-left px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-3 font-medium">{a.username}</td>
                <td className="px-4 py-3 text-gray-500">{a.email || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {a.status === 'active' ? '正常' : '已封禁'}
                  </span>
                </td>
                <td className="px-4 py-3">{a._count?.programs || 0}</td>
                <td className="px-4 py-3">{a._count?.cardKeys || 0}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggleStatus(a.id)} className="text-xs text-red-500 hover:underline">
                    {a.status === 'banned' ? '解封' : '封禁'}
                  </button>
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
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