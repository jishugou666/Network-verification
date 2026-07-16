// ==UserScript==
// @name         CDK 卡密验证 Demo
// @namespace    https://cdk.lat
// @version      3.0
// @description  卡密验证演示脚本
// @author       CDK
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-end
// ==/UserScript==

(function() {
  'use strict';

  console.log('[CDK] === 脚本启动 ===');

  // ===== 配置 =====
  var API = 'https://network-verification.onrender.com/api';
  var AK = 'beb5da7f40b9b8bc005117928ff8abea';
  var AS = 'd628259d617c8ded72f3d663ddb59eceb4ea556d7f3e069bdc7907cc92be373b';

  // ===== 注入样式 =====
  var style = document.createElement('style');
  style.id = 'cdk-style';
  style.textContent = '.cdk-wrap{position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;z-index:2147483647 !important;background:rgba(0,0,0,0.6) !important;display:flex !important;align-items:center !important;justify-content:center !important}.cdk-box{background:#fff !important;border-radius:18px !important;width:360px !important;max-width:90vw !important;overflow:hidden !important;box-shadow:0 20px 50px rgba(0,0,0,0.4) !important;font-family:Arial,sans-serif !important}.cdk-hd{padding:26px 20px !important;background:linear-gradient(135deg,#3b82f6,#6366f1) !important;color:#fff !important;text-align:center !important}.cdk-hd h2{margin:0 !important;font-size:19px !important}.cdk-hd p{margin:4px 0 0 !important;font-size:12px !important;opacity:0.85 !important}.cdk-bd{padding:24px 20px !important}.cdk-bd input{width:100% !important;padding:12px !important;border:1.5px solid #d1d5db !important;border-radius:10px !important;font-size:14px !important;outline:none !important;box-sizing:border-box !important;margin-bottom:14px !important;text-align:center !important;letter-spacing:2px !important}.cdk-bd button{width:100% !important;padding:12px !important;border:none !important;border-radius:10px !important;font-size:15px !important;font-weight:bold !important;cursor:pointer !important;color:#fff !important;background:linear-gradient(135deg,#3b82f6,#6366f1) !important}.cdk-bd button:disabled{opacity:0.6 !important;cursor:not-allowed !important}.cdk-err{background:#fee2e2 !important;color:#dc2626 !important;padding:10px 14px !important;border-radius:8px !important;font-size:12px !important;margin-bottom:14px !important;text-align:center !important}';
  document.head.appendChild(style);

  // ===== 加密工具 =====
  async function hmacSign(data, key) {
    var k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    var sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
    return Array.from(new Uint8Array(sig)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function sha256(data) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
      .then(function(h) { return new Uint8Array(h); });
  }

  async function aesCbcDecrypt(encB64, ivB64, keyBytes) {
    var iv = Uint8Array.from(atob(ivB64), function(c) { return c.charCodeAt(0); });
    var ct = Uint8Array.from(atob(encB64), function(c) { return c.charCodeAt(0); });
    var ck = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-CBC', iv: iv }, ck, ct));
  }

  // ===== API 请求 =====
  async function apiRequest(ep, payload) {
    payload = payload || {};
    var ts = Date.now();
    var nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    payload.appKey = AK;
    payload.timestamp = ts;
    payload.nonce = nonce;
    var bodyStr = JSON.stringify(payload);
    payload.signature = await hmacSign(ts + nonce + bodyStr, AS);
    var resp = await fetch(API + '/client/' + ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return resp.json();
  }

  // ===== 设备指纹 =====
  function getDeviceFingerprint() {
    var hw = {
      cpuName: 'browser', cpuCores: navigator.hardwareConcurrency || 1,
      cpuArch: navigator.platform || 'web', cpuSerial: '',
      mbSerial: '', mbManufacturer: '', biosUuid: '', biosVersion: '',
      diskSerial: '', diskModel: '',
      macAddresses: ['00:00:00:00:00:00'], totalMemory: 0,
      osName: navigator.platform || 'web', osVersion: navigator.userAgent || '',
      hostname: location.hostname, machineArch: navigator.platform || '',
      screenResolution: screen.width + 'x' + screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };
    return JSON.stringify(hw, Object.keys(hw).sort());
  }

  // ===== 全局状态 =====
  var gHW = getDeviceFingerprint();
  var gHeartbeatToken = null;
  var gHeartbeatTimer = null;

  // ===== UI 工具 =====
  function removeAll() {
    var els = document.querySelectorAll('.cdk-wrap');
    for (var i = 0; i < els.length; i++) els[i].remove();
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ===== 心跳 =====
  function startHeartbeat(uid, tk) {
    stopHeartbeat();
    gHeartbeatToken = tk;
    gHeartbeatTimer = setInterval(async function() {
      var t = gHeartbeatToken;
      try {
        var r = await apiRequest('heartbeat', { userId: uid, heartbeatToken: t });
        if (r.code !== 0) {
          GM_deleteValue('cdk_cache');
          return;
        }
        var k = await sha256(r.data.challenge);
        var dec = JSON.parse(await aesCbcDecrypt(r.data.encrypted, r.data.iv, k));
        gHeartbeatToken = dec.heartbeatToken;
        GM_setValue('cdk_cache', { uid: uid, tk: gHeartbeatToken, hw: gHW, exp: dec.expiresAt });
      } catch (e) {
        // 静默处理
      }
    }, 60000);
  }

  function stopHeartbeat() {
    if (gHeartbeatTimer) { clearInterval(gHeartbeatTimer); gHeartbeatTimer = null; }
    gHeartbeatToken = null;
  }

  // ===== 成功弹窗 =====
  function showSuccess(uid, scriptSize, warnMsg) {
    removeAll();
    stopHeartbeat();
    var o = document.createElement('div');
    o.className = 'cdk-wrap';
    var szHtml = '';
    if (scriptSize !== null && scriptSize !== undefined) {
      szHtml = '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span style="color:#888">脚本</span><span style="font-weight:bold">' + scriptSize.toLocaleString() + ' 字节</span></div>';
    }
    var warnHtml = warnMsg ? '<div class="cdk-err" style="margin-top:8px">' + escapeHtml(warnMsg) + '</div>' : '';
    o.innerHTML = '<div class="cdk-box"><div class="cdk-hd" style="background:linear-gradient(135deg,#10b981,#059669) !important"><h2>验证成功</h2><p>功能已激活</p></div><div class="cdk-bd"><div style="text-align:center;font-size:40px;margin-bottom:12px">&#10004;</div><div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span style="color:#888">用户ID</span><span style="font-weight:bold">' + escapeHtml(uid) + '</span></div>' + szHtml + warnHtml + '<div style="display:flex;gap:8px;margin-top:16px"><button id="cdk-cls" style="flex:1;padding:10px;border:none;border-radius:8px;font-size:13px;cursor:pointer;background:#e5e7eb;color:#374151;font-weight:bold">关闭</button><button id="cdk-out" style="flex:1;padding:10px;border:none;border-radius:8px;font-size:13px;cursor:pointer;background:#ef4444;color:#fff;font-weight:bold">注销</button></div></div></div>';
    document.body.appendChild(o);

    document.getElementById('cdk-cls').onclick = function() { o.remove(); };
    document.getElementById('cdk-out').onclick = async function() {
      try { await apiRequest('logout', { userId: uid }); } catch (e) {}
      GM_deleteValue('cdk_cache');
      stopHeartbeat();
      o.remove();
      showLogin();
    };
    setTimeout(function() { if (o.parentNode) o.remove(); }, 5000);
  }

  // ===== 登录弹窗 =====
  function showLogin() {
    removeAll();
    stopHeartbeat();
    var w = document.createElement('div');
    w.className = 'cdk-wrap';
    w.innerHTML = '<div class="cdk-box"><div class="cdk-hd"><h2>卡密验证</h2><p>请输入卡密以激活</p></div><div class="cdk-bd"><input class="cdk-in" type="text" placeholder="请输入卡密" autocomplete="off"><button class="cdk-btn">验证并激活</button></div></div>';
    document.body.appendChild(w);
    console.log('[CDK] 弹窗已显示');

    var input = w.querySelector('.cdk-in');
    var btn = w.querySelector('.cdk-btn');
    var errEl = null;

    function showErr(msg) {
      if (errEl) errEl.remove();
      errEl = document.createElement('div');
      errEl.className = 'cdk-err';
      errEl.textContent = msg;
      var bd = w.querySelector('.cdk-bd');
      bd.insertBefore(errEl, bd.firstChild);
    }

    btn.addEventListener('click', async function() {
      var cardKey = input.value.trim();
      if (!cardKey) { showErr('请输入卡密'); input.focus(); return; }
      if (errEl) { errEl.remove(); errEl = null; }
      btn.disabled = true;
      btn.textContent = '验证中...';

      var challenge = '';
      try {
        console.log('[CDK] 获取 challenge');
        var cr = await apiRequest('challenge');
        challenge = cr.data.challenge;

        var sig = await hmacSign(challenge + cardKey + gHW, AS);
        console.log('[CDK] 激活卡密');
        var r = await apiRequest('activate', {
          cardKey: cardKey,
          username: gHW,
          hardwareInfo: gHW,
          challengeResponse: challenge + ':' + sig
        });
        console.log('[CDK] 激活响应 code:', r.code);

        if (r.code !== 0) {
          showErr(r.message);
          btn.disabled = false;
          btn.textContent = '验证并激活';
          return;
        }

        var d = r.data;
        var k = await sha256(challenge);
        var dec = JSON.parse(await aesCbcDecrypt(d.encrypted, d.iv, k));
        var uid = d.userId;
        var tk = dec.heartbeatToken;

        GM_setValue('cdk_cache', { uid: uid, tk: tk, hw: gHW, exp: dec.expiresAt });
        console.log('[CDK] 激活成功, uid:', uid);

        removeAll();
        await loadAndExecScript(uid, tk);
      } catch (e) {
        console.error('[CDK] 异常:', e);
        showErr(e.message || '网络错误，请重试');
        btn.disabled = false;
        btn.textContent = '验证并激活';
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') btn.click();
    });
    setTimeout(function() { input.focus(); }, 200);
  }

  // ===== 加载并执行远程脚本 =====
  async function loadAndExecScript(uid, tk) {
    try {
      console.log('[CDK] 拉取脚本');
      var r = await apiRequest('script', { userId: uid, heartbeatToken: tk });

      // 脚本未启用或不存在 = 正常
      if (r.code === 2010 || r.code === 404) {
        showSuccess(uid, null, null);
        startHeartbeat(uid, tk);
        return;
      }

      if (r.code !== 0) {
        showSuccess(uid, null, '脚本获取失败: ' + r.message);
        startHeartbeat(uid, tk);
        return;
      }

      var d = r.data;
      var k = await sha256(d.challenge);
      var code = await aesCbcDecrypt(d.encrypted, d.iv, k);
      console.log('[CDK] 脚本解密完成, 大小:', code.length);

      var sz = d.scriptSize || code.length;
      var warnMsg = null;
      try {
        new Function(code)();
      } catch (ee) {
        warnMsg = '执行失败: ' + ee.message;
      }
      showSuccess(uid, sz, warnMsg);
      startHeartbeat(uid, tk);
    } catch (e) {
      console.error('[CDK] 脚本加载失败:', e.message);
      showSuccess(uid, null, '加载失败: ' + e.message);
      startHeartbeat(uid, tk);
    }
  }

  // ===== 启动 =====
  var cached = GM_getValue('cdk_cache', null);
  if (cached && cached.uid && cached.tk) {
    console.log('[CDK] 已激活，加载脚本');
    loadAndExecScript(cached.uid, cached.tk);
  } else {
    GM_deleteValue('cdk_cache');
    showLogin();
  }

  console.log('[CDK] === 初始化完成 ===');
})();
