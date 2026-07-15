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
    <div className="min-h-screen flex">
      {/* ===== 左侧登录面板 ===== */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-8 py-12 relative z-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 mb-4">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CDK 授权管理</h1>
            <p className="text-sm text-gray-500 mt-1">安全、高效的软件授权解决方案</p>
          </div>

          {/* 登录/注册切换 */}
          <div className="flex mb-6 bg-gray-100/80 rounded-xl p-1">
            <button
              className={`flex-1 py-2.5 text-sm rounded-lg font-medium transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setMode('login')}
            >登录</button>
            <button
              className={`flex-1 py-2.5 text-sm rounded-lg font-medium transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setMode('register')}
            >注册</button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">用户名</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-50 focus:bg-white"
                placeholder="请输入用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">密码</label>
              <input
                type="password"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-50 focus:bg-white"
                placeholder="请输入密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">邮箱（选填）</label>
                <input
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-50 focus:bg-white"
                  placeholder="请输入邮箱"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  处理中...
                </span>
              ) : (mode === 'login' ? '登录' : '注册账号')}
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-6 text-center">
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <button
              className="text-blue-500 hover:text-blue-600 font-medium ml-1"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? '立即注册' : '返回登录'}
            </button>
          </p>
        </div>
      </div>

      {/* ===== 右侧展示面板 ===== */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-gradient-to-br from-gray-900 via-slate-800 to-indigo-950">
        {/* 动态网格背景 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
        </div>

        {/* 光晕装饰 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px]" />

        {/* 内容 */}
        <div className="relative z-10 flex flex-col justify-center px-16 py-20 text-white">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4 leading-tight">
              一站式软件授权<br />管理平台
            </h2>
            <p className="text-base text-gray-300 leading-relaxed max-w-md">
              为您的软件产品提供安全可靠的卡密验证、设备绑定、心跳检测等全方位授权管理能力。
            </p>
          </div>

          {/* 特性卡片 */}
          <div className="space-y-4">
            <FeatureCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              title="多层加密验证"
              desc="HMAC-SHA256 签名 + AES-256-GCM 加密 + Challenge-Response 防重放"
              color="blue"
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
              }
              title="硬件指纹绑定"
              desc="采集 CPU、主板、BIOS、磁盘、MAC 等多维度硬件信息，精准设备识别"
              color="indigo"
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              title="多语言 SDK"
              desc="Python、C#、JavaScript、TypeScript、Java、Go、Rust 等 15+ 语言开箱即用"
              color="emerald"
            />
          </div>

          {/* 底部统计 */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">15+</div>
              <div className="text-xs text-gray-400 mt-1">语言支持</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">AES-256</div>
              <div className="text-xs text-gray-400 mt-1">加密标准</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">99.9%</div>
              <div className="text-xs text-gray-400 mt-1">服务可用</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: 'blue' | 'indigo' | 'emerald';
}) {
  const colorMap = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}