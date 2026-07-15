'use client';

import { useState, Children, isValidElement } from 'react';

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API 对接文档</h1>
        <p className="text-sm text-gray-500 mt-1">完整的客户端验证 API 接口规范，涵盖签名机制、加密方案和所有端点。</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">目录</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {[
            { label: '鉴权机制', href: '#auth' },
            { label: '签名算法', href: '#signature' },
            { label: '加密方案', href: '#encryption' },
            { label: '获取挑战', href: '#challenge' },
            { label: '卡密激活', href: '#activate' },
            { label: '心跳验证', href: '#heartbeat' },
            { label: '登出', href: '#logout' },
            { label: '错误码', href: '#errors' },
            { label: '硬件采集', href: '#hardware' },
            { label: 'Python 示例', href: '#example-python' },
            { label: 'C# 示例', href: '#example-csharp' },
            { label: 'Node.js 示例', href: '#example-node' },
          ].map(item => (
            <a key={item.href} href={item.href} className="text-blue-600 hover:text-blue-800 hover:underline">
              {item.label}
            </a>
          ))}
        </div>
      </div>

      <Section id="auth" title="1. 鉴权机制">
        <p>所有客户端 API 请求（<code>/api/client/*</code>）均需要携带以下签名参数：</p>
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">参数</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">类型</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">必填</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">说明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2.5 font-mono text-xs">appKey</td><td className="px-4 py-2.5 text-gray-500">string</td><td className="px-4 py-2.5 text-green-600">是</td><td className="px-4 py-2.5 text-gray-600">程序唯一标识，创建程序后自动生成</td></tr>
            <tr><td className="px-4 py-2.5 font-mono text-xs">timestamp</td><td className="px-4 py-2.5 text-gray-500">number</td><td className="px-4 py-2.5 text-green-600">是</td><td className="px-4 py-2.5 text-gray-600">Unix 毫秒时间戳，与服务器偏差不超过 30 秒</td></tr>
            <tr><td className="px-4 py-2.5 font-mono text-xs">nonce</td><td className="px-4 py-2.5 text-gray-500">string</td><td className="px-4 py-2.5 text-green-600">是</td><td className="px-4 py-2.5 text-gray-600">16 位随机 hex 字符串，5 分钟内不可重复</td></tr>
            <tr><td className="px-4 py-2.5 font-mono text-xs">signature</td><td className="px-4 py-2.5 text-gray-500">string</td><td className="px-4 py-2.5 text-green-600">是</td><td className="px-4 py-2.5 text-gray-600">HMAC-SHA256 签名，见下方算法</td></tr>
          </tbody>
        </table>
      </Section>

      <Section id="signature" title="2. 签名算法">
        <CodeBlock code={SIGNATURE_CODE} />
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <strong>注意：</strong>签名原文使用的是<strong>未包含 signature 字段</strong>的请求体 JSON。生成签名后，再将 signature 追加到请求体中发送。
        </div>
      </Section>

      <Section id="encryption" title="3. 加密方案">
        <h4 className="text-sm font-semibold text-gray-800 mt-4">3.1 AppSecret 存储</h4>
        <p>AppSecret 在服务端使用 <strong>AES-256-GCM</strong> 加密存储，确保数据库泄露后密钥不会明文暴露。</p>

        <h4 className="text-sm font-semibold text-gray-800 mt-4">3.2 响应数据加密</h4>
        <p>激活和心跳接口的敏感响应数据（如 heartbeatToken）使用 <strong>AES-256-CBC</strong> 加密：</p>
        <CodeBlock code={ENCRYPTION_CODE} />

        <h4 className="text-sm font-semibold text-gray-800 mt-4">3.3 Challenge-Response 防重放</h4>
        <p>激活时客户端需提交 challengeResponse 证明其持有正确的 AppSecret：</p>
        <CodeBlock code={CHALLENGE_RESPONSE_CODE} />
      </Section>

      <Section id="challenge" title="4. 获取挑战">
        <EndpointBadge method="POST" path="/api/client/challenge" />
        <p className="mt-2">获取一个随机 128 位挑战字符串，用于后续激活操作。</p>

        <h4 className="text-sm font-semibold text-gray-800 mt-4">请求体</h4>
        <table className="w-full text-sm mt-2">
          <thead><tr className="bg-gray-50"><th className="text-left px-4 py-2 font-medium text-gray-600">参数</th><th className="text-left px-4 py-2 font-medium text-gray-600">类型</th><th className="text-left px-4 py-2 font-medium text-gray-600">说明</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2 font-mono text-xs">appKey</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">程序 AppKey</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">timestamp</td><td className="px-4 py-2 text-gray-500">number</td><td className="px-4 py-2 text-gray-600">毫秒时间戳</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">nonce</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">随机字符串</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">signature</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">HMAC-SHA256 签名</td></tr>
          </tbody>
        </table>

        <h4 className="text-sm font-semibold text-gray-800 mt-4">成功响应</h4>
        <CodeBlock code={CHALLENGE_RESP} />
      </Section>

      <Section id="activate" title="5. 卡密激活">
        <EndpointBadge method="POST" path="/api/client/activate" />
        <p className="mt-2">验证卡密并绑定终端用户，激活成功后返回加密的 heartbeatToken。</p>

        <h4 className="text-sm font-semibold text-gray-800 mt-4">请求体</h4>
        <table className="w-full text-sm mt-2">
          <thead><tr className="bg-gray-50"><th className="text-left px-4 py-2 font-medium text-gray-600">参数</th><th className="text-left px-4 py-2 font-medium text-gray-600">类型</th><th className="text-left px-4 py-2 font-medium text-gray-600">说明</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2 font-mono text-xs">appKey</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">程序 AppKey</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">cardKey</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">卡密明文</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">username</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">终端用户自定义名称</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">hardwareInfo</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">硬件信息 JSON 字符串</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">challengeResponse</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">格式: challenge:HMAC-SHA256(challenge+cardKey+username, appSecret)</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">timestamp</td><td className="px-4 py-2 text-gray-500">number</td><td className="px-4 py-2 text-gray-600">毫秒时间戳</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">nonce</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">随机字符串</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">signature</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">HMAC-SHA256 签名</td></tr>
          </tbody>
        </table>

        <h4 className="text-sm font-semibold text-gray-800 mt-4">成功响应</h4>
        <CodeBlock code={ACTIVATE_RESP} />

        <h4 className="text-sm font-semibold text-gray-800 mt-4">可能错误</h4>
        <table className="w-full text-sm mt-2">
          <thead><tr className="bg-gray-50"><th className="text-left px-4 py-2 font-medium text-gray-600">code</th><th className="text-left px-4 py-2 font-medium text-gray-600">说明</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2001</td><td className="px-4 py-2 text-gray-600">卡密无效</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2002</td><td className="px-4 py-2 text-gray-600">卡密已被激活且不允许重复激活</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2003</td><td className="px-4 py-2 text-gray-600">卡密已过期</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2004</td><td className="px-4 py-2 text-gray-600">卡密已被封禁</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2007</td><td className="px-4 py-2 text-gray-600">用户已被封禁</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2009</td><td className="px-4 py-2 text-gray-600">挑战响应校验失败</td></tr>
          </tbody>
        </table>
      </Section>

      <Section id="heartbeat" title="6. 心跳验证">
        <EndpointBadge method="POST" path="/api/client/heartbeat" />
        <p className="mt-2">验证用户在线状态，使用一次性 Token 防重放。每次心跳返回新的 heartbeatToken。</p>

        <h4 className="text-sm font-semibold text-gray-800 mt-4">请求体</h4>
        <table className="w-full text-sm mt-2">
          <thead><tr className="bg-gray-50"><th className="text-left px-4 py-2 font-medium text-gray-600">参数</th><th className="text-left px-4 py-2 font-medium text-gray-600">类型</th><th className="text-left px-4 py-2 font-medium text-gray-600">说明</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2 font-mono text-xs">appKey</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">程序 AppKey</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">userId</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">激活时返回的用户 ID</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">heartbeatToken</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">上一次心跳返回的 Token（首次使用激活时返回的）</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">timestamp</td><td className="px-4 py-2 text-gray-500">number</td><td className="px-4 py-2 text-gray-600">毫秒时间戳</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">nonce</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">随机字符串</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">signature</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">HMAC-SHA256 签名</td></tr>
          </tbody>
        </table>

        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <strong>重要：</strong>heartbeatToken 是<strong>一次性</strong>的。每次心跳成功后，旧 Token 立即失效，必须使用新返回的 Token 进行下一次心跳。建议心跳间隔为 60 秒，且必须在程序设置的 heartbeatTimeout 时间内完成心跳，否则 Token 过期。
        </div>

        <h4 className="text-sm font-semibold text-gray-800 mt-4">成功响应</h4>
        <CodeBlock code={HEARTBEAT_RESP} />
      </Section>

      <Section id="logout" title="7. 登出">
        <EndpointBadge method="POST" path="/api/client/logout" />
        <p className="mt-2">注销用户，失效所有未使用的 heartbeatToken。</p>

        <h4 className="text-sm font-semibold text-gray-800 mt-4">请求体</h4>
        <table className="w-full text-sm mt-2">
          <thead><tr className="bg-gray-50"><th className="text-left px-4 py-2 font-medium text-gray-600">参数</th><th className="text-left px-4 py-2 font-medium text-gray-600">类型</th><th className="text-left px-4 py-2 font-medium text-gray-600">说明</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2 font-mono text-xs">appKey</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">程序 AppKey</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">userId</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">用户 ID</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">timestamp</td><td className="px-4 py-2 text-gray-500">number</td><td className="px-4 py-2 text-gray-600">毫秒时间戳</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">nonce</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">随机字符串</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">signature</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">HMAC-SHA256 签名</td></tr>
          </tbody>
        </table>

        <h4 className="text-sm font-semibold text-gray-800 mt-4">成功响应</h4>
        <CodeBlock code={LOGOUT_RESP} />
      </Section>

      <Section id="response-format" title="8. 统一响应格式">
        <p>所有接口遵循统一的 JSON 响应格式：</p>
        <CodeBlock code={RESPONSE_FORMAT} />
      </Section>

      <Section id="errors" title="9. 错误码参考">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">code</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">常量</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">说明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2 font-mono text-xs text-green-600">0</td><td className="px-4 py-2 font-mono text-xs text-gray-500">SUCCESS</td><td className="px-4 py-2 text-gray-600">成功</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">400</td><td className="px-4 py-2 font-mono text-xs text-gray-500">BAD_REQUEST</td><td className="px-4 py-2 text-gray-600">请求参数错误</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">401</td><td className="px-4 py-2 font-mono text-xs text-gray-500">UNAUTHORIZED</td><td className="px-4 py-2 text-gray-600">未认证</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">403</td><td className="px-4 py-2 font-mono text-xs text-gray-500">FORBIDDEN</td><td className="px-4 py-2 text-gray-600">权限不足</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">404</td><td className="px-4 py-2 font-mono text-xs text-gray-500">NOT_FOUND</td><td className="px-4 py-2 text-gray-600">AppKey 无效</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">429</td><td className="px-4 py-2 font-mono text-xs text-gray-500">TOO_MANY_REQUESTS</td><td className="px-4 py-2 text-gray-600">请求频率超限（60次/分钟）</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">1001</td><td className="px-4 py-2 font-mono text-xs text-gray-500">INVALID_SIGNATURE</td><td className="px-4 py-2 text-gray-600">签名校验失败</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">1002</td><td className="px-4 py-2 font-mono text-xs text-gray-500">TIMESTAMP_EXPIRED</td><td className="px-4 py-2 text-gray-600">时间戳偏差超过 30 秒</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">1003</td><td className="px-4 py-2 font-mono text-xs text-gray-500">NONCE_REUSED</td><td className="px-4 py-2 text-gray-600">Nonce 重复使用</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2001</td><td className="px-4 py-2 font-mono text-xs text-gray-500">INVALID_CARD</td><td className="px-4 py-2 text-gray-600">卡密无效</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2002</td><td className="px-4 py-2 font-mono text-xs text-gray-500">CARD_ALREADY_ACTIVATED</td><td className="px-4 py-2 text-gray-600">卡密已被激活</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2003</td><td className="px-4 py-2 font-mono text-xs text-gray-500">CARD_EXPIRED</td><td className="px-4 py-2 text-gray-600">卡密已过期</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2004</td><td className="px-4 py-2 font-mono text-xs text-gray-500">CARD_BANNED</td><td className="px-4 py-2 text-gray-600">卡密已被封禁</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2006</td><td className="px-4 py-2 font-mono text-xs text-gray-500">PROGRAM_DISABLED</td><td className="px-4 py-2 text-gray-600">程序已停用</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2007</td><td className="px-4 py-2 font-mono text-xs text-gray-500">USER_BANNED</td><td className="px-4 py-2 text-gray-600">用户已被封禁</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2008</td><td className="px-4 py-2 font-mono text-xs text-gray-500">HEARTBEAT_TOKEN_INVALID</td><td className="px-4 py-2 text-gray-600">心跳 Token 无效/已使用/已过期</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs text-red-600">2009</td><td className="px-4 py-2 font-mono text-xs text-gray-500">CHALLENGE_FAILED</td><td className="px-4 py-2 text-gray-600">挑战响应校验失败</td></tr>
          </tbody>
        </table>
      </Section>

      <Section id="hardware" title="10. 硬件信息采集指南">
        <p>硬件信息用于生成设备指纹（服务端 SHA-256 哈希），需采集以下字段并序列化为 JSON 字符串：</p>
        <table className="w-full text-sm mt-3">
          <thead><tr className="bg-gray-50"><th className="text-left px-4 py-2 font-medium text-gray-600">字段</th><th className="text-left px-4 py-2 font-medium text-gray-600">类型</th><th className="text-left px-4 py-2 font-medium text-gray-600">说明</th><th className="text-left px-4 py-2 font-medium text-gray-600">采集方式</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2 font-mono text-xs">cpuName</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">CPU 型号</td><td className="px-4 py-2 text-xs text-gray-500">platform.processor() / wmic cpu get Name</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">cpuSerial</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">CPU 序列号</td><td className="px-4 py-2 text-xs text-gray-500">wmic cpu get ProcessorId</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">cpuCores</td><td className="px-4 py-2 text-gray-500">number</td><td className="px-4 py-2 text-gray-600">CPU 核心数</td><td className="px-4 py-2 text-xs text-gray-500">os.cpu_count()</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">cpuArch</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">CPU 架构</td><td className="px-4 py-2 text-xs text-gray-500">platform.machine()</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">mbSerial</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">主板序列号</td><td className="px-4 py-2 text-xs text-gray-500">wmic baseboard get SerialNumber</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">mbManufacturer</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">主板制造商</td><td className="px-4 py-2 text-xs text-gray-500">wmic baseboard get Manufacturer</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">biosUuid</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">BIOS UUID</td><td className="px-4 py-2 text-xs text-gray-500">wmic csproduct get UUID</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">biosVersion</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">BIOS 版本</td><td className="px-4 py-2 text-xs text-gray-500">wmic bios get SMBIOSBIOSVersion</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">diskSerial</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">硬盘序列号</td><td className="px-4 py-2 text-xs text-gray-500">wmic diskdrive get SerialNumber</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">diskModel</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">硬盘型号</td><td className="px-4 py-2 text-xs text-gray-500">wmic diskdrive get Model</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">macAddresses</td><td className="px-4 py-2 text-gray-500">string[]</td><td className="px-4 py-2 text-gray-600">网卡 MAC 地址列表</td><td className="px-4 py-2 text-xs text-gray-500">NetworkInterface / /sys/class/net/*/address</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">totalMemory</td><td className="px-4 py-2 text-gray-500">number</td><td className="px-4 py-2 text-gray-600">总内存（字节）</td><td className="px-4 py-2 text-xs text-gray-500">os.totalmem() / GlobalMemoryStatusEx</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">osName</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">操作系统名称</td><td className="px-4 py-2 text-xs text-gray-500">platform.system()</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">osVersion</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">操作系统版本</td><td className="px-4 py-2 text-xs text-gray-500">platform.version()</td></tr>
            <tr><td className="px-4 py-2 font-mono text-xs">hostname</td><td className="px-4 py-2 text-gray-500">string</td><td className="px-4 py-2 text-gray-600">主机名</td><td className="px-4 py-2 text-xs text-gray-500">socket.gethostname()</td></tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-gray-500">服务端会对硬件信息 JSON 做规范化（按 key 排序 + SHA-256），因此字段名和结构必须保持一致。</p>
      </Section>

      <Section id="flow" title="11. 完整调用流程">
        <div className="space-y-3 text-sm">
          <FlowStep num={1} title="获取挑战" desc="POST /api/client/challenge + 获得 128 位随机 challenge" />
          <FlowStep num={2} title="激活卡密" desc="POST /api/client/activate + 提交 cardKey + username + hardwareInfo + challengeResponse + 获得 userId + encrypted(heartbeatToken)" />
          <FlowStep num={3} title="心跳循环" desc="POST /api/client/heartbeat + 每 60 秒发送一次，使用上次返回的 heartbeatToken + 获得新的 heartbeatToken" />
          <FlowStep num={4} title="登出" desc="POST /api/client/logout + 失效所有 heartbeatToken，结束会话" />
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <strong>建议：</strong>心跳间隔设置为 60 秒，程序的 heartbeatTimeout 建议设置为 120 秒（2 分钟），这样即使一次心跳失败也有重试窗口。
        </div>
      </Section>

      <Section id="examples" title="12. 代码示例">
        <Tabs tabs={[
          { id: 'python', label: 'Python' },
          { id: 'csharp', label: 'C# (.NET)' },
          { id: 'node', label: 'Node.js' },
        ]}>
          <TabContent id="python"><CodeBlock code={PYTHON_EXAMPLE} /></TabContent>
          <TabContent id="csharp"><CodeBlock code={CSHARP_EXAMPLE} /></TabContent>
          <TabContent id="node"><CodeBlock code={NODE_EXAMPLE} /></TabContent>
        </Tabs>
      </Section>
    </div>
  );
}

