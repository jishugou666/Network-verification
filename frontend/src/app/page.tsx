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
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="glass-modal p-8 w-full max-w-md glass-enter">
        <h1 className="text-2xl font-bold text-center mb-2 glass-title">卡密验证系统</h1>
        <p className="text-center text-sm text-gray-400 mb-6">企业级软件授权管理平台</p>

        <div className="flex mb-6 glass-flat rounded-xl overflow-hidden p-1">
          <button
            className={`flex-1 py-2 text-sm rounded-lg transition-all ${mode === 'login' ? 'glass-btn-primary' : ''}`}
            onClick={() => setMode('login')}
          >登录</button>
          <button
            className={`flex-1 py-2 text-sm rounded-lg transition-all ${mode === 'register' ? 'glass-btn-primary' : ''}`}
            onClick={() => setMode('register')}
          >注册</button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="glass-input w-full mb-3"
            placeholder="用户名"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="glass-input w-full mb-3"
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {mode === 'register' && (
            <input
              className="glass-input w-full mb-3"
              placeholder="邮箱（选填）"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="glass-btn-primary w-full py-2.5 text-sm font-medium"
          >
            {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-5 text-center">
          {mode === 'login' ? '没有账号？' : '已有账号？'}
          <button
            className="text-blue-500 hover:underline ml-1"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? '注册成为代理' : '返回登录'}
          </button>
        </p>
      </div>
    </div>
  );
}