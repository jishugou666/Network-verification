'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { programApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface LangInfo {
  id: string;
  label: string;
  ext: string;
  icon: string;
}

export default function ClientDownloadPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [languages, setLanguages] = useState<LangInfo[]>([]);
  const [selectedLang, setSelectedLang] = useState('python');
  const [appName, setAppName] = useState('');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [appDescription, setAppDescription] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [filename, setFilename] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    programApi.getLanguages().then(res => {
      if (res.code === 0) setLanguages(res.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await programApi.generateClient(id, {
        lang: selectedLang,
        appName: appName || undefined,
        appVersion: appVersion || undefined,
        appDescription: appDescription || undefined,
      });
      if (res.code === 0) {
        setGeneratedCode(res.data.code);
        setFilename(res.data.filename);
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
    navigator.clipboard.writeText(generatedCode).then(() => toast.success('已复制到剪贴板'));
  };

  // 获取打包说明
  const getPackageInstructions = (lang: string) => {
    switch (lang) {
      case 'python':
        return (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Python 打包为 EXE</h4>
            <pre className="text-xs text-blue-700 whitespace-pre-wrap font-mono leading-relaxed">
{`# 安装 PyInstaller
pip install pyinstaller pycryptodome requests

# 打包为单个 EXE 文件（无控制台窗口）
pyinstaller --onefile --windowed --name "${appName || 'Client'}" client.py`}
            </pre>
          </div>
        );
      case 'go':
        return (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Go 编译为 EXE</h4>
            <pre className="text-xs text-blue-700 whitespace-pre-wrap font-mono leading-relaxed">
{`# Windows
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o ${appName || 'client'}.exe client.go

# Linux
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o ${appName || 'client'} client.go

# macOS
GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o ${appName || 'client'} client.go`}
            </pre>
          </div>
        );
      case 'csharp':
        return (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">C# 编译为 EXE</h4>
            <pre className="text-xs text-blue-700 whitespace-pre-wrap font-mono leading-relaxed">
{`# 创建项目并编译
dotnet new console -n ${(appName || 'Client').replace(/\s/g, '')}
# 将生成的代码替换 Program.cs
dotnet add package BouncyCastle.Cryptography
dotnet build -c Release`}
            </pre>
          </div>
        );
      case 'rust':
        return (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Rust 编译为 EXE</h4>
            <pre className="text-xs text-blue-700 whitespace-pre-wrap font-mono leading-relaxed">
{`# 创建项目并编译
cargo new ${(appName || 'client').replace(/\s/g, '_').toLowerCase()}
# 将生成的代码替换 src/main.rs，添加依赖到 Cargo.toml
cargo build --release`}
            </pre>
          </div>
        );
      default: return null;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="glass-title">客户端下载</h1>
          <p className="text-xs text-gray-400 mt-1">生成多语言客户端，支持自定义应用信息</p>
        </div>
        <button onClick={() => router.back()} className="glass-btn">返回</button>
      </div>

      {/* 自定义信息 */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">应用信息</h2>
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

      {/* 语言选择 */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">选择语言</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 mb-4">
          {languages.map(lang => (
            <button
              key={lang.id}
              onClick={() => { setSelectedLang(lang.id); setGeneratedCode(''); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                selectedLang === lang.id
                  ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{lang.icon}</span>
              <span>{lang.label}</span>
              <span className="text-xs text-gray-400 ml-auto">{lang.ext}</span>
            </button>
          ))}
        </div>

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
      </div>

      {/* 生成的代码 */}
      {generatedCode && (
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">生成的代码</h2>
              <p className="text-xs text-gray-400 mt-0.5">{filename}</p>
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
                className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg shadow-sm transition-all"
              >
                下载文件
              </button>
            </div>
          </div>

          {/* 打包说明 */}
          {getPackageInstructions(selectedLang)}

          <pre className="mt-4 p-4 bg-gray-900 text-gray-100 rounded-xl text-xs font-mono max-h-[500px] overflow-auto whitespace-pre-wrap leading-relaxed">
            {generatedCode}
          </pre>
        </div>
      )}
    </div>
  );
}