// ===== 代码常量（避免 JSX 模板字面量解析问题） =====

const SIGNATURE_CODE = [
  "签名原文 = timestamp + nonce + 请求体JSON（排除signature字段）",
  "",
  "signature = HMAC-SHA256(签名原文, appSecret)",
  "",
  "// 伪代码示例",
  "const ts = Date.now();",
  "const nonce = crypto.randomBytes(8).toString('hex');",
  "const body = JSON.stringify({ appKey, cardKey, username, ... });",
  "const signData = ts + nonce + body;",
  "const signature = crypto.createHmac('sha256', appSecret).update(signData).digest('hex');",
  "",
  "// 请求体最终包含 signature 字段",
  "const requestBody = { appKey, cardKey, username, timestamp: ts, nonce, signature };",
].join('\n');

const ENCRYPTION_CODE = [
  "// 加密密钥由 challenge 派生",
  "key = SHA-256(challenge)  // 32 字节",
  "iv  = base64(response.iv)  // 16 字节",
  "encrypted = base64(response.encrypted)",
  "",
  "// AES-256-CBC 解密",
  "plaintext = AES-256-CBC-Decrypt(encrypted, key, iv)",
  "// plaintext 为 JSON 字符串，包含 heartbeatToken 等敏感字段",
].join('\n');

