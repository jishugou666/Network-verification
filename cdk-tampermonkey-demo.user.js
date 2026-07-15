// ==UserScript==
// @name         CDK 卡密验证 + 远程脚本加载
// @namespace    https://cdk.lat
// @version      2.0
// @description  任何网站打开时显示卡密验证弹窗，验证成功后从服务器拉取加密脚本并执行
// @author       CDK
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ============ 配置（需要修改为你的程序参数） ============
  var API_BASE = 'https://network-verification.onrender.com/api';
  var APP_KEY = 'beb5da7f40b9b8bc005117928ff8abea';
  var APP_SECRET = 'd628259d617c8ded72f3d663ddb59eceb4ea556d7f3e069bdc7907cc92be373b';

  // ============ 加密工具（Web Crypto API，无外部依赖） ============
  async function hmacSign(data) {
    var encoder = new TextEncoder();
    var key = await crypto.subtle.importKey(
      'raw', encoder.encode(APP_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    var sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return Array.from(new Uint8Array(sig)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function sha256Bytes(data) {
    var hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return new Uint8Array(hash);
  }

  async function aesCbcDecrypt(encBase64, ivBase64, keyBytes) {
    var iv = Uint8Array.from(atob(ivBase64), function (c) { return c.charCodeAt(0); });
    var encrypted = Uint8Array.from(atob(encBase64), function (c) { return c.charCodeAt(0); });
    var cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
    var decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: iv }, cryptoKey, encrypted);
    return new TextDecoder().decode(decrypted);
  }

  async function sendRequest(ep, payload) {
    payload = payload || {};
    var ts = Date.now();
    var nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    payload.appKey = APP_KEY;
    payload.timestamp = ts;
    payload.nonce = nonce;
    var body = JSON.stringify(payload);
    payload.signature = await hmacSign(ts + nonce + body);
    var resp = await fetch(API_BASE + '/client/' + ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return resp.json();
  }

  function collectBrowserFingerprint() {
    return JSON.stringify({
      cpuName: (navigator.hardwareConcurrency || 1) + ' cores',
      cpuCores: navigator.hardwareConcurrency || 1,
      cpuArch: navigator.platform || 'unknown',
      cpuSerial: '', mbSerial: '', mbManufacturer: '', biosUuid: '', biosVersion: '',
      diskSerial: '', diskModel: '',
      macAddresses: ['00:00:00:00:00:00'],
      totalMemory: 0,
      osName: navigator.platform || 'unknown',
      osVersion: navigator.userAgent || 'unknown',
      hostname: window.location.hostname,
      machineArch: navigator.platform || 'unknown',
      screenResolution: screen.width + 'x' + screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    });
  }

  // ============ 样式 ============
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '.cdk-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cdk-modal{background:#fff;border-radius:20px;width:420px;max-width:92vw;box-shadow:0 25px 60px rgba(0,0,0,0.3);overflow:hidden;animation:cdk-in 0.3s ease}',
      '@keyframes cdk-in{from{opacity:0;transform:scale(0.92) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}',
      '.cdk-header{padding:28px 24px;color:#fff;text-align:center}',
      '.cdk-header h2{margin:0;font-size:20px;font-weight:700}',
      '.cdk-header p{margin:6px 0 0;font-size:13px;opacity:0.85}',
      '.cdk-body{padding:24px}',
      '.cdk-input{width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:14px;outline:0;box-sizing:border-box;transition:border-color 0.2s}',
      '.cdk-input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.1)}',
      '.cdk-label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px}',
      '.cdk-field{margin-bottom:16px}',
      '.cdk-btn{width:100%;padding:12px;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.2s;color:#fff;background:linear-gradient(135deg,#3b82f6,#6366f1);box-shadow:0 4px 14px rgba(59,130,246,0.35)}',
      '.cdk-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(59,130,246,0.45)}',
      '.cdk-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}',
      '.cdk-error{background:#fef2f2;color:#dc2626;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:12px}',
      '.cdk-success-icon{width:64px;height:64px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}',
      '.cdk-success-icon svg{width:32px;height:32px;color:#fff}',
      '.cdk-info-row{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;border-bottom:1px solid #f1f5f9}',
      '.cdk-info-label{color:#6b7280}',
      '.cdk-info-value{color:#1f2937;font-weight:500}',
      '.cdk-spinner{width:20px;height:20px;border:2.5px solid #fff;border-top-color:transparent;border-radius:50%;animation:cdk-spin 0.7s linear infinite;margin:0 auto}',
      '@keyframes cdk-spin{to{transform:rotate(360deg)}}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ============ 检查是否已验证 ============
  var saved = GM_getValue('cdk_verified', null);
  if (saved && saved.userId && saved.heartbeatToken) {
    loadAndExecuteScript(saved.userId, saved.heartbeatToken, saved.username, saved.expiresAt);
    return;
  }

  // 清除无效保存
  GM_deleteValue('cdk_verified');

  // ============ 主流程 ============
  injectStyles();
  showLoginDialog();

  function showLoginDialog() {
    var cardKey = '';
    var username = '';
    var errorMsg = '';
    var loading = false;

    function render() {
      removeOverlay();
      var overlay = document.createElement('div');
      overlay.className = 'cdk-overlay';

      if (loading) {
        overlay.innerHTML = '<div class="cdk-modal"><div class="cdk-header" style="background:linear-gradient(135deg,#3b82f6,#6366f1)"><h2>验证中...</h2><p>正在校验卡密并加载功能脚本</p></div><div class="cdk-body" style="text-align:center;padding:50px 24px"><div class="cdk-spinner" style="border-color:#3b82f6;border-top-color:transparent"></div><p style="margin-top:16px;font-size:13px;color:#6b7280">请耐心等待...</p></div></div>';
      } else {
        overlay.innerHTML = [
          '<div class="cdk-modal">',
          '<div class="cdk-header" style="background:linear-gradient(135deg,#3b82f6,#6366f1)">',
          '<h2> 卡密验证</h2>',
          '<p>请输入卡密以激活并使用功能</p>',
          '</div>',
          '<div class="cdk-body">',
          errorMsg ? '<div class="cdk-error">' + escHtml(errorMsg) + '</div>' : '',
          '<div class="cdk-field"><label class="cdk-label">卡密</label><input class="cdk-input cdk-card" type="text" placeholder="请输入卡密" value="' + escHtml(cardKey) + '" autocomplete="off" /></div>',
          '<div class="cdk-field"><label class="cdk-label">用户名</label><input class="cdk-input cdk-user" type="text" placeholder="请输入用户名" value="' + escHtml(username) + '" autocomplete="off" /></div>',
          '<button class="cdk-btn cdk-submit" type="button">验证并激活</button>',
          '</div>',
          '</div>',
        ].join('\n');
      }
      document.body.appendChild(overlay);

      if (!loading) {
        var cardInput = overlay.querySelector('.cdk-card');
        var userInput = overlay.querySelector('.cdk-user');
        var submitBtn = overlay.querySelector('.cdk-submit');

        cardInput.addEventListener('input', function () { cardKey = this.value; });
        userInput.addEventListener('input', function () { username = this.value; });
        submitBtn.addEventListener('click', handleActivate);
        cardInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') userInput.focus(); });
        userInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleActivate(); });
        setTimeout(function () { cardInput.focus(); }, 100);
      }
    }

    async function handleActivate() {
      if (!cardKey.trim()) { errorMsg = '请输入卡密'; render(); return; }
      if (!username.trim()) { errorMsg = '请输入用户名'; render(); return; }

      loading = true;
      errorMsg = '';
      render();

      try {
        var hw = collectBrowserFingerprint();

        // 1. 获取挑战
        var chResp = await sendRequest('challenge');
        if (chResp.code !== 0) throw new Error(chResp.message);
        var challenge = chResp.data.challenge;

        // 2. 激活卡密
        var cr = challenge + ':' + await hmacSign(challenge + cardKey.trim() + username.trim());
        var actResp = await sendRequest('activate', {
          cardKey: cardKey.trim(),
          username: username.trim(),
          hardwareInfo: hw,
          challengeResponse: cr,
        });
        if (actResp.code !== 0) throw new Error(actResp.message);

        // 3. 解密响应获取 heartbeatToken
        var d = actResp.data;
        var decrypted = JSON.parse(await aesCbcDecrypt(d.encrypted, d.iv, await sha256Bytes(challenge)));

        var userId = d.userId;
        var hbToken = decrypted.heartbeatToken;
        var expiresAt = decrypted.expiresAt;
        var maxDevices = decrypted.maxDevices;
        var deviceCount = decrypted.deviceCount;

        // 4. 保存验证状态
        GM_setValue('cdk_verified', {
          userId: userId,
          username: username.trim(),
          heartbeatToken: hbToken,
          expiresAt: expiresAt,
          maxDevices: maxDevices,
          deviceCount: deviceCount,
        });

        // 5. 拉取并执行远程脚本
        removeOverlay();
        await loadAndExecuteScript(userId, hbToken, username.trim(), expiresAt);
      } catch (e) {
        loading = false;
        errorMsg = e.message || '验证失败，请重试';
        render();
      }
    }

    render();
  }

  function removeOverlay() {
    var existing = document.querySelectorAll('.cdk-overlay');
    existing.forEach(function (el) { el.remove(); });
  }

  // ============ 远程脚本加载与执行 ============
  async function loadAndExecuteScript(userId, hbToken, username, expiresAt) {
    try {
      // 1. 从服务器拉取加密脚本
      var resp = await sendRequest('script', {
        userId: userId,
        heartbeatToken: hbToken,
      });

      if (resp.code === 2010) {
        // 脚本未启用，直接显示成功
        showSuccessOverlay(userId, username, expiresAt, null);
        startHeartbeat(userId, hbToken);
        return;
      }

      if (resp.code !== 0) throw new Error('脚本加载失败: ' + resp.message);

      // 2. 解密脚本（AES-256-CBC，密钥由 challenge SHA-256 派生）
      var d = resp.data;
      var keyBytes = await sha256Bytes(d.challenge);
      var scriptCode = await aesCbcDecrypt(d.encrypted, d.iv, keyBytes);

      // 3. 执行脚本
      try {
        var scriptFn = new Function(scriptCode);
        scriptFn.call(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
        showSuccessOverlay(userId, username, expiresAt, d.scriptSize || scriptCode.length);
      } catch (execErr) {
        // 脚本语法错误，仍然显示成功（卡密验证已通过），但提示脚本问题
        showSuccessOverlay(userId, username, expiresAt, null,
          '脚本执行失败: ' + execErr.message);
      }

      // 4. 启动心跳
      startHeartbeat(userId, hbToken);
    } catch (e) {
      // 脚本拉取失败，显示基本成功信息
      showSuccessOverlay(userId, username, expiresAt, null,
        '远程脚本加载失败: ' + e.message);
      startHeartbeat(userId, hbToken);
    }
  }

  function showSuccessOverlay(userId, username, expiresAt, scriptSize, warning) {
    removeOverlay();
    var ov = document.createElement('div');
    ov.className = 'cdk-overlay';
    ov.innerHTML = [
      '<div class="cdk-modal">',
      '<div class="cdk-header" style="background:linear-gradient(135deg,#10b981,#059669)">',
      '<h2>验证成功</h2>',
      '<p>脚本已加载，功能已激活</p>',
      '</div>',
      '<div class="cdk-body">',
      '<div class="cdk-success-icon">',
      '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',
      '</div>',
      '<div class="cdk-info-row"><span class="cdk-info-label">用户 ID</span><span class="cdk-info-value">' + escHtml(userId) + '</span></div>',
      '<div class="cdk-info-row"><span class="cdk-info-label">用户名</span><span class="cdk-info-value">' + escHtml(username) + '</span></div>',
      '<div class="cdk-info-row"><span class="cdk-info-label">过期时间</span><span class="cdk-info-value">' + (expiresAt ? new Date(expiresAt).toLocaleString('zh-CN') : '永久') + '</span></div>',
      scriptSize !== null ? '<div class="cdk-info-row"><span class="cdk-info-label">脚本大小</span><span class="cdk-info-value">' + scriptSize.toLocaleString() + ' 字节</span></div>' : '',
      warning ? '<div class="cdk-error" style="margin-top:12px">' + escHtml(warning) + '</div>' : '',
      '<div style="margin-top:20px;display:flex;gap:10px">',
      '<button class="cdk-btn cdk-close" style="flex:1;background:#e2e8f0;color:#374151;box-shadow:none">关闭</button>',
      '<button class="cdk-btn cdk-logout" style="flex:1;background:#ef4444;box-shadow:0 4px 14px rgba(239,68,68,0.35)">注销</button>',
      '</div>',
      '</div>',
      '</div>',
    ].join('\n');
    document.body.appendChild(ov);

    ov.querySelector('.cdk-close').addEventListener('click', function () { ov.remove(); });
    ov.querySelector('.cdk-logout').addEventListener('click', async function () {
      try { await sendRequest('logout', { userId: userId }); } catch (e) {}
      GM_deleteValue('cdk_verified');
      ov.remove();
      showLoginDialog();
    });
    // 5 秒后自动关闭浮层
    setTimeout(function () { if (document.body.contains(ov)) ov.remove(); }, 5000);
  }

  // ============ 心跳保活 ============
  function startHeartbeat(userId, hbToken) {
    var token = hbToken;
    setInterval(async function () {
      try {
        var resp = await sendRequest('heartbeat', { userId: userId, heartbeatToken: token });
        if (resp.code !== 0) {
          console.warn('[CDK] 心跳失败:', resp.message);
          GM_deleteValue('cdk_verified');
          return;
        }
        var chResp = await sendRequest('challenge');
        var ch = chResp.data.challenge;
        var dec = JSON.parse(await aesCbcDecrypt(resp.data.encrypted, resp.data.iv, await sha256Bytes(ch)));
        token = dec.heartbeatToken;
        var saved = GM_getValue('cdk_verified', {});
        saved.heartbeatToken = token;
        saved.expiresAt = dec.expiresAt;
        GM_setValue('cdk_verified', saved);
        console.log('[CDK] 心跳成功');
      } catch (e) {
        console.warn('[CDK] 心跳异常:', e.message);
      }
    }, 60000);
  }

  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();