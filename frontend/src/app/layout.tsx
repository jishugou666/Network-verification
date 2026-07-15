'use client';

import './globals.css';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, setToken, authApi } from '@/lib/api';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthPage = pathname === '/';

  useEffect(() => {
    if (!isAuthPage) {
      const token = getToken();
      if (!token) {
        router.push('/');
        return;
      }
      authApi.getMe().then(res => {
        if (res.code === 0) {
          setUser(res.data);
        } else {
          setToken(null);
          router.push('/');
        }
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [pathname]);

  if (loading && !isAuthPage) {
    return (
      <html lang="zh-CN">
        <head>
          <title>CDK 授权管理</title>
          <meta name="description" content="安全高效的软件授权管理平台 - 卡密验证、设备绑定、心跳检测" />
          </head>
        <body><div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">加载中...</span>
          </div>
        </div></body>
      </html>
    );
  }

  return (
    <html lang="zh-CN">
      <head>
        <title>CDK 授权管理</title>
        <meta name="description" content="安全高效的软件授权管理平台 - 卡密验证、设备绑定、心跳检测、多语言 SDK 支持" />
        <meta name="keywords" content="卡密验证,软件授权,CDK管理,设备绑定,License管理" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="CDK 授权管理" />
        <meta property="og:description" content="安全高效的软件授权管理平台" />
        <meta property="og:type" content="website" />
      </head>
      <body>
        <Toaster position="top-center" toastOptions={{
          style: { borderRadius: '12px', fontSize: '14px', padding: '10px 16px' },
        }} />
        {!isAuthPage && user && (
          <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
              <div className="flex items-center gap-1">
                <a href="/dashboard" className="flex items-center gap-2 font-bold text-base text-gray-900 hover:text-blue-600 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  CDK 授权
                </a>
              </div>

              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-1">
                <NavLink href="/dashboard" active={pathname === '/dashboard'}>仪表盘</NavLink>
                <NavLink href="/programs" active={Pathname.startsWith('/programs')}>程序管理</NavLink>
                <NavLink href="/cards" active={Pathname.startsWith('/cards')}>卡密管理</NavLink>
                <NavLink href="/users" active={pathname === '/users'}>用户管理</NavLink>
                <NavLink href="/docs" active={pathname === '/docs'}>API 文档</NavLink>
                {user.role === 'root' && (
                  <NavLink href="/agents" active={pathname === '/agents'}>代理管理</NavLink>
                )}
              </div>

              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                  <span className="text-gray-600">{user.username}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">
                    {user.role === 'root' ? '管理员' : '代理'}
                  </span>
                </div>
                <button
                  onClick={() => { setToken(null); router.push('/'); }}
                  className="text-sm text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
                >
                  退出
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 text-gray-500"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {mobileMenuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  }
                </svg>
              </button>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl px-4 py-3 space-y-1">
                <MobileNavLink href="/dashboard" active={pathname === '/dashboard'}>仪表盘</MobileNavLink>
                <MobileNavLink href="/programs" active={Pathname.startsWith('/programs')}>程序管理</MobileNavLink>
                <MobileNavLink href="/cards" active={Pathname.startsWith('/cards')}>卡密管理</MobileNavLink>
                <MobileNavLink href="/users" active={pathname === '/users'}>用户管理</MobileNavLink>
                <MobileNavLink href="/docs" active={pathname === '/docs'}>API 文档</MobileNavLink>
                {user.role === 'root' && (
                  <MobileNavLink href="/agents" active={pathname === '/agents'}>代理管理</MobileNavLink>
                )}
                <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm text-gray-500">{user.username} ({user.role === 'root' ? '管理员' : '代理'})</span>
                  <button onClick={() => { setToken(null); router.push('/'); }} className="text-sm text-red-500">退出</button>
                </div>
              </div>
            )}
          </nav>
        )}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
      </body>
    </html>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {children}
    </a>
  );
}

function MobileNavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`block px-3 py-2 rounded-lg text-sm font-medium ${
        active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </a>
  );
}