const CHALLENGE_RESPONSE_CODE = [
  "// 获取 challenge",
  'challenge = POST /api/client/challenge -> { "challenge": "a1b2c3..." }',
  "",
  "// 生成 challengeResponse",
  'challengeResponse = challenge + ":" + HMAC-SHA256(challenge + cardKey + username, appSecret)',
].join('\n');

const CHALLENGE_RESP = [
  "{",
  '  "code": 0,',
  '  "message": "ok",',
  '  "data": {',
  '    "challenge": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"',
  "  }",
  "}",
].join('\n');

const ACTIVATE_RESP = [
  "{",
  '  "code": 0,',
  '  "message": "激活成功",',
  '  "data": {',
  '    "userId": "uuid-xxx",',
  '    "encrypted": "base64密文...",',
  '    "iv": "base64初始向量..."',
  "  }",
  "}",
  "",
  "// 解密 encrypted 后得到：",
  "{",
  '  "userId": "uuid-xxx",',
  '  "username": "player_123",',
  '  "heartbeatToken": "uuid-token",',
  '  "expiresAt": "2026-08-15T00:00:00.000Z",',
  '  "maxDevices": 3,',
  '  "deviceCount": 1',
  "}",
].join('\n');

const HEARTBEAT_RESP = [
  "{",
  '  "code": 0,',
  '  "message": "心跳验证成功",',
  '  "data": {',
  '    "userId": "uuid-xxx",',
  '    "encrypted": "base64密文...",',
  '    "iv": "base64初始向量..."',
  "  }",
  "}",
  "",
  "// 解密 encrypted 后得到：",
  "{",
  '  "userId": "uuid-xxx",',
  '  "heartbeatToken": "new-uuid-token",',
  '  "expiresAt": "2026-08-15T00:00:00.000Z",',
  '  "serverTime": "2026-07-15T12:00:00.000Z"',
  "}",
].join('\n');

