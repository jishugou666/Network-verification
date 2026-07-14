'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { cardApi, programApi } from '@/lib/api';

export default function CardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showGenerate, setShowGenerate] = useState(false);
  const [genResult, setGenResult] = useState<string[] | null>(null);
  const [genForm, setGenForm] = useState({ programId: '', cardType: 'day', count: 10, durationDays: 30, prefix: '' });
  const [filterProgramId, setFilterProgramId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchCards = () => {
    setLoading(true);
    const params: any = { page, pageSize: 20 };
    if (filterProgramId) params.programId = filterProgramId;
    if (filterStatus) params.status = filterStatus;
    cardApi.list(params).then(res => {
      if (res.code === 0) { setCards(res.data!.cards); setTotal(res.data!.total); }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    programApi.list(1, 100).then(res => {
      if (res.code === 0) setPrograms(res.data!.programs);
    });
  }, []);

  useEffect(() => { fetchCards(); }, [page, filterProgramId, filterStatus]);

  const handleGenerate = async () => {
    if (!genForm.programId) { toast.error('请选择程序'); return; }
    const res = await cardApi.generate(genForm);
    if (res.code === 0) {
      toast.success(res.message);
      setGenResult(res.data!.cards);
      fetchCards();
    } else {
      toast.error(res.message);
    }
  };

  const handleBan = async () => {
    if (selected.size === 0) { toast.error('请选择卡密'); return; }
    const res = await cardApi.ban(Array.from(selected));
    if (res.code === 0) { toast.success(res.message); setSelected(new Set()); fetchCards(); }
    else toast.error(res.message);
  };

  const handleDelete = async () => {
    if (selected.size === 0) { toast.error('请选择卡密'); return; }
    if (!confirm(`确定删除 ${selected.size} 张卡密？`)) return;
    const res = await cardApi.delete(Array.from(selected));
    if (res.code === 0) { toast.success(res.message); setSelected(new Set()); fetchCards(); }
    else toast.error(res.message);
  };

  const handleExtend = async () => {
    if (selected.size === 0) { toast.error('请选择卡密'); return; }
    const days = prompt('延期天数：');
    if (!days || isNaN(Number(days))) return;
    const res = await cardApi.extend(Array.from(selected), parseInt(days));
    if (res.code === 0) { toast.success(res.message); setSelected(new Set()); fetchCards(); }
    else toast.error(res.message);
  };

  const handleExport = async () => {
    if (!filterProgramId) { toast.error('请先选择程序筛选'); return; }
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/cards/export/${filterProgramId}?format=txt`, '_blank');
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === cards.length) setSelected(new Set());
    else setSelected(new Set(cards.map(c => c.id)));
  };

  const cardTypeLabels: Record<string, string> = {
    day: '天卡', week: '周卡', month: '月卡', quarter: '季卡', year: '年卡', permanent: '永久', custom: '自定义',
  };

  const statusColors: Record<string, string> = {
    inactive: 'bg-gray-100 text-gray-600', active: 'bg-green-100 text-green-700',
    expired: 'bg-yellow-100 text-yellow-700', banned: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">卡密管理</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowGenerate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">生成卡密</button>
          <button onClick={handleBan} className="bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-yellow-600">封禁</button>
          <button onClick={handleDelete} className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-600">删除</button>
          <button onClick={handleExtend} className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-600">延期</button>
          <button onClick={handleExport} className="bg-gray-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-600">导出</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <select className="border rounded px-3 py-2 text-sm" value={filterProgramId} onChange={e => setFilterProgramId(e.target.value)}>
          <option value="">全部程序</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="border rounded px-3 py-2 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="inactive">未激活</option>
          <option value="active">已激活</option>
          <option value="expired">已过期</option>
          <option value="banned">已封禁</option>
        </select>
      </div>

      {genResult && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4">
          <p className="text-sm font-bold text-green-800 mb-2">卡密生成成功（仅显示一次，请立即保存）</p>
          <div className="max-h-40 overflow-y-auto">
            {genResult.map((c, i) => <code key={i} className="block text-xs text-green-700">{c}</code>)}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => navigator.clipboard.writeText(genResult.join('\n'))} className="text-sm text-blue-600">复制全部</button>
            <button onClick={() => setGenResult(null)} className="text-sm text-gray-500">关闭</button>
          </div>
        </div>
      )}

      {showGenerate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">生成卡密</h2>
            <select className="w-full border rounded px-3 py-2 mb-2 text-sm" value={genForm.programId} onChange={e => setGenForm({ ...genForm, programId: e.target.value })}>
              <option value="">选择程序</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="w-full border rounded px-3 py-2 mb-2 text-sm" value={genForm.cardType} onChange={e => setGenForm({ ...genForm, cardType: e.target.value })}>
              {Object.entries(cardTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {genForm.cardType === 'custom' && (
              <input type="number" className="w-full border rounded px-3 py-2 mb-2 text-sm" placeholder="自定义天数" value={genForm.durationDays} onChange={e => setGenForm({ ...genForm, durationDays: parseInt(e.target.value) || 1 })} />
            )}
            <input type="number" className="w-full border rounded px-3 py-2 mb-2 text-sm" placeholder="生成数量" value={genForm.count} onChange={e => setGenForm({ ...genForm, count: parseInt(e.target.value) || 1 })} />
            <input className="w-full border rounded px-3 py-2 mb-2 text-sm" placeholder="卡密前缀（选填）" value={genForm.prefix} onChange={e => setGenForm({ ...genForm, prefix: e.target.value })} />
            <div className="flex gap-2">
              <button onClick={handleGenerate} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">确认生成</button>
              <button onClick={() => setShowGenerate(false)} className="flex-1 bg-gray-200 py-2 rounded-lg text-sm">取消</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3"><input type="checkbox" checked={selected.size === cards.length && cards.length > 0} onChange={toggleAll} /></th>
              <th className="text-left px-4 py-3">前缀</th>
              <th className="text-left px-4 py-3">类型</th>
              <th className="text-left px-4 py-3">状态</th>
              <th className="text-left px-4 py-3">程序</th>
              <th className="text-left px-4 py-3">绑定用户</th>
              <th className="text-left px-4 py-3">生成时间</th>
              <th className="text-left px-4 py-3">过期时间</th>
            </tr>
          </thead>
          <tbody>
            {cards.map(c => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                <td className="px-4 py-3 font-mono text-xs">{c.cardPrefix || '-'}</td>
                <td className="px-4 py-3">{cardTypeLabels[c.cardType] || c.cardType}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${statusColors[c.status] || ''}`}>{c.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{c.program?.name || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{c.endUser?.username || '-'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{c.generatedAt ? new Date(c.generatedAt).toLocaleString() : '-'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
            {cards.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
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