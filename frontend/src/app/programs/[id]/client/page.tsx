'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { programApi, getToken } from '@/lib/api';
import toast from 'react-hot-toast';

interface LangInfo {
  id: string;
  label: string;
  ext: string;
  icon: string;
}

interface BuildCap {
  lang: string;
  canBuild: boolean;
  label: string;
  icon: string;
  description: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function ClientDownloadPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [languages, setLanguages] = useState<LangInfo[]>([]);
  const [buildCaps, setBuildCaps] = useState<BuildCap[]>([]);
  const [selectedLang, setSelectedLang] = useState('python');
  const [appName, setAppName] = useState('');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [appDescription, setAppDescription] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [filename, setFilename] = useState('');
  const [generating, setGenerating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buildScriptModal, setBuildScriptModal] = useState<{ script: string; lang: string; title: string } | null>(null);

  // 预览相关
  const [previewCode, setPreviewCode] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    Promise.all([
      programApi.getLanguages(),
      programApi.getBuildCapabilities(id).catch(() => ({ code: -1, data: null })),
    ]).then(([langRes, capRes]) => {
      if (langRes.code === 0 && Array.isArray(langRes.data)) setLanguages(langRes.data);
      if (capRes.code === 0 && Array.isArray(capRes.data)) setBuildCaps(capRes.data);
    }).catch(() => {
      toast.error('加载失败，请刷新重试');
    }).finally(() => setLoading(false));
  }, [id]);

  // 选择语言后自动加载预览
  const fetchPreview = useCallback(async (lang: string) => {
    setPreviewLoading(true);
    try {
      const res = await programApi.previewClient(id, lang);
      if (res.code === 0 && res.data) {
        setPreviewCode(res.data.code);
        setShowPreview(true);
      }
    } catch {
      // 预览失败不弹 toast
    } finally {
      setPreviewLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!loading) fetchPreview(selectedLang);
  }, [selectedLang, loading, fetchPreview]);

  const getCapForLang = (langId: string): BuildCap | undefined =>
    buildCaps.find(c => c.lang === langId);

  const handleLangSelect = (lang: string) => {
    setSelectedLang(lang);
    setGeneratedCode('');
    setShowPreview(true);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await programApi.generateClient(id, {
        lang: selectedLang,
        appName: appName || undefined,
        appVersion: appVersion || undefined,
        appDescription: appDescription || undefined,
      });
      if (res.code === 0 && res.data) {
        setGeneratedCode(res.data.code);
        setFilename(res.data.filename);
        setShowPreview(false);
        toast.success('代码生成成功');
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error('生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleBuild = async () => {
    setBuilding(true);
    try {
      const token = getToken();
      const resp = await fetch(`${API_URL}/programs/${id}/client/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          lang: selectedLang,
          appName: appName || undefined,
          appVersion: appVersion || undefined,
          appDescription: appDescription || undefined,
        }),
      });

      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await resp.json();
        if (data.code === 0 && data.data?.buildScript) {
          const cap = getCapForLang(selectedLang);
          setBuildScriptModal({
            script: data.data.buildScript,
            lang: data.data.scriptLang || 'batch',
            title: `${cap?.label || selectedLang} 本地打包脚本`,
          });
        } else {
          toast.error(data.data?.error || data.message || '编译失败');
        }
      } else {
        const blob = await resp.blob();
        const cd = resp.headers.get('content-disposition') || '';
        const match = cd.match(/filename\*=UTF-8''(.+)/) || cd.match(/filename="(.+)"/);
        const downloadName = match ? decodeURIComponent(match[1]) : `${appName || 'client'}.exe`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('EXE 打包成功，已开始下载！');
      }
    } catch {
      toast.error('打包失败，请确认后端已部署 Docker 版本');
    } finally {
      setBuilding(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode || previewCode).then(() => toast.success('已复制到剪贴板'));
  };

  const handleDownloadScript = () => {
    if (!buildScriptModal) return;
    const ext = buildScriptModal.lang === 'batch' ? '.bat' : '.sh';
    const blob = new Blob([buildScriptModal.script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `build_${selectedLang}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cap = getCapForLang(selectedLang);
  const canBuild = cap?.canBuild || false;
  const displayCode = generatedCode || previewCode;

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="glass-title">客户端下载</h1>
          <p className="text-xs text-gray-400 mt-1">生成多语言客户端源码，支持在线打包 EXE</p>
        </div>
        <button onClick={() => router.back()} className="glass-btn">返回</button>
      </div>

      {/* ===== DIY 应用信息 ===== */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">应用信息（DIY 自定义）</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">应用名称</label>
            <input
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              value={appName}
              onChange={e => setAppName(e.target.value)}
              placeholder="例如：MyApp"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">版本号</label>
            <input
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              value={appVersion}
              onChange={e => setAppVersion(e.target.value)}
              placeholder="1.0.0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">描述</label>
            <input
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              value={appDescription}
              onChange={e => setAppDescription(e.target.value)}
              placeholder="自动生成的验证客户端"
            />
          </div>
        </div>
      </div>

      {/* ===== 语言选择 ===== */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">选择语言</h2>
        {languages.length === 0 ? (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
            语言列表加载失败，请确认后端已部署最新版本。可尝试刷新页面重试。
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 mb-4">
            {languages.map(lang => {
              const c = getCapForLang(lang.id);
              const online = c?.canBuild;
              return (
                <button
                  key={lang.id}
                  onClick={() => handleLangSelect(lang.id)}
                  className={`relative flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    selectedLang === lang.id
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2 w-full">
                    <span className="text-base">{lang.icon}</span>
                    <span>{lang.label}</span>
                    <span className="text-xs text-gray-400 ml-auto">{lang.ext}</span>
                  </span>
                  {online && (
                    <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-normal leading-none">
                      在线打包
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                生成中...
              </span>
            ) : '生成客户端代码'}
          </button>
          {cap && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              canBuild ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {cap.description}
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            字符串加密保护
          </span>
        </div>
      </div>

      {/* ===== 源码预览 + 验证窗口预览 ===== */}
      {showPreview && displayCode && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* 源码面板 */}
          <div className="lg:col-span-3 glass p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-800">
                  {generatedCode ? '生成的代码' : '源码预览'}
                </h2>
                {!generatedCode && previewLoading && (
                  <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 font-medium">
                  已加密保护
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-[11px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  复制代码
                </button>
                {generatedCode && (
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 text-[11px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    下载源码
                  </button>
                )}
              </div>
            </div>
            <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl text-xs font-mono max-h-[600px] overflow-auto whitespace-pre-wrap leading-relaxed">
              {displayCode}
            </pre>
          </div>

          {/* 验证窗口预览 */}
          <div className="lg:col-span-2 glass p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <h2 className="text-sm font-semibold text-gray-800">验证窗口预览</h2>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="max-w-[240px] mx-auto rounded-xl overflow-hidden shadow-lg" style={{ borderRadius: '18px' }}>
                {/* 登录头部 */}
                <div style={{ padding: '14px 12px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>卡密验证</div>
                  <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px' }}>请输入卡密以激活</div>
                </div>
                {/* 登录表单 */}
                <div style={{ padding: '12px', background: '#fff' }}>
                  <div style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '10px', textAlign: 'center', color: '#9ca3af', marginBottom: '8px' }}>
                    请输入卡密
                  </div>
                  <div style={{ padding: '6px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', color: '#fff', background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                    验证并激活
                  </div>
                </div>
                {/* 加载中 */}
                <div style={{ padding: '10px 12px', background: '#f3f4f6', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>正在验证...</div>
                </div>
                {/* 成功头部 */}
                <div style={{ padding: '10px 12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700 }}>验证成功</div>
                  <div style={{ fontSize: '9px', opacity: 0.85, marginTop: '1px' }}>功能已激活</div>
                </div>
                {/* 心跳状态 */}
                <div style={{ padding: '8px 12px', background: '#fff', textAlign: 'center', borderTop: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '9px', color: '#9ca3af' }}>心跳保活中 · 每60秒</div>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                此预览展示客户端验证窗口的基本样式。实际运行时，窗口样式可通过 JS 客户端集成页面的"界面定制"功能自定义。
              </p>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                左侧源码中的敏感字符串（appKey、appSecret、API地址）已加密保护，运行时自动解密。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== 生成的代码操作区 ===== */}
      {generatedCode && !showPreview && (
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">生成的代码</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-400">{filename}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 font-medium">
                  已加密保护
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                复制代码
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                下载源码
              </button>
              <button
                onClick={handleBuild}
                disabled={building}
                className={`px-4 py-2 text-xs font-medium text-white rounded-lg shadow-sm transition-all disabled:opacity-50 ${
                  canBuild
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600'
                }`}
              >
                {building ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    编译中...
                  </span>
                ) : canBuild ? (
                  '在线打包 EXE'
                ) : (
                  '获取打包脚本'
                )}
              </button>
            </div>
          </div>
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl text-xs font-mono max-h-[500px] overflow-auto whitespace-pre-wrap leading-relaxed">
            {generatedCode}
          </pre>
        </div>
      )}

      {/* ===== 打包脚本弹窗 ===== */}
      {buildScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setBuildScriptModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{buildScriptModal.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  将此脚本保存到与源码相同的目录，双击运行即可自动打包
                </p>
              </div>
              <button onClick={() => setBuildScriptModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 overflow-auto flex-1">
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-auto">
                {buildScriptModal.script}
              </pre>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(buildScriptModal.script);
                  toast.success('已复制脚本');
                }}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                复制脚本
              </button>
              <button
                onClick={handleDownloadScript}
                className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg shadow-sm transition-all"
              >
                下载脚本文件
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}