const LOGOUT_RESP = [
  "{",
  '  "code": 0,',
  '  "message": "登出成功",',
  '  "data": null',
  "}",
].join('\n');

const RESPONSE_FORMAT = [
  "{",
  '  "code": 0,       // 0 = 成功，非 0 = 错误',
  '  "message": "",   // 人类可读的消息',
  '  "data": null     // 响应数据，错误时为 null',
  "}",
].join('\n');

const PYTHON_EXAMPLE = [
  "import hashlib, hmac, json, os, time, requests",
  "from Crypto.Cipher import AES",
  "from Crypto.Util.Padding import unpad",
  "from base64 import b64decode",
  "",
  'API_BASE = "https://your-backend.onrender.com/api"',
  'APP_KEY = "your_app_key"',
  'APP_SECRET = "your_app_secret"',
  "",
  "def hmac_sign(data: str) -> str:",
  "    return hmac.new(APP_SECRET.encode(), data.encode(), hashlib.sha256).hexdigest()",
  "",
  "def send(ep: str, payload: dict) -> dict:",
  "    ts = int(time.time() * 1000)",
  "    nonce = os.urandom(8).hex()",
  "    payload.update(appKey=APP_KEY, timestamp=ts, nonce=nonce)",
  '    body = json.dumps(payload, separators=(",", ":"))',
  '    payload["signature"] = hmac_sign(f"{ts}{nonce}{body}")',
  '    r = requests.post(f"{API_BASE}/client/{ep}", json=payload, timeout=30)',
  "    return r.json()",
  "",
  "def decrypt(enc: str, iv: str, challenge: str) -> str:",
  "    key = hashlib.sha256(challenge.encode()).digest()",
  "    cipher = AES.new(key, AES.MODE_CBC, b64decode(iv))",
  "    return unpad(cipher.decrypt(b64decode(enc)), AES.block_size).decode()",
  "",
  "# 1. 获取挑战",
  'challenge = send("challenge", {})["data"]["challenge"]',
  "",
  "# 2. 激活卡密",
  'cr = challenge + ":" + hmac_sign(challenge + "YOUR_CARD_KEY" + "player_123")',
  'r = send("activate", {"cardKey": "YOUR_CARD_KEY", "username": "player_123", "hardwareInfo": "{}", "challengeResponse": cr})',
  'data = r["data"]',
  'user_id = data["userId"]',
  'decrypted = json.loads(decrypt(data["encrypted"], data["iv"], challenge))',
  'heartbeat_token = decrypted["heartbeatToken"]',
  'print(f"激活成功! userId={user_id}")',
  "",
  "# 3. 心跳循环",
  "while True:",
  "    time.sleep(60)",
  '    r = send("heartbeat", {"userId": user_id, "heartbeatToken": heartbeat_token})',
  '    if r["code"] != 0:',
  "        print(f\"心跳失败: {r['message']}\")",
  "        break",
  '    ch = send("challenge", {})["data"]["challenge"]',
  '    decrypted = json.loads(decrypt(r["data"]["encrypted"], r["data"]["iv"], ch))',
  '    heartbeat_token = decrypted["heartbeatToken"]',
  '    print("心跳成功")',
  "",
  "# 4. 登出",
  'send("logout", {"userId": user_id})',
].join('\n');

