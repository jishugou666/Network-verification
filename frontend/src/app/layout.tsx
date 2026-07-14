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
        <body><div className="flex items-center justify-center min-h-screen">加载中...</div></body>
      </html>
    );
  }

  return (
    <html lang="zh-CN">
      <body>
        <Toaster position="top-center" />
        {!isAuthPage && user && (
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
              <div className="flex items-center gap-6">
                <a href="/dashboard" className="font-bold text-lg text-blue-600">卡密验证</a>
                <a href="/dashboard" className="text-sm text-gray-600 hover:text-blue-600">仪表盘</a>
                <a href="/programs" className="text-sm text-gray-600 hover:text-blue-600">程序管理</a>
                <a href="/cards" className="text-sm text-gray-600 hover:text-blue-600">卡密管理</a>
                <a href="/users" className="text-sm text-gray-600 hover:text-blue-600">用户管理</a>
                {user.role === 'root' && (
                  <a href="/agents" className="text-sm text-gray-600 hover:text-blue-600">代理管理</a>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {user.username} ({user.role === 'root' ? '超级管理员' : '代理'})
                </span>
                <button
                  onClick={() => { setToken(null); router.push('/'); }}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  退出
                </button>
              </div>
            </div>
          </nav>
        )}
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}