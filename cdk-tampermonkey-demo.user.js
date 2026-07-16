// ==UserScript==
// @name         CDK 卡密验证
// @namespace    https://cdk.lat
// @version      2.3
// @description  仅需输入卡密即可激活
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

  var API = 'https://network-verification.onrender.com/api';
  var APP_KEY = 'beb5da7f40b9b8bc005117928ff8abea';
  var APP_SECRET = 'd628259d617c8ded72f3d663ddb59eceb4ea556d7f3e069bdc7907cc92be373b';

  var style = document.createElement('style');
  style.id = 'cdk-style';
  style.textContent = '.cdk-wrap{position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;z-index:2147483647 !important;background:rgba(0,0,0,0.6) !important;display:flex !important;align-items:center !important;justify-content:center !important}.cdk-box{background:#fff !important;border-radius:18px !important;width:360px !important;max-width:90vw !important;overflow:hidden !important;box-shadow:0 20px 50px rgba(0,0,0,0.4) !important;font-family:Arial,sans-serif !important}.cdk-hd{padding:26px 20px !important;background:linear-gradient(135deg,#3b82f6,#6366f1) !important;color:#fff !important;text-align:center !important}.cdk-hd h2{margin:0 !important;font-size:19px !important}.cdk-hd p{margin:4px 0 0 !important;font-size:12px !important;opacity:0.85 !important}.cdk-bd{padding:24px 20px !important}.cdk-bd input{width:100% !important;padding:12px !important;border:1.5px solid #d1d5db !important;border-radius:10px !important;font-size:14px !important;outline:none !important;box-sizing:border-box !important;margin-bottom:14px !important;text-align:center !important;letter-spacing:2px !important}.cdk-bd button{width:100% !important;padding:12px !important;border:none !important;border-radius:10px !important;font-size:15px !important;font-weight:bold !important;cursor:pointer !important;color:#fff !important;background:linear-gradient(135deg,#3b82f6,#6366f1) !important}.cdk-bd button:disabled{opacity:0.6 !important;cursor:not-allowed !important}.cdk-err{background:#fee2e2 !important;color:#dc2626 !important;padding:10px 14px !important;border-radius:8px !important;font-size:12px !important;margin-bottom:14px !important;text-align:center !important}';
  document.head.appendChild(style);

  // ===== 加密工具 =====
  async function hmacSign(d) {
    var key = await crypto.subtle.importKey('raw', new TextEncoder().encode(APP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    var sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(d));
    return Array.from(new Uint8Array(sig)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  async function sha256(d) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(d))); }
  async function decrypt(enc, iv, keyBytes) {
    var ivBuf = Uint8Array.from(atob(iv), function(c) { return c.charCodeAt(0); });
    var encBuf = Uint8Array.from(atob(enc), function(c) { return c.charCodeAt(0); });
    var ck = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivBuf }, ck, encBuf));
  }
  async function send(ep, payload) {
    payload = payload || {};
    var ts = Date.now();
    var nonce = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    payload.appKey = APP_KEY; payload.timestamp = ts; payload.nonce = nonce;
    var body = JSON.stringify(payload);
    payload.signature = await hmacSign(ts + nonce + body);
    var resp = await fetch(API + '/client/' + ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return resp.json();
  }

  // ===== 设备指纹生成（与服务端 hashDeviceFingerprint 完全一致） =====
  function getDeviceFingerprint() {
    var hw = {
      cpuName: 'browser',
      cpuCores: navigator.hardwareConcurrency || 1,
      cpuArch: navigator.platform || 'web',
      cpuSerial: '',
      mbSerial: '',
      mbManufacturer: '',
      biosUuid: '',
      biosVersion: '',
      diskSerial: '',
      diskModel: '',
      macAddresses: ['00:00:00:00:00:00'],
      totalMemory: 0,
      osName: navigator.platform || 'web',
      osVersion: navigator.userAgent || '',
      hostname: location.hostname,
      machineArch: navigator.platform || '',
      screenResolution: screen.width + 'x' + screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };
    var sorted = JSON.stringify(hw, Object.keys(hw).sort());
    return sorted;
  }

  // ===== 检查缓存 =====
  var cached = GM_getValue('cdk_ok', null);
  if (cached && cached.uid && cached.tk) {
    console.log('[CDK] 已激活，加载脚本');
    loadScript(cached.uid, cached.tk, cached.hw);
    return;
  }
  GM_deleteValue('cdk_ok');

  showLogin();

  function rm() {
    var els = document.querySelectorAll('.cdk-wrap');
    for (var i = 0; i < els.length; i++) els[i].remove();
  }

  function showLogin() {
    rm();
    var w = document.createElement('div');
    w.className = 'cdk-wrap';
    w.innerHTML = '<div class="cdk-box"><div class="cdk-hd"><h2>卡密验证</h2><p>请输入卡密以激活</p></div><div class="cdk-bd"><input class="cdk-in" type="text" placeholder="请输入卡密" autocomplete="off"><button class="cdk-btn">验证并激活</button></div></div>';
    document.body.appendChild(w);
    console.log('[CDK] 弹窗已显示');

    var input = w.querySelector('.cdk-in');
    var btn = w.querySelector('.cdk-btn');
    var errDiv = null;

    function setErr(msg) {
      if (errDiv) errDiv.remove();
      errDiv = document.createElement('div');
      errDiv.className = 'cdk-err';
      errDiv.textContent = msg;
      w.querySelector('.cdk-bd').insertBefore(errDiv, w.querySelector('.cdk-bd').firstChild);
    }

    btn.addEventListener('click', async function() {
      var ck = input.value.trim();
      if (!ck) { setErr('请输入卡密'); input.focus(); return; }
      if (errDiv) errDiv.remove();

      btn.disabled = true;
      btn.textContent = '验证中...';

      var hw = getDeviceFingerprint(); // 设备指纹同时作为 username

      try {
        console.log('[CDK] 获取challenge');
        var ch = (await send('challenge')).data.challenge;
        var cr = ch + ':' + await hmacSign(ch + ck + hw);
        console.log('[CDK] 激活卡密');
        var r = await send('activate', {
          cardKey: ck, username: hw, hardwareInfo: hw, challengeResponse: cr,
        });
        console.log('[CDK] 激活响应 code:', r.code);
        if (r.code !== 0) { setErr(r.message); btn.disabled = false; btn.textContent = '验证并激活'; return; }

        var d = r.data;
        var dec = JSON.parse(await decrypt(d.encrypted, d.iv, await sha256(ch)));
        var uid = d.userId, tk = dec.heartbeatToken;
        GM_setValue('cdk_ok', { uid: uid, hw: hw, tk: tk, exp: dec.expiresAt });
        console.log('[CDK] 激活成功, uid:', uid);

        rm();
        await loadScript(uid, tk, hw);
      } catch(e) {
        console.error('[CDK] 异常:', e);
        setErr(e.message || '网络错误，请重试');
        btn.disabled = false;
        btn.textContent = '验证并激活';
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') btn.click();
    });

    setTimeout(function() { input.focus(); }, 200);
  }

  async function loadScript(uid, tk, un) {
    try {
      console.log('[CDK] 拉取脚本');
      var r = await send('script', { userId: uid, heartbeatToken: tk });
      if (r.code === 2010 || r.code === 404) { showOk(uid, un, null); heartbeat(uid, tk); return; }
      if (r.code !== 0) throw new Error(r.message);
      var d = r.data;
      var code = await decrypt(d.encrypted, d.iv, await sha256(d.challenge));
      console.log('[CDK] 脚本解密完成, 大小:', code.length);
      try {
        var fn = new Function(code);
        fn.call(window); // 用 window 而不是 unsafeWindow
        showOk(uid, un, d.scriptSize || code.length);
      } catch(e) { showOk(uid, un, null, '执行失败: '+e.message); }
      heartbeat(uid, tk);
    } catch(e) { console.error('[CDK] 脚本加载失败:', e.message); showOk(uid, un, null, '加载失败: '+e.message); heartbeat(uid, tk); }
  }

  function showOk(uid, un, sz, warn) {
    rm();
    var w = document.createElement('div'); w.className = 'cdk-wrap';
    w.innerHTML = '<div class="cdk-box"><div class="cdk-hd" style="background:linear-gradient(135deg,#10b981,#059669) !important"><h2>验证成功</h2><p>功能已激活</p></div><div class="cdk-bd"><div style="text-align:center;font-size:40px;margin-bottom:12px">&#10004;</div><div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span style="color:#888">用户ID</span><span style="font-weight:bold">'+e(uid)+'</span></div><div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span style="color:#888">用户名</span><span style="font-weight:bold">'+e(un)+'</span></div>'+(sz!==null?'<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span style="color:#888">脚本</span><span style="font-weight:bold">'+sz.toLocaleString()+'字节</span></div>':'')+(warn?'<div class="cdk-err" style="margin-top:8px">'+e(warn)+'</div>':'')+'<div style="display:flex;gap:8px;margin-top:16px"><button id="cdk-cls" style="flex:1;padding:10px;border:none;border-radius:8px;font-size:13px;cursor:pointer;background:#e5e7eb;color:#374151;font-weight:bold">关闭</button><button id="cdk-out" style="flex:1;padding:10px;border:none;border-radius:8px;font-size:13px;cursor:pointer;background:#ef4444;color:#fff;font-weight:bold">注销</button></div></div></div>';
    document.body.appendChild(w);
    document.getElementById('cdk-cls').onclick = function() { w.remove(); };
    document.getElementById('cdk-out').onclick = async function() {
      try { await send('logout', { userId: uid }); } catch(e) {}
      GM_deleteValue('cdk_ok'); w.remove(); showLogin();
    };
    setTimeout(function() { if (w.parentNode) w.remove(); }, 5000);
  }

  function heartbeat(uid, tk) {
    var t = tk;
    setInterval(async function() {
      try {
        var r = await send('heartbeat', { userId: uid, heartbeatToken: t });
        if (r.code !== 0) { GM_deleteValue('cdk_ok'); return; }
        var d = JSON.parse(await decrypt(r.data.encrypted, r.data.iv, await sha256(r.data.challenge)));
        t = d.heartbeatToken;
        var s = GM_getValue('cdk_ok', {});
        s.tk = t; GM_setValue('cdk_ok', s);
      } catch(e) {}
    }, 60000);
  }

  function e(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  console.log('[CDK] === 初始化完成 ===');
})();