const CSHARP_EXAMPLE = [
  "using System.Security.Cryptography;",
  "using System.Text;",
  "using System.Text.Json;",
  "",
  'const string ApiBase = "https://your-backend.onrender.com/api";',
  'const string AppKey = "your_app_key";',
  'const string AppSecret = "your_app_secret";',
  "",
  "static string HmacSign(string data) {",
  "    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(AppSecret));",
  "    return Convert.ToHexStringLower(hmac.ComputeHash(Encoding.UTF8.GetBytes(data)));",
  "}",
  "",
  "static async Task<JsonElement> Send(string ep, Dictionary<string, object> payload) {",
  "    using var http = new HttpClient();",
  "    var ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();",
  "    var nonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(8)).ToLower();",
  '    payload["appKey"] = AppKey; payload["timestamp"] = ts; payload["nonce"] = nonce;',
  "    var body = JsonSerializer.Serialize(payload);",
  '    payload["signature"] = HmacSign($"{ts}{nonce}{body}");',
  '    var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");',
  '    var resp = await http.PostAsync($"{ApiBase}/client/{ep}", content);',
  "    return JsonSerializer.Deserialize<JsonElement>(await resp.Content.ReadAsStringAsync());",
  "}",
  "",
  "# 1. 获取挑战",
  'var chResp = await Send("challenge", new());',
  'var challenge = chResp.GetProperty("data").GetProperty("challenge").GetString();',
  "",
  "# 2. 激活",
  'var cr = $"{challenge}:{HmacSign(challenge + "YOUR_CARD_KEY" + "player_123")}";',
  'var actResp = await Send("activate", new() {',
  '    ["cardKey"] = "YOUR_CARD_KEY", ["username"] = "player_123",',
  '    ["hardwareInfo"] = "{}", ["challengeResponse"] = cr',
  "});",
  'var data = actResp.GetProperty("data");',
  'var userId = data.GetProperty("userId").GetString();',
  "// 解密 encrypted（需要 AES-256-CBC + SHA-256 challenge 派生密钥）",
  'var heartbeatToken = "..."; // 从解密后的 JSON 中获取',
  "",
  "# 3. 心跳（每 60 秒）",
  "while (true) {",
  "    await Task.Delay(60000);",
  '    var hbResp = await Send("heartbeat", new() { ["userId"] = userId, ["heartbeatToken"] = heartbeatToken });',
  "    // 解密并更新 heartbeatToken",
  "}",
  "",
  "# 4. 登出",
  'await Send("logout", new() { ["userId"] = userId });',
].join('\n');

