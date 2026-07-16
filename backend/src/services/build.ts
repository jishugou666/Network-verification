import { execSync, execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ClientLang } from './client';

// 编译超时（秒）
const BUILD_TIMEOUT = 60_000;

export interface BuildResult {
  success: boolean;
  buffer?: Buffer;
  filename?: string;
  mimeType?: string;
  buildLog?: string;
  error?: string;
  /** 如果不支持服务器编译，返回构建脚本 */
  buildScript?: string;
  scriptLang?: string;
}

function run(cmd: string, cwd: string, timeout = BUILD_TIMEOUT): string {
  return execSync(cmd, { cwd, timeout, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function toolExists(cmd: string): boolean {
  try {
    execFileSync(cmd, ['--version'], { timeout: 5000, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'cdk-build-'));
}

// ==================== Go 编译（含 garble 混淆） ====================
function buildGo(code: string, appName: string): BuildResult {
  if (!toolExists('go')) {
    return {
      success: false,
      error: '服务器未安装 Go 编译器',
      buildScript: buildScriptGo(appName),
      scriptLang: 'batch',
    };
  }

  const dir = tmpDir();
  const safeName = (appName || 'client').replace(/[^a-zA-Z0-9_-]/g, '_');
  const goFile = join(dir, 'main.go');
  const hasGarble = toolExists('garble');

  try {
    writeFileSync(goFile, code, 'utf-8');
    run(`go mod init ${safeName}`, dir, 10_000);
    run(`go mod tidy`, dir, 30_000);

    let log: string;
    if (hasGarble) {
      // garble 混淆编译：混淆标识符 + 加密字符串 + 去除调试信息
      log = run(
        `GOOS=windows GOARCH=amd64 CGO_ENABLED=0 garble -literals -tiny -seed=random build -ldflags="-s -w" -o "${safeName}.exe" .`,
        dir,
        BUILD_TIMEOUT,
      );
    } else {
      log = run(
        `GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o "${safeName}.exe" .`,
        dir,
        BUILD_TIMEOUT,
      );
    }

    const exePath = join(dir, `${safeName}.exe`);
    const buffer = readFileSync(exePath);
    rmSync(dir, { recursive: true, force: true });

    return {
      success: true,
      buffer,
      filename: `${safeName}.exe`,
      mimeType: 'application/vnd.microsoft.portable-executable',
      buildLog: (hasGarble ? '[garble 混淆] ' : '') + (log || 'Build OK'),
    };
  } catch (e: any) {
    rmSync(dir, { recursive: true, force: true });
    return {
      success: false,
      error: `Go 编译失败: ${e.stderr || e.message}`,
      buildScript: buildScriptGo(appName),
      scriptLang: 'batch',
    };
  }
}

// ==================== Python 打包 ====================
function buildPython(code: string, appName: string): BuildResult {
  // PyInstaller 在 Linux 上只能生成 Linux 二进制，不能交叉编译 Windows EXE
  // 返回 Windows 打包脚本
  return {
    success: false,
    error: 'Python 不支持服务器端交叉编译为 Windows EXE，请使用下方脚本在 Windows 上打包',
    buildScript: buildScriptPython(appName),
    scriptLang: 'batch',
  };
}

// ==================== Rust 编译 ====================
function buildRust(code: string, appName: string): BuildResult {
  if (!toolExists('cargo')) {
    return {
      success: false,
      error: '服务器未安装 Rust 工具链',
      buildScript: buildScriptRust(appName),
      scriptLang: 'batch',
    };
  }

  // 检查是否有 Windows 交叉编译目标
  let hasWindowsTarget = false;
  try {
    const targets = execSync('rustup target list --installed', { encoding: 'utf-8', timeout: 5000 });
    hasWindowsTarget = targets.includes('x86_64-pc-windows-gnu');
  } catch { /* ignore */ }

  if (!hasWindowsTarget) {
    return {
      success: false,
      error: '服务器未安装 Windows 交叉编译目标，请使用下方脚本本地编译',
      buildScript: buildScriptRust(appName),
      scriptLang: 'batch',
    };
  }

  const dir = tmpDir();
  const safeName = (appName || 'client').replace(/\s/g, '_').toLowerCase();

  try {
    const srcDir = join(dir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(dir, 'Cargo.toml'), cargoToml(safeName), 'utf-8');
    writeFileSync(join(srcDir, 'main.rs'), code, 'utf-8');
    const log = run(
      `cargo build --release --target x86_64-pc-windows-gnu`,
      dir,
      BUILD_TIMEOUT * 2,
    );

    const exePath = join(dir, 'target', 'x86_64-pc-windows-gnu', 'release', `${safeName}.exe`);
    const buffer = readFileSync(exePath);
    rmSync(dir, { recursive: true, force: true });

    return {
      success: true,
      buffer,
      filename: `${safeName}.exe`,
      mimeType: 'application/vnd.microsoft.portable-executable',
      buildLog: log || 'Build OK',
    };
  } catch (e: any) {
    rmSync(dir, { recursive: true, force: true });
    return {
      success: false,
      error: `Rust 编译失败: ${e.stderr || e.message}`,
      buildScript: buildScriptRust(appName),
      scriptLang: 'batch',
    };
  }
}

// ==================== C# 编译 ====================
function buildCSharp(code: string, appName: string): BuildResult {
  if (!toolExists('dotnet')) {
    return {
      success: false,
      error: '服务器未安装 .NET SDK',
      buildScript: buildScriptCSharp(appName),
      scriptLang: 'batch',
    };
  }

  const dir = tmpDir();
  const safeName = (appName || 'Client').replace(/\s/g, '');

  try {
    const projDir = join(dir, safeName);
    run(`dotnet new console -n "${safeName}" --force`, dir, 30_000);
    writeFileSync(join(projDir, 'Program.cs'), code, 'utf-8');

    // 添加 BouncyCastle 依赖（C# 模板需要）
    try {
      run(`dotnet add package BouncyCastle.Cryptography`, projDir, 30_000);
    } catch { /* ignore */ }

    const log = run(
      `dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:DebugType=none -o "${join(dir, 'out')}"`,
      projDir,
      BUILD_TIMEOUT * 3,
    );

    const exePath = join(dir, 'out', `${safeName}.exe`);
    const buffer = readFileSync(exePath);
    rmSync(dir, { recursive: true, force: true });

    return {
      success: true,
      buffer,
      filename: `${safeName}.exe`,
      mimeType: 'application/vnd.microsoft.portable-executable',
      buildLog: log || 'Build OK',
    };
  } catch (e: any) {
    rmSync(dir, { recursive: true, force: true });
    return {
      success: false,
      error: `C# 编译失败: ${e.stderr || e.message}`,
      buildScript: buildScriptCSharp(appName),
      scriptLang: 'batch',
    };
  }
}

// ==================== 构建脚本模板 ====================

function buildScriptGo(name: string): string {
  const safe = (name || 'client').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `@echo off
chcp 65001 >nul
echo ===== Go 客户端打包为 EXE（含混淆保护） =====
echo.

:: 检查 Go 是否安装
where go >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Go，请先安装: https://go.dev/dl/
    pause
    exit /b 1
)

echo [1/4] 初始化 Go 模块...
go mod init ${safe}
echo [2/4] 下载依赖...
go mod tidy

:: 检查 garble 是否安装
where garble >nul 2>&1
if %errorlevel% equ 0 (
    echo [3/4] 使用 garble 混淆编译...
    set CGO_ENABLED=0
    set GOOS=windows
    set GOARCH=amd64
    garble -literals -tiny -seed=random build -ldflags="-s -w" -o "${safe}.exe" .
) else (
    echo [提示] garble 未安装，使用普通编译
    echo   安装 garble: go install mvdan.cc/garble@latest
    echo [3/4] 编译为 EXE...
    set CGO_ENABLED=0
    set GOOS=windows
    set GOARCH=amd64
    go build -ldflags="-s -w" -o "${safe}.exe" .
)

if exist "${safe}.exe" (
    echo.
    echo ===== 打包成功! =====
    echo 输出文件: ${safe}.exe
) else (
    echo [错误] 编译失败，请检查上方错误信息
)
pause`;
}

function buildScriptPython(name: string): string {
  const safe = name || 'client';
  return `@echo off
chcp 65001 >nul
echo ===== Python 客户端打包为 EXE =====
echo.

:: 检查 Python 是否安装
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python，请先安装: https://python.org/
    pause
    exit /b 1
)

echo [1/3] 安装 PyInstaller...
pip install pyinstaller pycryptodome requests
echo [2/3] 打包为 EXE（无控制台窗口）...
pyinstaller --onefile --windowed --name "${safe}" client.py
echo [3/3] 清理临时文件...
rd /s /q build 2>nul
del /q "${safe}.spec" 2>nul

if exist "dist\\${safe}.exe" (
    echo.
    echo ===== 打包成功! =====
    echo 输出文件: dist\\${safe}.exe
    move "dist\\${safe}.exe" . >nul
    rd /s /q dist 2>nul
) else (
    echo [错误] 打包失败，请检查上方错误信息
)
pause`;
}

function buildScriptRust(name: string): string {
  const safe = (name || 'client').replace(/\s/g, '_').toLowerCase();
  return `@echo off
chcp 65001 >nul
echo ===== Rust 客户端编译为 EXE =====
echo.

where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Rust，请先安装: https://rustup.rs/
    pause
    exit /b 1
)

echo [1/4] 安装 Windows 编译目标...
rustup target add x86_64-pc-windows-msvc
echo [2/4] 创建项目...
cargo new ${safe} --name "${safe}"
echo [3/4] 替换代码并编译...
copy /y main.rs ${safe}\\src\\main.rs
cd ${safe}
cargo build --release --target x86_64-pc-windows-msvc
cd ..

if exist "${safe}\\target\\x86_64-pc-windows-msvc\\release\\${safe}.exe" (
    echo.
    echo ===== 编译成功! =====
    copy /y "${safe}\\target\\x86_64-pc-windows-msvc\\release\\${safe}.exe" . >nul
    echo 输出文件: ${safe}.exe
) else (
    echo [错误] 编译失败，请检查上方错误信息
)
pause`;
}

function buildScriptCSharp(name: string): string {
  const safe = (name || 'Client').replace(/\s/g, '');
  return `@echo off
chcp 65001 >nul
echo ===== C# 客户端编译为 EXE =====
echo.

where dotnet >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 .NET SDK，请先安装: https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

echo [1/4] 创建项目...
dotnet new console -n "${safe}" --force
echo [2/4] 替换代码...
copy /y Program.cs ${safe}\\Program.cs
cd ${safe}
echo [3/4] 安装依赖...
dotnet add package BouncyCastle.Cryptography
echo [4/4] 编译为单文件 EXE...
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:DebugType=none
cd ..

if exist "${safe}\\bin\\Release\\net8.0\\win-x64\\publish\\${safe}.exe" (
    echo.
    echo ===== 编译成功! =====
    copy /y "${safe}\\bin\\Release\\net8.0\\win-x64\\publish\\${safe}.exe" . >nul
    echo 输出文件: ${safe}.exe
) else (
    echo [错误] 编译失败，请检查上方错误信息
)
pause`;
}

function cargoToml(name: string): string {
  return `[package]
name = "${name}"
version = "0.1.0"
edition = "2021"

[dependencies]
reqwest = { version = "0.12", features = ["json", "blocking"] }
sha2 = "0.10"
hmac = "0.12"
aes = "0.8"
cbc = "0.1"
aes-gcm = "0.10"
base64 = "0.22"
rand = "0.8"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
hex = "0.4"
lazy_static = "1.4"
`;
}

// ==================== 获取编译能力 ====================
export interface BuildCapability {
  lang: ClientLang;
  canBuild: boolean;
  label: string;
  icon: string;
  description: string;
}

export function getBuildCapabilities(): BuildCapability[] {
  const hasGo = toolExists('go');
  const hasCargo = toolExists('cargo');
  const hasDotnet = toolExists('dotnet');

  return [
    { lang: 'go', canBuild: hasGo, label: 'Go', icon: '🔵', description: hasGo ? '服务器直接编译 EXE' : '需下载脚本本地编译' },
    { lang: 'python', canBuild: false, label: 'Python', icon: '🐍', description: '需下载脚本在 Windows 上打包' },
    { lang: 'rust', canBuild: hasCargo, label: 'Rust', icon: '🦀', description: hasCargo ? '服务器编译 EXE' : '需下载脚本本地编译' },
    { lang: 'csharp', canBuild: hasDotnet, label: 'C# (.NET)', icon: '🔷', description: hasDotnet ? '服务器编译 EXE' : '需下载脚本本地编译' },
    { lang: 'java', canBuild: false, label: 'Java', icon: '☕', description: '不支持 EXE，请下载源码手动编译' },
    { lang: 'nodejs', canBuild: false, label: 'Node.js', icon: '💚', description: '不支持 EXE，请下载源码使用' },
    { lang: 'cpp', canBuild: false, label: 'C++', icon: '⚙️', description: '不支持 EXE，请下载源码手动编译' },
  ];
}

// ==================== 主构建函数 ====================
export function buildClient(
  lang: ClientLang,
  code: string,
  appName: string,
): BuildResult {
  switch (lang) {
    case 'go':
      return buildGo(code, appName);
    case 'python':
      return buildPython(code, appName);
    case 'rust':
      return buildRust(code, appName);
    case 'csharp':
      return buildCSharp(code, appName);
    default:
      return {
        success: false,
        error: `${lang} 语言暂不支持服务器端编译为 EXE，请下载源码后本地编译`,
      };
  }
}