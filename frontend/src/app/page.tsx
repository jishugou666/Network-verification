'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { setToken, authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { toast.error('请填写用户名和密码'); return; }
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await authApi.login(username, password)
        : await authApi.register(username, password, email || undefined);
      if (res.code === 0 && res.data) {
        setToken(res.data.token);
        toast.success(mode === 'login' ? '登录成功' : '注册成功');
        router.push('/dashboard');
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">卡密验证系统</h1>
        <div className="flex mb-6 border rounded-lg overflow-hidden">
          <button
            className={`flex-1 py-2 text-sm ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            onClick={() => setMode('login')}
          >登录</button>
          <button
            className={`flex-1 py-2 text-sm ${mode === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            onClick={() => setMode('register')}
          >注册</button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            className="w-full border rounded-lg px-3 py-2 mb-3 text-sm"
            placeholder="用户名"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2 mb-3 text-sm"
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {mode === 'register' && (
            <input
              className="w-full border rounded-lg px-3 py-2 mb-3 text-sm"
              placeholder="邮箱（选填）"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-4 text-center">
          {mode === 'login' ? '没有账号？点击注册成为代理' : '已有账号？点击登录'}
        </p>
      </div>
    </div>
  );
}