const NODE_EXAMPLE = [
  "const crypto = require('crypto');",
  "",
  "const API_BASE = 'https://your-backend.onrender.com/api';",
  "const APP_KEY = 'your_app_key';",
  "const APP_SECRET = 'your_app_secret';",
  "",
  "function hmacSign(data) {",
  "  return crypto.createHmac('sha256', APP_SECRET).update(data).digest('hex');",
  "}",
  "",
  "async function send(ep, payload = {}) {",
  "  const ts = Date.now();",
  "  const nonce = crypto.randomBytes(8).toString('hex');",
  "  payload.appKey = APP_KEY; payload.timestamp = ts; payload.nonce = nonce;",
  "  const body = JSON.stringify(payload);",
  "  payload.signature = hmacSign(ts + nonce + body);",
  "  const r = await fetch(API_BASE + '/client/' + ep, {",
  "    method: 'POST', headers: { 'Content-Type': 'application/json' },",
  "    body: JSON.stringify(payload)",
  "  });",
  "  return r.json();",
  "}",
  "",
  "function decrypt(enc, iv, challenge) {",
  "  const key = crypto.createHash('sha256').update(challenge).digest();",
  "  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'base64'));",
  "  return decipher.update(Buffer.from(enc, 'base64'), undefined, 'utf8') + decipher.final('utf8');",
  "}",
  "",
  "(async () => {",
  "  // 1. 获取挑战",
  "  const ch = (await send('challenge')).data.challenge;",
  "",
  "  // 2. 激活",
  "  const cr = ch + ':' + hmacSign(ch + 'YOUR_CARD_KEY' + 'player_123');",
  "  const r = await send('activate', { cardKey: 'YOUR_CARD_KEY', username: 'player_123', hardwareInfo: '{}', challengeResponse: cr });",
  "  const { userId, encrypted, iv } = r.data;",
  "  const dec = JSON.parse(decrypt(encrypted, iv, ch));",
  "  let hbToken = dec.heartbeatToken;",
  "  console.log('激活成功, userId:', userId);",
  "",
  "  // 3. 心跳循环",
  "  setInterval(async () => {",
  "    try {",
  "      const hb = await send('heartbeat', { userId, heartbeatToken: hbToken });",
  "      if (hb.code !== 0) { console.error('心跳失败:', hb.message); return; }",
  "      const ch2 = (await send('challenge')).data.challenge;",
  "      const dec2 = JSON.parse(decrypt(hb.data.encrypted, hb.data.iv, ch2));",
  "      hbToken = dec2.heartbeatToken;",
  "      console.log('心跳成功');",
  "    } catch (e) { console.error(e); }",
  "  }, 60000);",
  "",
  "  // 4. 登出（进程退出时）",
  "  process.on('SIGINT', async () => {",
  "    await send('logout', { userId });",
  "    process.exit();",
  "  });",
  "})();",
].join('\n');

// ===== 辅助组件 =====

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function EndpointBadge({ method, path }: { method: string; path: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-green-50 text-green-700 border-green-200',
    POST: 'bg-blue-50 text-blue-700 border-blue-200',
    PUT: 'bg-amber-50 text-amber-700 border-amber-200',
    DELETE: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-gray-50">
      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${colors[method] || 'bg-gray-100 text-gray-600'}`}>{method}</span>
      <code className="text-sm font-mono text-gray-700">{path}</code>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="bg-gray-900 text-gray-100 rounded-xl p-4 mt-2 overflow-x-auto">
      <pre className="text-xs leading-relaxed font-mono whitespace-pre">{code}</pre>
    </div>
  );
}

function FlowStep({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
        {num}
      </div>
      <div>
        <span className="font-medium text-gray-800">{title}</span>
        <span className="text-gray-500 ml-2">{desc}</span>
      </div>
    </div>
  );
}

function Tabs({ tabs, children }: { tabs: { id: string; label: string }[]; children: React.ReactNode }) {
  const [active, setActive] = useState(tabs[0]?.id || '');
  const activeTab = Children.toArray(children).find(
    child => isValidElement(child) && child.props.id === active
  );
  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-gray-100">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab || null}
    </div>
  );
}

function TabContent({ id, children }: { id: string; children: React.ReactNode }) {
  return <div>{children}</div>;
}