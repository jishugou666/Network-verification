'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { programApi } from '@/lib/api';

const LANGUAGES = [
  'Python',
  'C# (.NET)',
  'JavaScript (Node.js)',
  'TypeScript (Node.js)',
  'Java',
  'Go',
  'Rust',
  'C++',
  'PHP',
  'Ruby',
  'Swift',
  'Kotlin',
  'Dart',
  'Lua',
  'Shell (curl)',
] as const;

type Lang = (typeof LANGUAGES)[number];

function getClientScriptTemplate(appKey: string, appSecret: string, apiBase: string, uiConfig?: any): string {
  const base = apiBase.replace(/\/api$/, '');
  
  // 从配置或默认值提取UI参数
  const cfg = uiConfig || {};
  const bg = cfg.bg || '#3b82f6';
  const bg2 = cfg.bg2 || '#6366f1';
  const title = cfg.title ? ('\\u' + [...cfg.title].map(c => c.charCodeAt(0).toString(16).padStart(4,'0')).join('\\u')) : '\\u5361\\u5bc6\\u9a8c\\u8bc1';
  const subtitle = cfg.subtitle ? ('\\u' + [...cfg.subtitle].map(c => c.charCodeAt(0).toString(16).padStart(4,'0')).join('\\u')) : '\\u8bf7\\u8f93\\u5165\\u5361\\u5bc6\\u4ee5\\u6fc0\\u6d3b';
  const btnText = cfg.btnText ? ('\\u' + [...cfg.btnText].map(c => c.charCodeAt(0).toString(16).padStart(4,'0')).join('\\u')) : '\\u9a8c\\u8bc1\\u5e76\\u6fc0\\u6d3b';
  const radius = cfg.radius || 18;
  const inputRadius = cfg.inputRadius || 10;
  const btnH = cfg.btnH || '#3b82f6';
  const btnH2 = cfg.btnH2 || '#6366f1';
  
  // 成功浮层颜色
  const okBg = cfg.okBg || '#10b981';
  const okBg2 = cfg.okBg2 || '#059669';
  const okTitle = cfg.okTitle ? ('\\u' + [...cfg.okTitle].map(c => c.charCodeAt(0).toString(16).padStart(4,'0')).join('\\u')) : '\\u9a8c\\u8bc1\\u6210\\u529f';
  const okSub = cfg.okSub ? ('\\u' + [...cfg.okSub].map(c => c.charCodeAt(0).toString(16).padStart(4,'0')).join('\\u')) : '\\u529f\\u80fd\\u5df2\\u6fc0\\u6d3b';

  return `// ==UserScript==
// @name         CDK 卡密验证
// @namespace    https://cdk.lat
// @version      5.0
// @description  安全卡密验证+解绑
// @author       CDK
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-end
// ==/UserScript==

(function(){
var K=["${appKey}"];var S=["${appSecret}"];var A="${base}";

var U={bg:"${bg}",bg2:"${bg2}",radius:${radius},iradius:${inputRadius},btnH:"${btnH}",btnH2:"${btnH2}",okBg:"${okBg}",okBg2:"${okBg2}"};

var css='.cdk-wrap{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;z-index:2147483647!important;background:rgba(0,0,0,0.6)!important;display:flex!important;align-items:center!important;justify-content:center!important}.cdk-box{background:#fff!important;border-radius:'+U.radius+'px!important;width:360px!important;max-width:90vw!important;overflow:hidden!important;box-shadow:0 20px 50px rgba(0,0,0,0.4)!important;font-family:Arial,sans-serif!important}.cdk-hd{padding:26px 20px!important;background:linear-gradient(135deg,'+U.bg+','+U.bg2+')!important;color:#fff!important;text-align:center!important}.cdk-hd h2{margin:0!important;font-size:19px!important}.cdk-hd p{margin:4px 0 0!important;font-size:12px!important;opacity:0.85!important}.cdk-bd{padding:24px 20px!important}.cdk-bd input{width:100%!important;padding:12px!important;border:1.5px solid #d1d5db!important;border-radius:'+U.iradius+'px!important;font-size:14px!important;outline:none!important;box-sizing:border-box!important;margin-bottom:14px!important;text-align:center!important}.cdk-bd button{width:100%!important;padding:12px!important;border:none!important;border-radius:'+U.iradius+'px!important;font-size:15px!important;font-weight:bold!important;cursor:pointer!important;color:#fff!important;background:linear-gradient(135deg,'+U.btnH+','+U.btnH2+')!important}.cdk-bd button:disabled{opacity:0.6!important;cursor:not-allowed!important}.cdk-err{background:#fee2e2!important;color:#dc2626!important;padding:10px 14px!important;border-radius:8px!important;font-size:12px!important;margin-bottom:14px!important;text-align:center!important}';
var d=document.createElement('style');d.textContent=css;document.head.appendChild(d);

var _safe=true;
try{if(typeof crypto.subtle.importKey!=="function")_safe=false;}catch(e){}
try{if(typeof GM_setValue!=="function")_safe=false;}catch(e){}
try{if(typeof GM_getValue!=="function")_safe=false;}catch(e){}
if(!_safe){GM_deleteValue("cdk_ok");location.reload();}

function H(d,k){return crypto.subtle.importKey("raw",new TextEncoder().encode(k),{name:"HMAC",hash:"SHA-256"},false,["sign"]).then(function(ky){return crypto.subtle.sign("HMAC",ky,new TextEncoder().encode(d));}).then(function(s){return Array.from(new Uint8Array(s)).map(function(b){return b.toString(16).padStart(2,"0");}).join("");});}
function SH(d){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(d)).then(function(h){return new Uint8Array(h);});}
function DC(e,i,k){var ib=Uint8Array.from(atob(i),function(c){return c.charCodeAt(0);});var eb=Uint8Array.from(atob(e),function(c){return c.charCodeAt(0);});return crypto.subtle.importKey("raw",k,{name:"AES-CBC"},false,["decrypt"]).then(function(ck){return crypto.subtle.decrypt({name:"AES-CBC",iv:ib},ck,eb);}).then(function(d){return new TextDecoder().decode(d);});}
function R(ep,p){p=p||{};var t=Date.now();var n=Array.from(crypto.getRandomValues(new Uint8Array(8))).map(function(b){return b.toString(16).padStart(2,"0");}).join("");p.appKey=K[0];p.timestamp=t;p.nonce=n;var b=JSON.stringify(p);return H(t+n+b,S[0]).then(function(sig){p.signature=sig;return fetch(A+"/client/"+ep,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});}).then(function(r){return r.json();});}
function F(){var h={cpuName:"browser",cpuCores:navigator.hardwareConcurrency||1,cpuArch:navigator.platform||"web",cpuSerial:"",mbSerial:"",mbManufacturer:"",biosUuid:"",biosVersion:"",diskSerial:"",diskModel:"",macAddresses:["00:00:00:00:00:00"],totalMemory:0,osName:navigator.platform||"web",osVersion:navigator.userAgent||"",hostname:location.hostname,machineArch:navigator.platform||"",screenResolution:screen.width+"x"+screen.height,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,language:navigator.language};return JSON.stringify(h,Object.keys(h).sort());}
function _enc(data,hw){var raw=JSON.stringify(data);return SH(hw).then(function(hk){var iv=crypto.getRandomValues(new Uint8Array(12));return crypto.subtle.importKey("raw",hk,{name:"AES-GCM"},false,["encrypt"]).then(function(k){return crypto.subtle.encrypt({name:"AES-GCM",iv:iv},k,new TextEncoder().encode(raw));}).then(function(enc){var buf=new Uint8Array(enc);var out=new Uint8Array(iv.length+buf.length);out.set(iv);out.set(buf,12);return btoa(Array.from(out).map(function(b){return String.fromCharCode(b);}).join(""));});});}
function _dec(blob,hw){return SH(hw).then(function(hk){var raw=Uint8Array.from(atob(blob),function(c){return c.charCodeAt(0);});var iv=raw.slice(0,12);var ct=raw.slice(12);return crypto.subtle.importKey("raw",hk,{name:"AES-GCM"},false,["decrypt"]).then(function(k){return crypto.subtle.decrypt({name:"AES-GCM",iv:iv},k,ct);}).then(function(d){return JSON.parse(new TextDecoder().decode(d));});});}

var _hw=F();
var _enc=GM_getValue("cdk_ok",null);
if(_enc&&typeof _enc==="string"){_dec(_enc,_hw).then(function(cv){if(cv&&cv.uid&&cv.tk){_load(cv.uid,cv.tk);}else{GM_deleteValue("cdk_ok");_show();}}).catch(function(){GM_deleteValue("cdk_ok");_show();});}
else{GM_deleteValue("cdk_ok");_show();}

function _show(){_rm();var w=document.createElement("div");w.className="cdk-wrap";w.innerHTML='<div class="cdk-box"><div class="cdk-hd"><h2>${title}</h2><p>${subtitle}</p></div><div class="cdk-bd"><input class="cdk-in" type="text" placeholder="\\u8bf7\\u8f93\\u5165\\u5361\\u5bc6" autocomplete="off"><button class="cdk-btn">${btnText}</button></div></div>';document.body.appendChild(w);var ci=w.querySelector(".cdk-in");var btn=w.querySelector(".cdk-btn");var er=null;function se(m){if(er)er.remove();er=document.createElement("div");er.className="cdk-err";er.textContent=m;w.querySelector(".cdk-bd").insertBefore(er,w.querySelector(".cdk-bd").firstChild);}btn.addEventListener("click",function(){var ck=ci.value.trim();if(!ck){se("\\u8bf7\\u8f93\\u5165\\u5361\\u5bc6");ci.focus();return;}if(er)er.remove();btn.disabled=true;btn.textContent="\\u9a8c\\u8bc1\\u4e2d...";var _ch="";R("challenge").then(function(cr){_ch=cr.data.challenge;return H(_ch+ck+_hw,S[0]).then(function(s){return R("activate",{cardKey:ck,username:_hw,hardwareInfo:_hw,challengeResponse:_ch+":"+s});});}).then(function(r){if(r.code!==0){se(r.message);btn.disabled=false;btn.textContent="${btnText}";return;}var d=r.data;return SH(_ch).then(function(k){return DC(d.encrypted,d.iv,k);}).then(function(dec){var j=JSON.parse(dec);var uid=d.userId,tk=j.heartbeatToken;return _enc({uid:uid,hw:_hw,tk:tk,exp:j.expiresAt},_hw).then(function(enc){GM_setValue("cdk_ok",enc);_rm();return _load(uid,tk);});});}).catch(function(e){se(e.message||"\\u7f51\\u7edc\\u9519\\u8bef");btn.disabled=false;btn.textContent="${btnText}";});});ci.addEventListener("keydown",function(e){if(e.key==="Enter")btn.click();});setTimeout(function(){ci.focus();},200);}

function _load(uid,tk){R("script",{userId:uid,heartbeatToken:tk}).then(function(r){if(r.code===2010||r.code===404){_ok(uid,null);_hb(uid,tk);return;}if(r.code!==0){_ok(uid,null,"\\u811a\\u672c\\u83b7\\u53d6\\u5931\\u8d25: "+r.message);_hb(uid,tk);return;}var d=r.data;return SH(d.challenge).then(function(k){return DC(d.encrypted,d.iv,k);}).then(function(code){var cl=code.length;try{new Function(code)();code=null;}catch(ee){_ok(uid,d.scriptSize||cl,"\\u6267\\u884c\\u5931\\u8d25: "+ee.message);_hb(uid,tk);return;}_ok(uid,d.scriptSize||cl);_hb(uid,tk);});}).catch(function(e){_ok(uid,null,"\\u52a0\\u8f7d\\u5931\\u8d25: "+e.message);_hb(uid,tk);});}

function _ok(uid,sz,w){_rm();var o=document.createElement("div");o.className="cdk-wrap";o.innerHTML='<div class="cdk-box"><div class="cdk-hd" style="background:linear-gradient(135deg,'+U.okBg+','+U.okBg2+')!important"><h2>${okTitle}</h2><p>${okSub}</p></div><div class="cdk-bd"><div style="text-align:center;font-size:40px;margin-bottom:12px">&#10004;</div><div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span style="color:#888">\\u7528\\u6237ID</span><span style="font-weight:bold">'+_E(uid)+'</span></div>'+(sz!==null?'<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span style="color:#888">\\u811a\\u672c</span><span style="font-weight:bold">'+sz.toLocaleString()+''+'\\u5b57\\u8282'+'</span></div>':'')+(w?'<div class="cdk-err" style="margin-top:8px">'+_E(w)+'</div>':'')+'<div style="display:flex;gap:8px;margin-top:16px"><button id="cdk-cls" style="flex:1;padding:10px;border:none;border-radius:8px;font-size:13px;cursor:pointer;background:#e5e7eb;color:#374151;font-weight:bold">\\u5173\\u95ed</button><button id="cdk-out" style="flex:1;padding:10px;border:none;border-radius:8px;font-size:13px;cursor:pointer;background:#ef4444;color:#fff;font-weight:bold">\\u6ce8\\u9500</button><button id="cdk-unbind" style="flex:1;padding:10px;border:none;border-radius:8px;font-size:13px;cursor:pointer;background:#f59e0b;color:#fff;font-weight:bold">\\u89e3\\u7ed1\\u8bbe\\u5907</button></div></div></div>';document.body.appendChild(o);document.getElementById("cdk-cls").onclick=function(){o.remove();};document.getElementById("cdk-out").onclick=function(){R("logout",{userId:uid}).catch(function(){});GM_deleteValue("cdk_ok");o.remove();_show();};document.getElementById("cdk-unbind").onclick=function(){if(!confirm("\\u786e\\u5b9a\\u89e3\\u7ed1\\u5f53\\u524d\\u8bbe\\u5907\\uff1f\\u89e3\\u7ed1\\u540e\\u53ef\\u5728\\u5176\\u4ed6\\u8bbe\\u5907\\u4f7f\\u7528\\u6b64\\u5361\\u5bc6\\u767b\\u5f55\\u3002"))return;var uBtn=document.getElementById("cdk-unbind");uBtn.disabled=true;uBtn.textContent="\\u89e3\\u7ed1\\u4e2d...";var tk;try{tk=JSON.parse(GM_getValue("cdk_ok","{}").tk||"")}catch(e){}R("unbind",{userId:uid,heartbeatToken:_hbCur||tk}).then(function(r){uBtn.disabled=false;if(r.code===0){alert(r.message);GM_deleteValue("cdk_ok");o.remove();_show();}else{alert(r.message);uBtn.textContent="\\u89e3\\u7ed1\\u8bbe\\u5907";}}).catch(function(){uBtn.disabled=false;uBtn.textContent="\\u89e3\\u7ed1\\u8bbe\\u5907";});};setTimeout(function(){if(o.parentNode)o.remove();},5000);}
var _hbCur=null;
function _hb(uid,tk){_hbCur=tk;var t=tk;setInterval(function(){R("heartbeat",{userId:uid,heartbeatToken:t}).then(function(r){if(r.code!==0){GM_deleteValue("cdk_ok");return;}return SH(r.data.challenge).then(function(k){return DC(r.data.encrypted,r.data.iv,k);});}).then(function(dec){if(!dec)return;var j=JSON.parse(dec);t=j.heartbeatToken;_hbCur=t;return _enc({uid:uid,hw:_hw,tk:t,exp:j.expiresAt},_hw);}).then(function(enc){if(!enc)return;GM_setValue("cdk_ok",enc);}).catch(function(){});},60000);}

function _rm(){var els=document.querySelectorAll(".cdk-wrap");for(var i=0;i<els.length;i++)els[i].remove();}
function _E(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}
})();`;
}

function generateCode(lang: Lang, appKey: string, appSecret: string, apiBase: string): string {
  const base = apiBase.replace(/\/$/, '');
  switch (lang) {
    case 'Python':
      return `"""
卡密验证系统 Python 客户端
依赖: pip install requests pycryptodome
"""
import hashlib, hmac, json, os, platform, re, socket, struct, subprocess, sys, time, uuid
from base64 import b64decode
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import requests


class CardVerifyClient:
    def __init__(self):
        self.api_base = "${base}"
        self.app_key = "${appKey}"
        self.app_secret = "${appSecret}"
        self.user_id = None
        self.heartbeat_token = None
        self.session = requests.Session()
        self.session.headers["Content-Type"] = "application/json"

    def _sign(self, ts: int, nonce: str, body: str) -> str:
        return hmac.new(self.app_secret.encode(), f"{ts}{nonce}{body}".encode(), hashlib.sha256).hexdigest()

    def _send(self, ep: str, payload: dict) -> dict:
        ts = int(time.time() * 1000)
        nonce = os.urandom(8).hex()
        payload.update(appKey=self.app_key, timestamp=ts, nonce=nonce)
        body = json.dumps(payload, separators=(",", ":"))
        payload["signature"] = self._sign(ts, nonce, body)
        r = self.session.post(f"{self.api_base}/api/client/{ep}", json=payload, timeout=30)
        return r.json()

    def _decrypt(self, enc: str, iv: str, challenge: str) -> str:
        key = hashlib.sha256(challenge.encode()).digest()
        cipher = AES.new(key, AES.MODE_CBC, b64decode(iv))
        return unpad(cipher.decrypt(b64decode(enc)), AES.block_size).decode()

    def get_challenge(self) -> str:
        r = self._send("challenge", {})
        if r["code"] != 0: raise Exception(r["message"])
        return r["data"]["challenge"]

    def activate(self, card_key: str, username: str, hw: str) -> dict:
        ch = self.get_challenge()
        cr = ch + ":" + hmac.new(self.app_secret.encode(), f"{ch}{card_key}{username}".encode(), hashlib.sha256).hexdigest()
        r = self._send("activate", {"cardKey": card_key, "username": username, "hardwareInfo": hw, "challengeResponse": cr})
        if r["code"] != 0: raise Exception(r["message"])
        d = r["data"]; self.user_id = d["userId"]
        dec = json.loads(self._decrypt(d["encrypted"], d["iv"], ch))
        self.heartbeat_token = dec["heartbeatToken"]
        return {"userId": self.user_id, "heartbeatToken": dec["heartbeatToken"], "expiresAt": dec.get("expiresAt"), "maxDevices": dec["maxDevices"], "deviceCount": dec["deviceCount"]}

    def heartbeat(self) -> dict:
        if not self.user_id: raise Exception("请先激活")
        r = self._send("heartbeat", {"userId": self.user_id, "heartbeatToken": self.heartbeat_token})
        if r["code"] != 0: raise Exception(r["message"])
        d = r["data"]
        dec = json.loads(self._decrypt(d["encrypted"], d["iv"], d["challenge"]))
        self.heartbeat_token = dec["heartbeatToken"]
        return {"heartbeatToken": dec["heartbeatToken"], "expiresAt": dec.get("expiresAt"), "serverTime": dec["serverTime"]}

    def logout(self):
        if self.user_id:
            self._send("logout", {"userId": self.user_id})
            self.user_id = None; self.heartbeat_token = None

    @staticmethod
    def collect_hardware_info() -> str:
        info = {}
        # CPU
        info["cpuName"] = platform.processor()
        info["cpuCores"] = os.cpu_count()
        info["cpuArch"] = platform.machine()
        try:
            if sys.platform == "win32":
                out = subprocess.check_output("wmic cpu get ProcessorId", shell=True).decode()
                m = re.search(r"[A-Fa-f0-9]{16}", out)
                info["cpuSerial"] = m.group(0) if m else ""
            elif sys.platform == "linux":
                info["cpuSerial"] = subprocess.check_output("cat /proc/cpuinfo | grep Serial | awk '{print $3}'", shell=True).decode().strip()
            elif sys.platform == "darwin":
                info["cpuSerial"] = subprocess.check_output("sysctl -n machdep.cpu.brand_string", shell=True).decode().strip()
        except: info["cpuSerial"] = ""
        # Motherboard
        try:
            if sys.platform == "win32":
                out = subprocess.check_output("wmic baseboard get SerialNumber", shell=True).decode()
                m = re.search(r"\\S+", out.split("\\n")[1] if "\\n" in out else out)
                info["mbSerial"] = m.group(0).strip() if m else ""
                mfg = subprocess.check_output("wmic baseboard get Manufacturer", shell=True).decode()
                m2 = re.search(r"\\S+", mfg.split("\\n")[1] if "\\n" in mfg else mfg)
                info["mbManufacturer"] = m2.group(0).strip() if m2 else ""
            elif sys.platform == "linux":
                info["mbSerial"] = subprocess.check_output("cat /sys/class/dmi/id/board_serial 2>/dev/null", shell=True).decode().strip()
                info["mbManufacturer"] = subprocess.check_output("cat /sys/class/dmi/id/board_vendor 2>/dev/null", shell=True).decode().strip()
        except: pass
        # BIOS
        try:
            if sys.platform == "win32":
                info["biosUuid"] = subprocess.check_output("wmic csproduct get UUID", shell=True).decode().split("\\n")[1].strip()
                info["biosVersion"] = subprocess.check_output("wmic bios get SMBIOSBIOSVersion", shell=True).decode().split("\\n")[1].strip()
            elif sys.platform == "linux":
                info["biosUuid"] = subprocess.check_output("cat /sys/class/dmi/id/product_uuid 2>/dev/null", shell=True).decode().strip()
                info["biosVersion"] = subprocess.check_output("cat /sys/class/dmi/id/bios_version 2>/dev/null", shell=True).decode().strip()
        except: pass
        # Disk
        try:
            if sys.platform == "win32":
                disks = subprocess.check_output("wmic diskdrive get SerialNumber,Model", shell=True).decode().strip().split("\\n")[1:]
                info["diskSerial"] = disks[0].strip().split()[-1] if disks else ""
                info["diskModel"] = " ".join(disks[0].strip().split()[:-1]) if disks else ""
            elif sys.platform == "linux":
                info["diskSerial"] = subprocess.check_output("lsblk -o SERIAL -nd 2>/dev/null | head -1", shell=True).decode().strip()
                info["diskModel"] = subprocess.check_output("lsblk -o MODEL -nd 2>/dev/null | head -1", shell=True).decode().strip()
        except: pass
        # Network MACs
        try:
            macs = []
            for iface in os.listdir("/sys/class/net"):
                try:
                    with open(f"/sys/class/net/{iface}/address") as f:
                        macs.append(f.read().strip())
                except: pass
            if not macs:
                import uuid as _uuid
                macs.append(":".join([f"{( _uuid.getnode() >> (i*8)) & 0xff:02x}" for i in range(5, -1, -1)]))
            info["macAddresses"] = macs
        except: info["macAddresses"] = [hex(uuid.getnode())]
        # Memory
        try:
            if sys.platform == "win32":
                mem = subprocess.check_output("wmic memorychip get Capacity", shell=True).decode()
                total = sum(int(x) for x in re.findall(r"\\d+", mem))
                info["totalMemory"] = total
            elif sys.platform == "linux":
                with open("/proc/meminfo") as f:
                    m = re.search(r"MemTotal:\\s+(\\d+)", f.read())
                    info["totalMemory"] = int(m.group(1)) * 1024 if m else 0
            elif sys.platform == "darwin":
                info["totalMemory"] = int(subprocess.check_output("sysctl -n hw.memsize", shell=True).decode().strip())
        except: pass
        # OS
        info["osName"] = platform.system()
        info["osVersion"] = platform.version()
        info["osRelease"] = platform.release()
        info["osBuild"] = platform.win32_ver()[1] if sys.platform == "win32" else ""
        # Machine
        info["hostname"] = socket.gethostname()
        info["machineArch"] = platform.machine()
        return json.dumps(info)


# ========== 使用示例 ==========
if __name__ == "__main__":
    client = CardVerifyClient()
    hw = CardVerifyClient.collect_hardware_info()
    try:
        result = client.activate("YOUR_CARD_KEY", "player_123", hw)
        print(f"激活成功! userId={result['userId']}")
        import threading, atexit
        def hb():
            while True:
                time.sleep(60)
                try: print("心跳:", client.heartbeat())
                except: break
        t = threading.Thread(target=hb, daemon=True); t.start()
        atexit.register(client.logout)
        t.join()
    except Exception as e:
        print(f"错误: {e}")
        client.logout()
`;

    case 'C# (.NET)':
      return `using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Management;
using System.Net;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace CardVerify.Client
{
    public class CardVerifyClient
    {
        private static readonly string ApiBase = "${base}";
        private static readonly string AppKey = "${appKey}";
        private static readonly string AppSecret = "${appSecret}";

        private readonly HttpClient _http = new HttpClient();
        private string _userId, _heartbeatToken;

        public CardVerifyClient()
        {
            _http.DefaultRequestHeaders.Add("Content-Type", "application/json");
        }

        private static string HmacSign(string data)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(AppSecret));
            return BitConverter.ToString(hmac.ComputeHash(Encoding.UTF8.GetBytes(data))).Replace("-", "").ToLower();
        }

        private async Task<JsonElement> Send(string ep, Dictionary<string, object> payload)
        {
            var ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var nonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(8)).ToLower();
            payload["appKey"] = AppKey; payload["timestamp"] = ts; payload["nonce"] = nonce;
            var body = JsonSerializer.Serialize(payload);
            payload["signature"] = HmacSign(ts + nonce + body);
            var r = await _http.PostAsync($"{ApiBase}/api/client/{ep}",
                new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
            return JsonSerializer.Deserialize<JsonElement>(await r.Content.ReadAsStringAsync());
        }

        private static string Decrypt(string enc, string iv, string challenge)
        {
            var key = SHA256.HashData(Encoding.UTF8.GetBytes(challenge));
            using var aes = Aes.Create(); aes.Key = key; aes.IV = Convert.FromBase64String(iv);
            aes.Mode = CipherMode.CBC; aes.Padding = PaddingMode.PKCS7;
            using var d = aes.CreateDecryptor();
            return Encoding.UTF8.GetString(d.TransformFinalBlock(Convert.FromBase64String(enc), 0, Convert.FromBase64String(enc).Length));
        }

        public async Task<string> GetChallenge()
        {
            var r = await Send("challenge", new Dictionary<string, object>());
            if (r.GetProperty("code").GetInt32() != 0) throw new Exception(r.GetProperty("message").GetString());
            return r.GetProperty("data").GetProperty("challenge").GetString();
        }

        public async Task<ActivateResult> Activate(string cardKey, string username, string hw)
        {
            var ch = await GetChallenge();
            var cr = ch + ":" + HmacSign(ch + cardKey + username);
            var r = await Send("activate", new Dictionary<string, object> {
                ["cardKey"] = cardKey, ["username"] = username, ["hardwareInfo"] = hw, ["challengeResponse"] = cr
            });
            if (r.GetProperty("code").GetInt32() != 0) throw new Exception(r.GetProperty("message").GetString());
            var d = r.GetProperty("data"); _userId = d.GetProperty("userId").GetString();
            var dec = JsonSerializer.Deserialize<JsonElement>(Decrypt(d.GetProperty("encrypted").GetString(), d.GetProperty("iv").GetString(), ch));
            _heartbeatToken = dec.GetProperty("heartbeatToken").GetString();
            return new ActivateResult { UserId = _userId, HeartbeatToken = _heartbeatToken };
        }

        public async Task<HeartbeatResult> Heartbeat()
        {
            if (string.IsNullOrEmpty(_userId)) throw new Exception("请先激活");
            var r = await Send("heartbeat", new Dictionary<string, object> { ["userId"] = _userId, ["heartbeatToken"] = _heartbeatToken });
            if (r.GetProperty("code").GetInt32() != 0) throw new Exception(r.GetProperty("message").GetString());
            var d = r.GetProperty("data");
            var ch = d.GetProperty("challenge").GetString();
            var dec = JsonSerializer.Deserialize<JsonElement>(Decrypt(d.GetProperty("encrypted").GetString(), d.GetProperty("iv").GetString(), ch));
            _heartbeatToken = dec.GetProperty("heartbeatToken").GetString();
            return new HeartbeatResult { HeartbeatToken = _heartbeatToken };
        }

        public async Task Logout()
        {
            if (!string.IsNullOrEmpty(_userId))
            {
                await Send("logout", new Dictionary<string, object> { ["userId"] = _userId });
                _userId = null; _heartbeatToken = null;
            }
        }

        public static string CollectHardwareInfo()
        {
            var info = new Dictionary<string, object>();
            try
            {
                // CPU
                using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Processor");
                foreach (ManagementObject mo in searcher.Get()) {
                    info["cpuName"] = mo["Name"]?.ToString() ?? "";
                    info["cpuSerial"] = mo["ProcessorId"]?.ToString() ?? "";
                    info["cpuCores"] = mo["NumberOfCores"]?.ToString() ?? "";
                }
                // Motherboard
                using var mb = new ManagementObjectSearcher("SELECT * FROM Win32_BaseBoard");
                foreach (ManagementObject mo in mb.Get()) {
                    info["mbSerial"] = mo["SerialNumber"]?.ToString() ?? "";
                    info["mbManufacturer"] = mo["Manufacturer"]?.ToString() ?? "";
                }
                // BIOS
                using var bios = new ManagementObjectSearcher("SELECT * FROM Win32_BIOS");
                foreach (ManagementObject mo in bios.Get()) {
                    info["biosUuid"] = mo["SerialNumber"]?.ToString() ?? "";
                    info["biosVersion"] = mo["SMBIOSBIOSVersion"]?.ToString() ?? "";
                }
                // Disk
                using var disk = new ManagementObjectSearcher("SELECT * FROM Win32_DiskDrive");
                foreach (ManagementObject mo in disk.Get()) {
                    info["diskSerial"] = mo["SerialNumber"]?.ToString()?.Trim() ?? "";
                    info["diskModel"] = mo["Model"]?.ToString()?.Trim() ?? "";
                    break;
                }
                // Network
                var macs = NetworkInterface.GetAllNetworkInterfaces()
                    .Where(n => n.OperationalStatus == OperationalStatus.Up)
                    .Select(n => BitConverter.ToString(n.GetPhysicalAddress().GetAddressBytes()).Replace("-", ":").ToLower())
                    .ToList();
                info["macAddresses"] = macs;
                // Memory
                info["totalMemory"] = GC.GetGCMemoryInfo().TotalAvailableMemoryBytes;
                // OS
                info["osName"] = Environment.OSVersion.Platform.ToString();
                info["osVersion"] = Environment.OSVersion.VersionString;
                info["machineName"] = Environment.MachineName;
                info["machineArch"] = Environment.Is64BitOperatingSystem ? "x64" : "x86";
            }
            catch { }
            return JsonSerializer.Serialize(info);
        }
    }

    public class ActivateResult { public string UserId { get; set; } public string HeartbeatToken { get; set; } }
    public class HeartbeatResult { public string HeartbeatToken { get; set; } }

    // ========== 使用示例 ==========
    class Program {
        static async Task Main() {
            var client = new CardVerifyClient();
            var hw = CardVerifyClient.CollectHardwareInfo();
            try {
                var result = await client.Activate("YOUR_CARD_KEY", "player_123", hw);
                Console.WriteLine($"激活成功! userId={result.UserId}");
                var cts = new CancellationTokenSource();
                var hb = Task.Run(async () => {
                    while (!cts.IsCancellationRequested) {
                        await Task.Delay(60000, cts.Token);
                        try { Console.WriteLine("心跳: " + (await client.Heartbeat()).HeartbeatToken); }
                        catch { break; }
                    }
                });
                Console.CancelKeyPress += (s, e) => { cts.Cancel(); client.Logout().Wait(); };
                await hb;
            } catch (Exception ex) { Console.WriteLine($"错误: {ex.Message}"); await client.Logout(); }
        }
    }
}
`;

    case 'JavaScript (Node.js)':
      return `/**
 * 卡密验证系统 Node.js 客户端
 * 依赖: npm install node-fetch (Node 18+ 内置 fetch)
 */
const crypto = require('crypto');
const os = require('os');
const { execSync } = require('child_process');

class CardVerifyClient {
  constructor() {
    this.apiBase = '${base}';
    this.appKey = '${appKey}';
    this.appSecret = '${appSecret}';
    this.userId = null;
    this.heartbeatToken = null;
  }

  _sign(ts, nonce, body) {
    return crypto.createHmac('sha256', this.appSecret).update(ts + nonce + body).digest('hex');
  }

  async _send(ep, payload = {}) {
    const ts = Date.now();
    const nonce = crypto.randomBytes(8).toString('hex');
    payload.appKey = this.appKey; payload.timestamp = ts; payload.nonce = nonce;
    const body = JSON.stringify(payload);
    payload.signature = this._sign(ts, nonce, body);
    const r = await fetch(this.apiBase + '/api/client/' + ep, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    return r.json();
  }

  _decrypt(enc, iv, challenge) {
    const key = crypto.createHash('sha256').update(challenge).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'base64'));
    return decipher.update(Buffer.from(enc, 'base64'), undefined, 'utf8') + decipher.final('utf8');
  }

  async getChallenge() {
    const r = await this._send('challenge');
    if (r.code !== 0) throw new Error(r.message);
    return r.data.challenge;
  }

  async activate(cardKey, username, hw) {
    const ch = await this.getChallenge();
    const cr = ch + ':' + crypto.createHmac('sha256', this.appSecret).update(ch + cardKey + username).digest('hex');
    const r = await this._send('activate', { cardKey, username, hardwareInfo: hw, challengeResponse: cr });
    if (r.code !== 0) throw new Error(r.message);
    const d = r.data; this.userId = d.userId;
    const dec = JSON.parse(this._decrypt(d.encrypted, d.iv, ch));
    this.heartbeatToken = dec.heartbeatToken;
    return { userId: this.userId, heartbeatToken: dec.heartbeatToken, expiresAt: dec.expiresAt, maxDevices: dec.maxDevices, deviceCount: dec.deviceCount };
  }

  async heartbeat() {
    if (!this.userId) throw new Error('请先激活');
    const r = await this._send('heartbeat', { userId: this.userId, heartbeatToken: this.heartbeatToken });
    if (r.code !== 0) throw new Error(r.message);
    const d = r.data; const ch = d.challenge;
    const dec = JSON.parse(this._decrypt(d.encrypted, d.iv, ch));
    this.heartbeatToken = dec.heartbeatToken;
    return { heartbeatToken: dec.heartbeatToken, expiresAt: dec.expiresAt, serverTime: dec.serverTime };
  }

  async logout() {
    if (this.userId) {
      await this._send('logout', { userId: this.userId });
      this.userId = null; this.heartbeatToken = null;
    }
  }

  static collectHardwareInfo() {
    const info = {};
    // CPU
    info.cpuName = os.cpus()[0]?.model || '';
    info.cpuCores = os.cpus().length;
    info.cpuArch = os.arch();
    try {
      if (process.platform === 'win32') {
        const out = execSync('wmic cpu get ProcessorId').toString();
        const m = out.match(/[A-Fa-f0-9]{16}/);
        info.cpuSerial = m ? m[0] : '';
      } else if (process.platform === 'linux') {
        info.cpuSerial = execSync("cat /proc/cpuinfo | grep Serial | awk '{print $3}'").toString().trim();
      } else if (process.platform === 'darwin') {
        info.cpuSerial = execSync('sysctl -n machdep.cpu.brand_string').toString().trim();
      }
    } catch { info.cpuSerial = ''; }
    // Motherboard
    try {
      if (process.platform === 'win32') {
        info.mbSerial = execSync('wmic baseboard get SerialNumber').toString().split('\\n')[1]?.trim() || '';
        info.mbManufacturer = execSync('wmic baseboard get Manufacturer').toString().split('\\n')[1]?.trim() || '';
      } else if (process.platform === 'linux') {
        info.mbSerial = execSync('cat /sys/class/dmi/id/board_serial 2>/dev/null').toString().trim();
        info.mbManufacturer = execSync('cat /sys/class/dmi/id/board_vendor 2>/dev/null').toString().trim();
      }
    } catch {}
    // BIOS
    try {
      if (process.platform === 'win32') {
        info.biosUuid = execSync('wmic csproduct get UUID').toString().split('\\n')[1]?.trim() || '';
        info.biosVersion = execSync('wmic bios get SMBIOSBIOSVersion').toString().split('\\n')[1]?.trim() || '';
      } else if (process.platform === 'linux') {
        info.biosUuid = execSync('cat /sys/class/dmi/id/product_uuid 2>/dev/null').toString().trim();
        info.biosVersion = execSync('cat /sys/class/dmi/id/bios_version 2>/dev/null').toString().trim();
      }
    } catch {}
    // Disk
    try {
      if (process.platform === 'win32') {
        const disks = execSync('wmic diskdrive get SerialNumber,Model').toString().trim().split('\\n').slice(1);
        info.diskSerial = disks[0]?.trim().split(/\\s+/).pop() || '';
        info.diskModel = disks[0]?.trim().split(/\\s+/).slice(0, -1).join(' ') || '';
      } else if (process.platform === 'linux') {
        info.diskSerial = execSync('lsblk -o SERIAL -nd 2>/dev/null | head -1').toString().trim();
        info.diskModel = execSync('lsblk -o MODEL -nd 2>/dev/null | head -1').toString().trim();
      }
    } catch {}
    // Network MACs
    const nets = os.networkInterfaces();
    const macs = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (!net.internal && net.mac) macs.push(net.mac.toLowerCase());
      }
    }
    info.macAddresses = macs.length > 0 ? macs : ['00:00:00:00:00:00'];
    // Memory
    info.totalMemory = os.totalmem();
    // OS
    info.osName = os.platform();
    info.osVersion = os.release();
    // Machine
    info.hostname = os.hostname();
    info.machineArch = os.arch();
    return JSON.stringify(info);
  }
}

// ========== 使用示例 ==========
(async () => {
  const client = new CardVerifyClient();
  const hw = CardVerifyClient.collectHardwareInfo();
  try {
    const result = await client.activate('YOUR_CARD_KEY', 'player_123', hw);
    console.log('激活成功!', result);
    const hb = setInterval(async () => {
      try { console.log('心跳:', await client.heartbeat()); }
      catch { clearInterval(hb); }
    }, 60000);
    process.on('SIGINT', async () => { clearInterval(hb); await client.logout(); process.exit(); });
  } catch (e) { console.error('错误:', e.message); await client.logout(); }
})();
`;

    case 'TypeScript (Node.js)':
      return `/**
 * 卡密验证系统 TypeScript 客户端
 * 依赖: npm install typescript ts-node @types/node
 */
import * as crypto from 'crypto';
import * as os from 'os';
import { execSync } from 'child_process';

interface ActivateResult {
  userId: string;
  heartbeatToken: string;
  expiresAt?: string;
  maxDevices: number;
  deviceCount: number;
}

interface HeartbeatResult {
  heartbeatToken: string;
  expiresAt?: string;
  serverTime: string;
}

class CardVerifyClient {
  private readonly apiBase: string = '${base}';
  private readonly appKey: string = '${appKey}';
  private readonly appSecret: string = '${appSecret}';
  private userId: string | null = null;
  private heartbeatToken: string | null = null;

  private sign(ts: number, nonce: string, body: string): string {
    return crypto.createHmac('sha256', this.appSecret).update(ts + nonce + body).digest('hex');
  }

  private async send(ep: string, payload: Record<string, unknown> = {}): Promise<any> {
    const ts = Date.now();
    const nonce = crypto.randomBytes(8).toString('hex');
    payload.appKey = this.appKey; payload.timestamp = ts; payload.nonce = nonce;
    const body = JSON.stringify(payload);
    payload.signature = this.sign(ts, nonce, body);
    const r = await fetch(this.apiBase + '/api/client/' + ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return r.json();
  }

  private decrypt(enc: string, iv: string, challenge: string): string {
    const key = crypto.createHash('sha256').update(challenge).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'base64'));
    return decipher.update(Buffer.from(enc, 'base64'), undefined, 'utf8') + decipher.final('utf8');
  }

  async getChallenge(): Promise<string> {
    const r = await this.send('challenge');
    if (r.code !== 0) throw new Error(r.message);
    return r.data.challenge;
  }

  async activate(cardKey: string, username: string, hw: string): Promise<ActivateResult> {
    const ch = await this.getChallenge();
    const cr = ch + ':' + crypto.createHmac('sha256', this.appSecret).update(ch + cardKey + username).digest('hex');
    const r = await this.send('activate', { cardKey, username, hardwareInfo: hw, challengeResponse: cr });
    if (r.code !== 0) throw new Error(r.message);
    const d = r.data; this.userId = d.userId;
    const dec = JSON.parse(this.decrypt(d.encrypted, d.iv, ch));
    this.heartbeatToken = dec.heartbeatToken;
    return { userId: this.userId!, heartbeatToken: dec.heartbeatToken, expiresAt: dec.expiresAt, maxDevices: dec.maxDevices, deviceCount: dec.deviceCount };
  }

  async heartbeat(): Promise<HeartbeatResult> {
    if (!this.userId) throw new Error('请先激活');
    const r = await this.send('heartbeat', { userId: this.userId, heartbeatToken: this.heartbeatToken });
    if (r.code !== 0) throw new Error(r.message);
    const d = r.data; const ch = d.challenge;
    const dec = JSON.parse(this.decrypt(d.encrypted, d.iv, ch));
    this.heartbeatToken = dec.heartbeatToken;
    return { heartbeatToken: dec.heartbeatToken!, expiresAt: dec.expiresAt, serverTime: dec.serverTime };
  }

  async logout(): Promise<void> {
    if (this.userId) {
      await this.send('logout', { userId: this.userId });
      this.userId = null; this.heartbeatToken = null;
    }
  }

  static collectHardwareInfo(): string {
    const info: Record<string, unknown> = {};
    info.cpuName = os.cpus()[0]?.model || '';
    info.cpuCores = os.cpus().length;
    info.cpuArch = os.arch();
    try {
      if (process.platform === 'win32') {
        const out = execSync('wmic cpu get ProcessorId').toString();
        const m = out.match(/[A-Fa-f0-9]{16}/);
        info.cpuSerial = m ? m[0] : '';
      } else if (process.platform === 'linux') {
        info.cpuSerial = execSync("cat /proc/cpuinfo | grep Serial | awk '{print $3}'").toString().trim();
      } else if (process.platform === 'darwin') {
        info.cpuSerial = execSync('sysctl -n machdep.cpu.brand_string').toString().trim();
      }
    } catch { info.cpuSerial = ''; }
    try {
      if (process.platform === 'win32') {
        info.mbSerial = execSync('wmic baseboard get SerialNumber').toString().split('\\n')[1]?.trim() || '';
        info.mbManufacturer = execSync('wmic baseboard get Manufacturer').toString().split('\\n')[1]?.trim() || '';
      } else if (process.platform === 'linux') {
        info.mbSerial = execSync('cat /sys/class/dmi/id/board_serial 2>/dev/null').toString().trim();
        info.mbManufacturer = execSync('cat /sys/class/dmi/id/board_vendor 2>/dev/null').toString().trim();
      }
    } catch {}
    try {
      if (process.platform === 'win32') {
        info.biosUuid = execSync('wmic csproduct get UUID').toString().split('\\n')[1]?.trim() || '';
        info.biosVersion = execSync('wmic bios get SMBIOSBIOSVersion').toString().split('\\n')[1]?.trim() || '';
      } else if (process.platform === 'linux') {
        info.biosUuid = execSync('cat /sys/class/dmi/id/product_uuid 2>/dev/null').toString().trim();
        info.biosVersion = execSync('cat /sys/class/dmi/id/bios_version 2>/dev/null').toString().trim();
      }
    } catch {}
    try {
      if (process.platform === 'win32') {
        const disks = execSync('wmic diskdrive get SerialNumber,Model').toString().trim().split('\\n').slice(1);
        info.diskSerial = disks[0]?.trim().split(/\\s+/).pop() || '';
        info.diskModel = disks[0]?.trim().split(/\\s+/).slice(0, -1).join(' ') || '';
      } else if (process.platform === 'linux') {
        info.diskSerial = execSync('lsblk -o SERIAL -nd 2>/dev/null | head -1').toString().trim();
        info.diskModel = execSync('lsblk -o MODEL -nd 2>/dev/null | head -1').toString().trim();
      }
    } catch {}
    const nets = os.networkInterfaces();
    const macs: string[] = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]!) {
        if (!net.internal && net.mac) macs.push(net.mac.toLowerCase());
      }
    }
    info.macAddresses = macs.length > 0 ? macs : ['00:00:00:00:00:00'];
    info.totalMemory = os.totalmem();
    info.osName = os.platform();
    info.osVersion = os.release();
    info.hostname = os.hostname();
    info.machineArch = os.arch();
    return JSON.stringify(info);
  }
}

// ========== 使用示例 ==========
(async () => {
  const client = new CardVerifyClient();
  const hw = CardVerifyClient.collectHardwareInfo();
  try {
    const result = await client.activate('YOUR_CARD_KEY', 'player_123', hw);
    console.log('激活成功!', result);
    const hb = setInterval(async () => {
      try { console.log('心跳:', await client.heartbeat()); }
      catch { clearInterval(hb); }
    }, 60000);
    process.on('SIGINT', async () => { clearInterval(hb); await client.logout(); process.exit(); });
  } catch (e: any) { console.error('错误:', e.message); await client.logout(); }
})();
`;

    case 'Java':
      return `import com.google.gson.*;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

/**
 * 卡密验证系统 Java 客户端
 * 依赖: com.google.code.gson:gson (Maven)
 */
public class CardVerifyClient {
    private static final String API_BASE = "${base}";
    private static final String APP_KEY = "${appKey}";
    private static final String APP_SECRET = "${appSecret}";

    private final HttpClient http = HttpClient.newHttpClient();
    private String userId, heartbeatToken;

    private String hmacSign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(APP_SECRET.getBytes(), "HmacSHA256"));
            byte[] h = mac.doFinal(data.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : h) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    private String randomNonce() {
        byte[] b = new byte[8]; new SecureRandom().nextBytes(b);
        StringBuilder sb = new StringBuilder();
        for (byte x : b) sb.append(String.format("%02x", x));
        return sb.toString();
    }

    private JsonObject send(String ep, Map<String, Object> payload) throws Exception {
        long ts = Instant.now().toEpochMilli();
        String nonce = randomNonce();
        payload.put("appKey", APP_KEY); payload.put("timestamp", ts); payload.put("nonce", nonce);
        Gson gson = new Gson();
        String body = gson.toJson(payload);
        payload.put("signature", hmacSign(ts + nonce + body));
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(API_BASE + "/api/client/" + ep))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(payload)))
            .build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        return JsonParser.parseString(resp.body()).getAsJsonObject();
    }

    private String decrypt(String enc, String iv, String challenge) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] key = md.digest(challenge.getBytes());
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"),
            new IvParameterSpec(Base64.getDecoder().decode(iv)));
        return new String(cipher.doFinal(Base64.getDecoder().decode(enc)));
    }

    public String getChallenge() throws Exception {
        JsonObject r = send("challenge", new HashMap<>());
        if (r.get("code").getAsInt() != 0) throw new Exception(r.get("message").getAsString());
        return r.getAsJsonObject("data").get("challenge").getAsString();
    }

    public Map<String, Object> activate(String cardKey, String username, String hw) throws Exception {
        String ch = getChallenge();
        String cr = ch + ":" + hmacSign(ch + cardKey + username);
        Map<String, Object> p = new HashMap<>();
        p.put("cardKey", cardKey); p.put("username", username);
        p.put("hardwareInfo", hw); p.put("challengeResponse", cr);
        JsonObject r = send("activate", p);
        if (r.get("code").getAsInt() != 0) throw new Exception(r.get("message").getAsString());
        JsonObject d = r.getAsJsonObject("data");
        userId = d.get("userId").getAsString();
        String dec = decrypt(d.get("encrypted").getAsString(), d.get("iv").getAsString(), ch);
        JsonObject decJson = JsonParser.parseString(dec).getAsJsonObject();
        heartbeatToken = decJson.get("heartbeatToken").getAsString();
        Map<String, Object> result = new HashMap<>();
        result.put("userId", userId);
        result.put("heartbeatToken", heartbeatToken);
        return result;
    }

    public Map<String, Object> heartbeat() throws Exception {
        if (userId == null) throw new Exception("请先激活");
        Map<String, Object> p = new HashMap<>();
        p.put("userId", userId); p.put("heartbeatToken", heartbeatToken);
        JsonObject r = send("heartbeat", p);
        if (r.get("code").getAsInt() != 0) throw new Exception(r.get("message").getAsString());
        JsonObject d = r.getAsJsonObject("data");
        String ch = d.get("challenge").getAsString();
        String dec = decrypt(d.get("encrypted").getAsString(), d.get("iv").getAsString(), ch);
        JsonObject decJson = JsonParser.parseString(dec).getAsJsonObject();
        heartbeatToken = decJson.get("heartbeatToken").getAsString();
        Map<String, Object> result = new HashMap<>();
        result.put("heartbeatToken", heartbeatToken);
        return result;
    }

    public void logout() throws Exception {
        if (userId != null) {
            Map<String, Object> p = new HashMap<>();
            p.put("userId", userId);
            send("logout", p);
            userId = null; heartbeatToken = null;
        }
    }

    public static String collectHardwareInfo() {
        Map<String, Object> info = new HashMap<>();
        try {
            // CPU
            info.put("cpuCores", Runtime.getRuntime().availableProcessors());
            info.put("cpuArch", System.getProperty("os.arch"));
            // OS
            info.put("osName", System.getProperty("os.name"));
            info.put("osVersion", System.getProperty("os.version"));
            info.put("hostname", InetAddress.getLocalHost().getHostName());
            // Network MACs
            java.util.List<String> macs = new ArrayList<>();
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isLoopback() && ni.isUp()) {
                    byte[] mac = ni.getHardwareAddress();
                    if (mac != null) {
                        StringBuilder sb = new StringBuilder();
                        for (byte b : mac) sb.append(String.format("%02x:", b));
                        if (sb.length() > 0) sb.setLength(sb.length() - 1);
                        macs.add(sb.toString());
                    }
                }
            }
            info.put("macAddresses", macs);
            // Memory
            info.put("totalMemory", Runtime.getRuntime().maxMemory());
            // Disk
            for (File root : File.listRoots()) {
                info.put("diskTotal", root.getTotalSpace());
                break;
            }
        } catch (Exception e) {}
        return new Gson().toJson(info);
    }

    // ========== 使用示例 ==========
    public static void main(String[] args) {
        CardVerifyClient client = new CardVerifyClient();
        String hw = collectHardwareInfo();
        try {
            Map<String, Object> result = client.activate("YOUR_CARD_KEY", "player_123", hw);
            System.out.println("激活成功! " + result);
            ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
            scheduler.scheduleAtFixedRate(() -> {
                try { System.out.println("心跳: " + client.heartbeat()); }
                catch (Exception e) { scheduler.shutdown(); }
            }, 60, 60, TimeUnit.SECONDS);
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try { client.logout(); } catch (Exception e) {}
            }));
            Thread.currentThread().join();
        } catch (Exception e) { System.err.println("错误: " + e.getMessage()); try { client.logout(); } catch (Exception ex) {} }
    }
}
`;

    case 'Go':
      return `package main

import (
    "bytes"
    "crypto/aes"
    "crypto/cipher"
    "crypto/hmac"
    "crypto/rand"
    "crypto/sha256"
    "encoding/base64"
    "encoding/hex"
    "encoding/json"
    "errors"
    "fmt"
    "io"
    "net"
    "net/http"
    "os"
    "os/exec"
    "runtime"
    "strings"
    "time"
)

// 卡密验证系统 Go 客户端
type CardVerifyClient struct {
    apiBase        string
    appKey         string
    appSecret      string
    userId         string
    heartbeatToken string
    client         *http.Client
}

func NewCardVerifyClient() *CardVerifyClient {
    return &CardVerifyClient{
        apiBase:   "${base}",
        appKey:    "${appKey}",
        appSecret: "${appSecret}",
        client:    &http.Client{Timeout: 30 * time.Second},
    }
}

func (c *CardVerifyClient) hmacSign(data string) string {
    mac := hmac.New(sha256.New, []byte(c.appSecret))
    mac.Write([]byte(data))
    return hex.EncodeToString(mac.Sum(nil))
}

func (c *CardVerifyClient) randomNonce() string {
    b := make([]byte, 8)
    rand.Read(b)
    return hex.EncodeToString(b)
}

func (c *CardVerifyClient) send(ep string, payload map[string]interface{}) (map[string]interface{}, error) {
    ts := time.Now().UnixMilli()
    nonce := c.randomNonce()
    payload["appKey"] = c.appKey
    payload["timestamp"] = ts
    payload["nonce"] = nonce
    body, _ := json.Marshal(payload)
    payload["signature"] = c.hmacSign(fmt.Sprintf("%d%s%s", ts, nonce, string(body)))
    reqBody, _ := json.Marshal(payload)
    resp, err := c.client.Post(c.apiBase+"/api/client/"+ep, "application/json", bytes.NewReader(reqBody))
    if err != nil { return nil, err }
    defer resp.Body.Close()
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result, nil
}

func (c *CardVerifyClient) decrypt(enc, iv, challenge string) (string, error) {
    key := sha256.Sum256([]byte(challenge))
    block, _ := aes.NewCipher(key[:])
    ivBytes, _ := base64.StdEncoding.DecodeString(iv)
    encBytes, _ := base64.StdEncoding.DecodeString(enc)
    mode := cipher.NewCBCDecrypter(block, ivBytes)
    mode.CryptBlocks(encBytes, encBytes)
    // PKCS7 unpad
    padLen := int(encBytes[len(encBytes)-1])
    return string(encBytes[:len(encBytes)-padLen]), nil
}

func (c *CardVerifyClient) GetChallenge() (string, error) {
    r, err := c.send("challenge", map[string]interface{}{})
    if err != nil { return "", err }
    if r["code"].(float64) != 0 { return "", errors.New(r["message"].(string)) }
    return r["data"].(map[string]interface{})["challenge"].(string), nil
}

func (c *CardVerifyClient) Activate(cardKey, username, hw string) (map[string]interface{}, error) {
    ch, err := c.GetChallenge()
    if err != nil { return nil, err }
    cr := ch + ":" + c.hmacSign(ch+cardKey+username)
    p := map[string]interface{}{"cardKey": cardKey, "username": username, "hardwareInfo": hw, "challengeResponse": cr}
    r, err := c.send("activate", p)
    if err != nil { return nil, err }
    if r["code"].(float64) != 0 { return nil, errors.New(r["message"].(string)) }
    d := r["data"].(map[string]interface{})
    c.userId = d["userId"].(string)
    dec, _ := c.decrypt(d["encrypted"].(string), d["iv"].(string), ch)
    var decJson map[string]interface{}
    json.Unmarshal([]byte(dec), &decJson)
    c.heartbeatToken = decJson["heartbeatToken"].(string)
    return map[string]interface{}{"userId": c.userId, "heartbeatToken": c.heartbeatToken}, nil
}

func (c *CardVerifyClient) Heartbeat() (map[string]interface{}, error) {
    if c.userId == "" { return nil, errors.New("请先激活") }
    p := map[string]interface{}{"userId": c.userId, "heartbeatToken": c.heartbeatToken}
    r, err := c.send("heartbeat", p)
    if err != nil { return nil, err }
    if r["code"].(float64) != 0 { return nil, errors.New(r["message"].(string)) }
    d := r["data"].(map[string]interface{})
    ch := d["challenge"].(string)
    dec, _ := c.decrypt(d["encrypted"].(string), d["iv"].(string), ch)
    var decJson map[string]interface{}
    json.Unmarshal([]byte(dec), &decJson)
    c.heartbeatToken = decJson["heartbeatToken"].(string)
    return map[string]interface{}{"heartbeatToken": c.heartbeatToken}, nil
}

func (c *CardVerifyClient) Logout() {
    if c.userId != "" {
        c.send("logout", map[string]interface{}{"userId": c.userId})
        c.userId = ""; c.heartbeatToken = ""
    }
}

func CollectHardwareInfo() string {
    info := map[string]interface{}{}
    // CPU
    info["cpuCores"] = runtime.NumCPU()
    info["cpuArch"] = runtime.GOARCH
    // Hostname
    host, _ := os.Hostname()
    info["hostname"] = host
    // OS
    info["osName"] = runtime.GOOS
    // Network MACs
    var macs []string
    ifaces, _ := net.Interfaces()
    for _, iface := range ifaces {
        if iface.Flags&net.FlagUp != 0 && iface.Flags&net.FlagLoopback == 0 {
            macs = append(macs, iface.HardwareAddr.String())
        }
    }
    info["macAddresses"] = macs
    // Disk (Linux)
    if runtime.GOOS == "linux" {
        out, _ := exec.Command("sh", "-c", "lsblk -o SERIAL -nd 2>/dev/null | head -1").Output()
        info["diskSerial"] = strings.TrimSpace(string(out))
    }
    // CPU Serial (Linux)
    if runtime.GOOS == "linux" {
        out, _ := exec.Command("sh", "-c", "cat /proc/cpuinfo | grep Serial | awk '{print $3}'").Output()
        info["cpuSerial"] = strings.TrimSpace(string(out))
    }
    // Memory (Linux)
    if runtime.GOOS == "linux" {
        mem, _ := os.ReadFile("/proc/meminfo")
        info["meminfo"] = strings.TrimSpace(string(mem))
    }
    b, _ := json.Marshal(info)
    return string(b)
}

// ========== 使用示例 ==========
func main() {
    client := NewCardVerifyClient()
    hw := CollectHardwareInfo()
    result, err := client.Activate("YOUR_CARD_KEY", "player_123", hw)
    if err != nil { fmt.Println("错误:", err); client.Logout(); return }
    fmt.Println("激活成功!", result)
    go func() {
        for {
            time.Sleep(60 * time.Second)
            hb, err := client.Heartbeat()
            if err != nil { fmt.Println("心跳失败:", err); return }
            fmt.Println("心跳:", hb)
        }
    }()
    select {}
}
`;

    case 'Rust':
      return `// 卡密验证系统 Rust 客户端
// Cargo.toml 依赖:
// [dependencies]
// reqwest = { version = "0.12", features = ["json", "rustls-tls"] }
// serde = { version = "1", features = ["derive"] }
// serde_json = "1"
// tokio = { version = "1", features = ["full"] }
// hmac = "0.12"
// sha2 = "0.10"
// hex = "0.4"
// rand = "0.8"
// aes = "0.8"
// cbc = "0.1"
// base64 = "0.22"

use aes::cipher::{block_padding::Pkcs7, BlockDecryptMut, KeyIvInit};
use hmac::{Hmac, Mac};
use rand::Rng;
use sha2::Sha256;
use std::collections::HashMap;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;
type Aes256CbcDec = cbc::Decryptor<aes::Aes256>;

const API_BASE: &str = "${base}";
const APP_KEY: &str = "${appKey}";
const APP_SECRET: &str = "${appSecret}";

struct CardVerifyClient {
    client: reqwest::Client,
    user_id: Option<String>,
    heartbeat_token: Option<String>,
}

impl CardVerifyClient {
    fn new() -> Self {
        CardVerifyClient { client: reqwest::Client::new(), user_id: None, heartbeat_token: None }
    }

    fn hmac_sign(&self, data: &str) -> String {
        let mut mac = HmacSha256::new_from_slice(APP_SECRET.as_bytes()).unwrap();
        mac.update(data.as_bytes());
        hex::encode(mac.finalize().into_bytes())
    }

    fn random_nonce() -> String {
        let b: [u8; 8] = rand::thread_rng().gen();
        hex::encode(b)
    }

    async fn send(&self, ep: &str, mut payload: HashMap<String, serde_json::Value>) -> Result<serde_json::Value, String> {
        let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
        let nonce = Self::random_nonce();
        payload.insert("appKey".into(), APP_KEY.into());
        payload.insert("timestamp".into(), ts.into());
        payload.insert("nonce".into(), nonce.clone().into());
        let body = serde_json::to_string(&payload).unwrap();
        let sig = self.hmac_sign(&format!("{}{}{}", ts, nonce, body));
        payload.insert("signature".into(), sig.into());
        let resp = self.client.post(format!("{}/api/client/{}", API_BASE, ep))
            .json(&payload).send().await.map_err(|e| e.to_string())?;
        resp.json().await.map_err(|e| e.to_string())
    }

    fn decrypt(&self, enc: &str, iv: &str, challenge: &str) -> Result<String, String> {
        let key = sha2::Sha256::digest(challenge.as_bytes());
        let iv_bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, iv).map_err(|e| e.to_string())?;
        let enc_bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, enc).map_err(|e| e.to_string())?;
        let dec = Aes256CbcDec::new(key.as_slice().into(), iv_bytes.as_slice().into())
            .decrypt_padded_vec_mut::<Pkcs7>(&enc_bytes).map_err(|e| format!("{:?}", e))?;
        String::from_utf8(dec).map_err(|e| e.to_string())
    }

    async fn get_challenge(&self) -> Result<String, String> {
        let r = self.send("challenge", HashMap::new()).await?;
        if r["code"].as_i64().unwrap() != 0 { return Err(r["message"].as_str().unwrap().to_string()); }
        Ok(r["data"]["challenge"].as_str().unwrap().to_string())
    }

    async fn activate(&mut self, card_key: &str, username: &str, hw: &str) -> Result<HashMap<String, String>, String> {
        let ch = self.get_challenge().await?;
        let cr = format!("{}:{}", ch, self.hmac_sign(&format!("{}{}{}", ch, card_key, username)));
        let mut p = HashMap::new();
        p.insert("cardKey".into(), card_key.into());
        p.insert("username".into(), username.into());
        p.insert("hardwareInfo".into(), hw.into());
        p.insert("challengeResponse".into(), cr.into());
        let r = self.send("activate", p).await?;
        if r["code"].as_i64().unwrap() != 0 { return Err(r["message"].as_str().unwrap().to_string()); }
        let d = &r["data"];
        self.user_id = Some(d["userId"].as_str().unwrap().to_string());
        let dec = self.decrypt(d["encrypted"].as_str().unwrap(), d["iv"].as_str().unwrap(), &ch)?;
        let dec_json: serde_json::Value = serde_json::from_str(&dec).unwrap();
        self.heartbeat_token = Some(dec_json["heartbeatToken"].as_str().unwrap().to_string());
        let mut result = HashMap::new();
        result.insert("userId".into(), self.user_id.clone().unwrap());
        result.insert("heartbeatToken".into(), self.heartbeat_token.clone().unwrap());
        Ok(result)
    }

    async fn heartbeat(&mut self) -> Result<HashMap<String, String>, String> {
        if self.user_id.is_none() { return Err("请先激活".into()); }
        let mut p = HashMap::new();
        p.insert("userId".into(), self.user_id.clone().unwrap().into());
        p.insert("heartbeatToken".into(), self.heartbeat_token.clone().unwrap().into());
        let r = self.send("heartbeat", p).await?;
        if r["code"].as_i64().unwrap() != 0 { return Err(r["message"].as_str().unwrap().to_string()); }
        let d = &r["data"];
        let ch = d["challenge"].as_str().unwrap();
        let dec = self.decrypt(d["encrypted"].as_str().unwrap(), d["iv"].as_str().unwrap(), &ch)?;
        let dec_json: serde_json::Value = serde_json::from_str(&dec).unwrap();
        self.heartbeat_token = Some(dec_json["heartbeatToken"].as_str().unwrap().to_string());
        let mut result = HashMap::new();
        result.insert("heartbeatToken".into(), self.heartbeat_token.clone().unwrap());
        Ok(result)
    }

    async fn logout(&mut self) {
        if let Some(ref uid) = self.user_id {
            let mut p = HashMap::new();
            p.insert("userId".into(), uid.clone().into());
            let _ = self.send("logout", p).await;
            self.user_id = None; self.heartbeat_token = None;
        }
    }
}

fn collect_hardware_info() -> String {
    let mut info = HashMap::new();
    // CPU
    info.insert("cpuCores", num_cpus::get().into());
    info.insert("cpuArch", std::env::consts::ARCH.into());
    // Hostname
    if let Ok(h) = hostname::get() {
        info.insert("hostname", h.to_string_lossy().into());
    }
    // OS
    info.insert("osName", std::env::consts::OS.into());
    // Linux specific
    if cfg!(target_os = "linux") {
        if let Ok(out) = Command::new("sh").arg("-c").arg("cat /proc/cpuinfo | grep Serial | awk '{print $3}'").output() {
            info.insert("cpuSerial", String::from_utf8_lossy(&out.stdout).trim().into());
        }
        if let Ok(out) = Command::new("sh").arg("-c").arg("cat /sys/class/dmi/id/product_uuid 2>/dev/null").output() {
            info.insert("biosUuid", String::from_utf8_lossy(&out.stdout).trim().into());
        }
        if let Ok(out) = Command::new("sh").arg("-c").arg("lsblk -o SERIAL -nd 2>/dev/null | head -1").output() {
            info.insert("diskSerial", String::from_utf8_lossy(&out.stdout).trim().into());
        }
    }
    serde_json::to_string(&info).unwrap()
}

// ========== 使用示例 ==========
#[tokio::main]
async fn main() {
    let mut client = CardVerifyClient::new();
    let hw = collect_hardware_info();
    match client.activate("YOUR_CARD_KEY", "player_123", &hw).await {
        Ok(r) => {
            println!("激活成功! {:?}", r);
            tokio::spawn(async move {
                loop {
                    tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
                    match client.heartbeat().await {
                        Ok(hb) => println!("心跳: {:?}", hb),
                        Err(_) => break,
                    }
                }
            });
            tokio::signal::ctrl_c().await.unwrap();
            client.logout().await;
        }
        Err(e) => { eprintln!("错误: {}", e); client.logout().await; }
    }
}
`;

    case 'C++':
      return `/**
 * 卡密验证系统 C++ 客户端
 * 依赖: libcurl, OpenSSL, nlohmann/json
 * 编译: g++ -std=c++17 -o client main.cpp -lcurl -lssl -lcrypto
 */
#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <iomanip>
#include <random>
#include <chrono>
#include <thread>
#include <curl/curl.h>
#include <openssl/hmac.h>
#include <openssl/sha.h>
#include <openssl/aes.h>
#include <openssl/rand.h>
#include <nlohmann/json.hpp>
#ifdef _WIN32
#include <windows.h>
#include <iphlpapi.h>
#pragma comment(lib, "iphlpapi.lib")
#else
#include <sys/utsname.h>
#include <unistd.h>
#endif

using json = nlohmann::json;

const std::string API_BASE = "${base}";
const std::string APP_KEY = "${appKey}";
const std::string APP_SECRET = "${appSecret}";

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* output) {
    output->append((char*)contents, size * nmemb);
    return size * nmemb;
}

class CardVerifyClient {
    std::string userId, heartbeatToken;
    CURL* curl;

    std::string hmacSign(const std::string& data) {
        unsigned char* result = HMAC(EVP_sha256(), APP_SECRET.c_str(), APP_SECRET.size(),
            (const unsigned char*)data.c_str(), data.size(), nullptr, nullptr);
        std::ostringstream oss;
        for (int i = 0; i < 32; i++) oss << std::hex << std::setw(2) << std::setfill('0') << (int)result[i];
        return oss.str();
    }

    std::string randomNonce() {
        unsigned char b[8]; RAND_bytes(b, 8);
        std::ostringstream oss;
        for (int i = 0; i < 8; i++) oss << std::hex << std::setw(2) << std::setfill('0') << (int)b[i];
        return oss.str();
    }

    std::string b64Decode(const std::string& in) {
        // simplified base64 decode using OpenSSL BIO
        BIO* b64 = BIO_new(BIO_f_base64());
        BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL);
        BIO* bmem = BIO_new_mem_buf(in.c_str(), in.size());
        BIO* chain = BIO_push(b64, bmem);
        std::vector<unsigned char> buf(in.size());
        int len = BIO_read(chain, buf.data(), buf.size());
        BIO_free_all(chain);
        return std::string((char*)buf.data(), len);
    }

    std::string decrypt(const std::string& enc, const std::string& iv, const std::string& challenge) {
        unsigned char key[32];
        SHA256((const unsigned char*)challenge.c_str(), challenge.size(), key);
        std::string ivRaw = b64Decode(iv);
        std::string encRaw = b64Decode(enc);
        AES_KEY decKey;
        AES_set_decrypt_key(key, 256, &decKey);
        unsigned char ivBytes[16];
        memcpy(ivBytes, ivRaw.c_str(), 16);
        std::vector<unsigned char> out(encRaw.size());
        AES_cbc_encrypt((const unsigned char*)encRaw.c_str(), out.data(), encRaw.size(), &decKey, ivBytes, AES_DECRYPT);
        int pad = out.back();
        return std::string((char*)out.data(), out.size() - pad);
    }

    json send(const std::string& ep, json payload) {
        auto ts = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        auto nonce = randomNonce();
        payload["appKey"] = APP_KEY; payload["timestamp"] = ts; payload["nonce"] = nonce;
        std::string body = payload.dump();
        payload["signature"] = hmacSign(std::to_string(ts) + nonce + body);
        std::string reqBody = payload.dump();
        std::string respStr;
        curl_easy_setopt(curl, CURLOPT_URL, (API_BASE + "/api/client/" + ep).c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, reqBody.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &respStr);
        curl_easy_perform(curl);
        return json::parse(respStr);
    }

public:
    CardVerifyClient() { curl = curl_easy_init(); curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L); }
    ~CardVerifyClient() { curl_easy_cleanup(curl); }

    std::string getChallenge() {
        auto r = send("challenge", json::object());
        if (r["code"] != 0) throw std::runtime_error(r["message"]);
        return r["data"]["challenge"];
    }

    json activate(const std::string& cardKey, const std::string& username, const std::string& hw) {
        auto ch = getChallenge();
        auto cr = ch + ":" + hmacSign(ch + cardKey + username);
        json p = {{"cardKey", cardKey}, {"username", username}, {"hardwareInfo", hw}, {"challengeResponse", cr}};
        auto r = send("activate", p);
        if (r["code"] != 0) throw std::runtime_error(r["message"]);
        auto d = r["data"]; userId = d["userId"];
        auto dec = json::parse(decrypt(d["encrypted"], d["iv"], ch));
        heartbeatToken = dec["heartbeatToken"];
        return {{"userId", userId}, {"heartbeatToken", heartbeatToken}};
    }

    json heartbeat() {
        if (userId.empty()) throw std::runtime_error("请先激活");
        json p = {{"userId", userId}, {"heartbeatToken", heartbeatToken}};
        auto r = send("heartbeat", p);
        if (r["code"] != 0) throw std::runtime_error(r["message"]);
        auto d = r["data"]; auto ch = d["challenge"];
        auto dec = json::parse(decrypt(d["encrypted"], d["iv"], ch));
        heartbeatToken = dec["heartbeatToken"];
        return {{"heartbeatToken", heartbeatToken}};
    }

    void logout() {
        if (!userId.empty()) { send("logout", {{"userId", userId}}); userId.clear(); heartbeatToken.clear(); }
    }
};

std::string collectHardwareInfo() {
    json info;
    info["cpuCores"] = std::thread::hardware_concurrency();
#ifdef _WIN32
    info["osName"] = "Windows";
    char host[256]; DWORD sz = sizeof(host);
    GetComputerNameA(host, &sz); info["hostname"] = host;
    MEMORYSTATUSEX mem; mem.dwLength = sizeof(mem);
    GlobalMemoryStatusEx(&mem); info["totalMemory"] = mem.ullTotalPhys;
    ULONG bufLen = 15000;
    PIP_ADAPTER_INFO adapters = (PIP_ADAPTER_INFO)malloc(bufLen);
    std::vector<std::string> macs;
    if (GetAdaptersInfo(adapters, &bufLen) == NO_ERROR) {
        for (PIP_ADAPTER_INFO a = adapters; a; a = a->Next) {
            std::ostringstream oss;
            for (UINT i = 0; i < a->AddressLength; i++)
                oss << std::hex << std::setw(2) << std::setfill('0') << (int)a->Address[i] << ":";
            std::string m = oss.str(); if (!m.empty()) m.pop_back();
            macs.push_back(m);
        }
    }
    free(adapters); info["macAddresses"] = macs;
#else
    struct utsname uts; uname(&uts);
    info["osName"] = uts.sysname; info["osVersion"] = uts.release;
    info["hostname"] = uts.nodename; info["machineArch"] = uts.machine;
#endif
    return info.dump();
}

// ========== 使用示例 ==========
int main() {
    CardVerifyClient client;
    auto hw = collectHardwareInfo();
    try {
        auto result = client.activate("YOUR_CARD_KEY", "player_123", hw);
        std::cout << "激活成功! " << result << std::endl;
        std::thread hb([&]() {
            while (true) {
                std::this_thread::sleep_for(std::chrono::seconds(60));
                try { std::cout << "心跳: " << client.heartbeat() << std::endl; }
                catch (...) { break; }
            }
        });
        hb.join();
    } catch (const std::exception& e) {
        std::cerr << "错误: " << e.what() << std::endl;
        client.logout();
    }
    return 0;
}
`;

    case 'PHP':
      return `<?php
/**
 * 卡密验证系统 PHP 客户端
 * 依赖: PHP 7.4+, ext-curl, ext-openssl
 */
class CardVerifyClient {
    private string $apiBase = '${base}';
    private string $appKey = '${appKey}';
    private string $appSecret = '${appSecret}';
    private ?string $userId = null;
    private ?string $heartbeatToken = null;

    private function hmacSign(string $data): string {
        return hash_hmac('sha256', $data, $this->appSecret);
    }

    private function randomNonce(): string {
        return bin2hex(random_bytes(8));
    }

    private function send(string $ep, array $payload): array {
        $ts = intval(microtime(true) * 1000);
        $nonce = $this->randomNonce();
        $payload['appKey'] = $this->appKey;
        $payload['timestamp'] = $ts;
        $payload['nonce'] = $nonce;
        $body = json_encode($payload);
        $payload['signature'] = $this->hmacSign($ts . $nonce . $body);
        $ch = curl_init($this->apiBase . '/api/client/' . $ep);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        $resp = curl_exec($ch); curl_close($ch);
        return json_decode($resp, true);
    }

    private function decrypt(string $enc, string $iv, string $challenge): string {
        $key = hash('sha256', $challenge, true);
        $ivBin = base64_decode($iv);
        $encBin = base64_decode($enc);
        return openssl_decrypt($encBin, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $ivBin);
    }

    public function getChallenge(): string {
        $r = $this->send('challenge', []);
        if ($r['code'] !== 0) throw new Exception($r['message']);
        return $r['data']['challenge'];
    }

    public function activate(string $cardKey, string $username, string $hw): array {
        $ch = $this->getChallenge();
        $cr = $ch . ':' . $this->hmacSign($ch . $cardKey . $username);
        $r = $this->send('activate', [
            'cardKey' => $cardKey, 'username' => $username,
            'hardwareInfo' => $hw, 'challengeResponse' => $cr,
        ]);
        if ($r['code'] !== 0) throw new Exception($r['message']);
        $d = $r['data']; $this->userId = $d['userId'];
        $dec = json_decode($this->decrypt($d['encrypted'], $d['iv'], $ch), true);
        $this->heartbeatToken = $dec['heartbeatToken'];
        return ['userId' => $this->userId, 'heartbeatToken' => $dec['heartbeatToken']];
    }

    public function heartbeat(): array {
        if (!$this->userId) throw new Exception('请先激活');
        $r = $this->send('heartbeat', ['userId' => $this->userId, 'heartbeatToken' => $this->heartbeatToken]);
        if ($r['code'] !== 0) throw new Exception($r['message']);
        $d = $r['data']; $ch = $d['challenge'];
        $dec = json_decode($this->decrypt($d['encrypted'], $d['iv'], $ch), true);
        $this->heartbeatToken = $dec['heartbeatToken'];
        return ['heartbeatToken' => $dec['heartbeatToken']];
    }

    public function logout(): void {
        if ($this->userId) {
            $this->send('logout', ['userId' => $this->userId]);
            $this->userId = null; $this->heartbeatToken = null;
        }
    }

    public static function collectHardwareInfo(): string {
        $info = [];
        // CPU
        $info['cpuCores'] = (int)shell_exec('nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1');
        $info['cpuArch'] = php_uname('m');
        // CPU Serial
        if (PHP_OS_FAMILY === 'Windows') {
            $out = shell_exec('wmic cpu get ProcessorId');
            if (preg_match('/[A-Fa-f0-9]{16}/', $out, $m)) $info['cpuSerial'] = $m[0];
        } elseif (PHP_OS_FAMILY === 'Linux') {
            $info['cpuSerial'] = trim(shell_exec("cat /proc/cpuinfo | grep Serial | awk '{print $3}'") ?? '');
        }
        // Motherboard
        if (PHP_OS_FAMILY === 'Windows') {
            $info['mbSerial'] = trim(explode("\\n", shell_exec('wmic baseboard get SerialNumber') ?? '')[1] ?? '');
            $info['mbManufacturer'] = trim(explode("\\n", shell_exec('wmic baseboard get Manufacturer') ?? '')[1] ?? '');
        } elseif (PHP_OS_FAMILY === 'Linux') {
            $info['mbSerial'] = trim(shell_exec('cat /sys/class/dmi/id/board_serial 2>/dev/null') ?? '');
            $info['mbManufacturer'] = trim(shell_exec('cat /sys/class/dmi/id/board_vendor 2>/dev/null') ?? '');
        }
        // BIOS
        if (PHP_OS_FAMILY === 'Windows') {
            $info['biosUuid'] = trim(explode("\\n", shell_exec('wmic csproduct get UUID') ?? '')[1] ?? '');
        } elseif (PHP_OS_FAMILY === 'Linux') {
            $info['biosUuid'] = trim(shell_exec('cat /sys/class/dmi/id/product_uuid 2>/dev/null') ?? '');
        }
        // Disk
        if (PHP_OS_FAMILY === 'Windows') {
            $disks = array_slice(explode("\\n", trim(shell_exec('wmic diskdrive get SerialNumber,Model') ?? '')), 1);
            $parts = preg_split('/\\s+/', trim($disks[0] ?? ''));
            $info['diskSerial'] = end($parts);
            $info['diskModel'] = implode(' ', array_slice($parts, 0, -1));
        }
        // Network
        if (PHP_OS_FAMILY === 'Linux') {
            $macs = array_filter(explode("\\n", shell_exec("cat /sys/class/net/*/address 2>/dev/null") ?? ''));
        } else {
            $macs = [];
        }
        $info['macAddresses'] = $macs;
        // Memory
        $info['totalMemory'] = (int)ini_get('memory_limit') * 1024 * 1024;
        // OS
        $info['osName'] = PHP_OS_FAMILY;
        $info['osVersion'] = php_uname('r');
        $info['hostname'] = gethostname();
        return json_encode($info);
    }
}

// ========== 使用示例 ==========
$client = new CardVerifyClient();
$hw = CardVerifyClient::collectHardwareInfo();
try {
    $result = $client->activate('YOUR_CARD_KEY', 'player_123', $hw);
    echo "激活成功! " . json_encode($result) . PHP_EOL;
    // 心跳循环
    while (true) {
        sleep(60);
        try { echo "心跳: " . json_encode($client->heartbeat()) . PHP_EOL; }
        catch (Exception $e) { break; }
    }
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . PHP_EOL;
    $client->logout();
}
`;

    case 'Ruby':
      return `# 卡密验证系统 Ruby 客户端
# 依赖: gem install openssl json net/http

require 'openssl'
require 'json'
require 'net/http'
require 'securerandom'
require 'socket'
require 'base64'

class CardVerifyClient
  API_BASE = '${base}'.freeze
  APP_KEY = '${appKey}'.freeze
  APP_SECRET = '${appSecret}'.freeze

  def initialize
    @user_id = nil
    @heartbeat_token = nil
  end

  private

  def hmac_sign(data)
    OpenSSL::HMAC.hexdigest('SHA256', APP_SECRET, data)
  end

  def random_nonce
    SecureRandom.hex(8)
  end

  def send_request(ep, payload = {})
    ts = (Time.now.to_f * 1000).to_i
    nonce = random_nonce
    payload[:appKey] = APP_KEY
    payload[:timestamp] = ts
    payload[:nonce] = nonce
    body = payload.to_json
    payload[:signature] = hmac_sign("#{ts}#{nonce}#{body}")
    uri = URI("#{API_BASE}/api/client/#{ep}")
    req = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')
    req.body = payload.to_json
    res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https', read_timeout: 30) { |http| http.request(req) }
    JSON.parse(res.body)
  end

  def decrypt(enc, iv, challenge)
    key = Digest::SHA256.digest(challenge)
    cipher = OpenSSL::Cipher.new('AES-256-CBC')
    cipher.decrypt
    cipher.key = key
    cipher.iv = Base64.decode64(iv)
    cipher.update(Base64.decode64(enc)) + cipher.final
  end

  public

  def get_challenge
    r = send_request('challenge')
    raise r['message'] unless r['code'] == 0
    r['data']['challenge']
  end

  def activate(card_key, username, hw)
    ch = get_challenge
    cr = "#{ch}:#{hmac_sign("#{ch}#{card_key}#{username}")}"
    r = send_request('activate', {
      cardKey: card_key, username: username,
      hardwareInfo: hw, challengeResponse: cr
    })
    raise r['message'] unless r['code'] == 0
    d = r['data']; @user_id = d['userId']
    dec = JSON.parse(decrypt(d['encrypted'], d['iv'], ch))
    @heartbeat_token = dec['heartbeatToken']
    { userId: @user_id, heartbeatToken: @heartbeat_token }
  end

  def heartbeat
    raise '请先激活' unless @user_id
    r = send_request('heartbeat', { userId: @user_id, heartbeatToken: @heartbeat_token })
    raise r['message'] unless r['code'] == 0
    d = r['data']; ch = get_challenge
    dec = JSON.parse(decrypt(d['encrypted'], d['iv'], ch))
    @heartbeat_token = dec['heartbeatToken']
    { heartbeatToken: @heartbeat_token }
  end

  def logout
    if @user_id
      send_request('logout', { userId: @user_id })
      @user_id = nil; @heartbeat_token = nil
    end
  end

  def self.collect_hardware_info
    info = {}
    # CPU
    info[:cpuArch] = RbConfig::CONFIG['host_cpu']
    # OS
    info[:osName] = RbConfig::CONFIG['host_os']
    info[:hostname] = Socket.gethostname
    # Network
    macs = Socket.getifaddrs
      .select { |i| i.addr && i.addr.ip? && !i.addr.ip_address.start_with?('127.') }
      .map { |i| i.addr.to_s }
    info[:macAddresses] = macs
    # Linux specifics
    if RUBY_PLATFORM.include?('linux')
      info[:cpuSerial] = %x(cat /proc/cpuinfo | grep Serial | awk '{print $3}').strip rescue ''
      info[:mbSerial] = %x(cat /sys/class/dmi/id/board_serial 2>/dev/null).strip rescue ''
      info[:biosUuid] = %x(cat /sys/class/dmi/id/product_uuid 2>/dev/null).strip rescue ''
      info[:diskSerial] = %x(lsblk -o SERIAL -nd 2>/dev/null | head -1).strip rescue ''
    end
    info.to_json
  end
end

# ========== 使用示例 ==========
client = CardVerifyClient.new
hw = CardVerifyClient.collect_hardware_info
begin
  result = client.activate('YOUR_CARD_KEY', 'player_123', hw)
  puts "激活成功! #{result}"
  Thread.new do
    loop do
      sleep 60
      begin
        puts "心跳: #{client.heartbeat}"
      rescue => e
        break
      end
    end
  end.join
rescue => e
  puts "错误: #{e.message}"
  client.logout
end
`;

    case 'Swift':
      return `import Foundation
import CommonCrypto

// 卡密验证系统 Swift 客户端
// 平台: macOS / iOS
class CardVerifyClient {
    private let apiBase = "${base}"
    private let appKey = "${appKey}"
    private let appSecret = "${appSecret}"
    private var userId: String?
    private var heartbeatToken: String?

    private func hmacSign(_ data: String) -> String {
        let key = appSecret.data(using: .utf8)!
        let msg = data.data(using: .utf8)!
        var result = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        key.withUnsafeBytes { keyBytes in
            msg.withUnsafeBytes { msgBytes in
                CCHmac(CCHmacAlgorithm(kCCHmacAlgSHA256), keyBytes.baseAddress, key.count, msgBytes.baseAddress, msg.count, &result)
            }
        }
        return result.map { String(format: "%02x", $0) }.joined()
    }

    private func randomNonce() -> String {
        var bytes = [UInt8](repeating: 0, count: 8)
        _ = SecRandomCopyBytes(kSecRandomDefault, 8, &bytes)
        return bytes.map { String(format: "%02x", $0) }.joined()
    }

    private func send(_ ep: String, _ payload: inout [String: Any]) async throws -> [String: Any] {
        let ts = Int64(Date().timeIntervalSince1970 * 1000)
        let nonce = randomNonce()
        payload["appKey"] = appKey; payload["timestamp"] = ts; payload["nonce"] = nonce
        let body = String(data: try JSONSerialization.data(withJSONObject: payload), encoding: .utf8)!
        payload["signature"] = hmacSign("\\(ts)\\(nonce)\\(body)")
        var req = URLRequest(url: URL(string: "\\(apiBase)/api/client/\\(ep)")!)
        req.httpMethod = "POST"; req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONSerialization.jsonObject(with: data) as! [String: Any]
    }

    private func decrypt(_ enc: String, _ iv: String, _ challenge: String) -> String? {
        guard let key = challenge.data(using: .utf8).map({ sha256($0) }),
              let ivData = Data(base64Encoded: iv),
              let encData = Data(base64Encoded: enc) else { return nil }
        var outLen = 0
        var out = [UInt8](repeating: 0, count: encData.count + kCCBlockSizeAES128)
        key.withUnsafeBytes { k in
            ivData.withUnsafeBytes { ivb in
                encData.withUnsafeBytes { eb in
                    CCCrypt(CCOperation(kCCDecrypt), CCAlgorithm(kCCAlgorithmAES),
                        0, k.baseAddress, kCCKeySizeAES256, ivb.baseAddress,
                        eb.baseAddress, encData.count, &out, out.count, &outLen)
                }
            }
        }
        return String(bytes: out.prefix(outLen), encoding: .utf8)
    }

    private func sha256(_ data: Data) -> Data {
        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes { CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash) }
        return Data(hash)
    }

    func getChallenge() async throws -> String {
        var p: [String: Any] = [:]
        let r = try await send("challenge", &p)
        guard let code = r["code"] as? Int, code == 0, let data = r["data"] as? [String: Any] else {
            throw NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: r["message"] as? String ?? ""])
        }
        return data["challenge"] as! String
    }

    func activate(cardKey: String, username: String, hw: String) async throws -> [String: Any] {
        let ch = try await getChallenge()
        let cr = "\\(ch):\\(hmacSign("\\(ch)\\(cardKey)\\(username)"))"
        var p: [String: Any] = ["cardKey": cardKey, "username": username, "hardwareInfo": hw, "challengeResponse": cr]
        let r = try await send("activate", &p)
        guard let code = r["code"] as? Int, code == 0, let d = r["data"] as? [String: Any] else {
            throw NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: r["message"] as? String ?? ""])
        }
        userId = d["userId"] as? String
        let dec = try JSONSerialization.jsonObject(with: (decrypt(d["encrypted"] as! String, d["iv"] as! String, ch) ?? "{}").data(using: .utf8)!) as! [String: Any]
        heartbeatToken = dec["heartbeatToken"] as? String
        return ["userId": userId!, "heartbeatToken": heartbeatToken!]
    }

    func heartbeat() async throws -> [String: Any] {
        guard let uid = userId else { throw NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "请先激活"]) }
        var p: [String: Any] = ["userId": uid, "heartbeatToken": heartbeatToken!]
        let r = try await send("heartbeat", &p)
        guard let code = r["code"] as? Int, code == 0, let d = r["data"] as? [String: Any] else {
            throw NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: r["message"] as? String ?? ""])
        }
        let ch = d["challenge"] as! String
        let dec = try JSONSerialization.jsonObject(with: (decrypt(d["encrypted"] as! String, d["iv"] as! String, ch) ?? "{}").data(using: .utf8)!) as! [String: Any]
        heartbeatToken = dec["heartbeatToken"] as? String
        return ["heartbeatToken": heartbeatToken!]
    }

    func logout() async {
        if let uid = userId {
            var p: [String: Any] = ["userId": uid]
            let _ = try? await send("logout", &p)
            userId = nil; heartbeatToken = nil
        }
    }

    static func collectHardwareInfo() -> String {
        var info: [String: Any] = [:]
        let proc = ProcessInfo.processInfo
        info["cpuCores"] = proc.processorCount
        info["cpuArch"] = proc.activeProcessorCount
        info["osName"] = proc.operatingSystemVersionString
        info["hostname"] = proc.hostName
        info["totalMemory"] = proc.physicalMemory
        // Network
        var macs: [String] = []
        for iface in SCNetworkInterfaceCopyAll() as? [SCNetworkInterface] ?? [] {
            if let addr = SCNetworkInterfaceGetHardwareAddressString(iface) {
                macs.append(addr as String)
            }
        }
        info["macAddresses"] = macs
        return String(data: try! JSONSerialization.data(withJSONObject: info), encoding: .utf8)!
    }
}

// ========== 使用示例 ==========
Task {
    let client = CardVerifyClient()
    let hw = CardVerifyClient.collectHardwareInfo()
    do {
        let result = try await client.activate(cardKey: "YOUR_CARD_KEY", username: "player_123", hw: hw)
        print("激活成功! \\(result)")
        Task {
            while true {
                try await Task.sleep(nanoseconds: 60_000_000_000)
                do { print("心跳: \\(try await client.heartbeat())") }
                catch { break }
            }
        }
        try await Task.sleep(nanoseconds: .max)
    } catch {
        print("错误: \\(error)")
        await client.logout()
    }
}
`;

    case 'Kotlin':
      return `import java.io.*
import java.net.*
import java.nio.charset.StandardCharsets
import java.security.*
import java.time.Instant
import java.util.*
import javax.crypto.*
import javax.crypto.spec.*
import kotlin.concurrent.thread
import kotlinx.serialization.*
import kotlinx.serialization.json.*

/**
 * 卡密验证系统 Kotlin 客户端
 * 依赖: kotlinx-serialization-json, kotlinx-coroutines
 */
class CardVerifyClient {
    companion object {
        private const val API_BASE = "${base}"
        private const val APP_KEY = "${appKey}"
        private const val APP_SECRET = "${appSecret}"
    }

    private var userId: String? = null
    private var heartbeatToken: String? = null

    private fun hmacSign(data: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(APP_SECRET.toByteArray(), "HmacSHA256"))
        return mac.doFinal(data.toByteArray()).joinToString("") { "%02x".format(it) }
    }

    private fun randomNonce(): String {
        val bytes = ByteArray(8); SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun send(ep: String, payload: MutableMap<String, Any?>): JsonObject {
        val ts = Instant.now().toEpochMilli()
        val nonce = randomNonce()
        payload["appKey"] = APP_KEY; payload["timestamp"] = ts; payload["nonce"] = nonce
        val body = Json.encodeToString(JsonObject(payload.mapValues { JsonPrimitive(it.value.toString()) }))
        payload["signature"] = hmacSign("\$ts\$nonce\$body")
        val conn = URL("\$API_BASE/api/client/\$ep").openConnection() as HttpURLConnection
        conn.requestMethod = "POST"; conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true; conn.connectTimeout = 30000
        conn.outputStream.write(Json.encodeToString(JsonObject(payload.mapValues { JsonPrimitive(it.value.toString()) })).toByteArray())
        return Json.parseToJsonElement(conn.inputStream.bufferedReader().readText()).jsonObject
    }

    private fun decrypt(enc: String, iv: String, challenge: String): String {
        val key = MessageDigest.getInstance("SHA-256").digest(challenge.toByteArray())
        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), IvParameterSpec(Base64.getDecoder().decode(iv)))
        return String(cipher.doFinal(Base64.getDecoder().decode(enc)))
    }

    fun getChallenge(): String {
        val r = send("challenge", mutableMapOf())
        if (r["code"]?.jsonPrimitive?.int != 0) throw Exception(r["message"]?.jsonPrimitive?.content)
        return r["data"]!!.jsonObject["challenge"]!!.jsonPrimitive.content
    }

    fun activate(cardKey: String, username: String, hw: String): Map<String, String> {
        val ch = getChallenge()
        val cr = "\$ch:\${hmacSign("\$ch\$cardKey\$username")}"
        val r = send("activate", mutableMapOf(
            "cardKey" to cardKey, "username" to username,
            "hardwareInfo" to hw, "challengeResponse" to cr
        ))
        if (r["code"]?.jsonPrimitive?.int != 0) throw Exception(r["message"]?.jsonPrimitive?.content)
        val d = r["data"]!!.jsonObject
        userId = d["userId"]!!.jsonPrimitive.content
        val dec = Json.parseToJsonElement(decrypt(d["encrypted"]!!.jsonPrimitive.content, d["iv"]!!.jsonPrimitive.content, ch)).jsonObject
        heartbeatToken = dec["heartbeatToken"]!!.jsonPrimitive.content
        return mapOf("userId" to userId!!, "heartbeatToken" to heartbeatToken!!)
    }

    fun heartbeat(): Map<String, String> {
        if (userId == null) throw Exception("请先激活")
        val r = send("heartbeat", mutableMapOf("userId" to userId, "heartbeatToken" to heartbeatToken))
        if (r["code"]?.jsonPrimitive?.int != 0) throw Exception(r["message"]?.jsonPrimitive?.content)
        val d = r["data"]!!.jsonObject; val ch = d["challenge"]!!.jsonPrimitive.content
        val dec = Json.parseToJsonElement(decrypt(d["encrypted"]!!.jsonPrimitive.content, d["iv"]!!.jsonPrimitive.content, ch)).jsonObject
        heartbeatToken = dec["heartbeatToken"]!!.jsonPrimitive.content
        return mapOf("heartbeatToken" to heartbeatToken!!)
    }

    fun logout() {
        if (userId != null) {
            send("logout", mutableMapOf("userId" to userId))
            userId = null; heartbeatToken = null
        }
    }

    companion object {
        fun collectHardwareInfo(): String {
            val info = mutableMapOf<String, Any>()
            info["cpuCores"] = Runtime.getRuntime().availableProcessors()
            info["osName"] = System.getProperty("os.name") ?: ""
            info["osVersion"] = System.getProperty("os.version") ?: ""
            info["hostname"] = InetAddress.getLocalHost().hostName
            info["cpuArch"] = System.getProperty("os.arch") ?: ""
            val macs = NetworkInterface.getNetworkInterfaces().asSequence()
                .filter { !it.isLoopback && it.isUp }
                .mapNotNull { it.hardwareAddress?.joinToString(":") { "%02x".format(it) } }
                .toList()
            info["macAddresses"] = macs
            info["totalMemory"] = Runtime.getRuntime().maxMemory()
            return Json.encodeToString(JsonObject(info.mapValues { JsonPrimitive(it.value.toString()) }))
        }
    }
}

// ========== 使用示例 ==========
fun main() {
    val client = CardVerifyClient()
    val hw = CardVerifyClient.collectHardwareInfo()
    try {
        val result = client.activate("YOUR_CARD_KEY", "player_123", hw)
        println("激活成功! \$result")
        thread(isDaemon = true) {
            while (true) {
                Thread.sleep(60000)
                try { println("心跳: \${client.heartbeat()}") }
                catch (e: Exception) { break }
            }
        }
        Thread.currentThread().join()
    } catch (e: Exception) {
        println("错误: \${e.message}")
        client.logout()
    }
}
`;

    case 'Dart':
      return `import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:encrypt/encrypt.dart' as encrypt;

/// 卡密验证系统 Dart 客户端
/// 依赖: crypto, http, encrypt
class CardVerifyClient {
  static const String apiBase = '${base}';
  static const String appKey = '${appKey}';
  static const String appSecret = '${appSecret}';

  String? userId;
  String? heartbeatToken;
  final http.Client _client = http.Client();

  String _hmacSign(String data) {
    final hmac = Hmac(sha256, utf8.encode(appSecret));
    return hmac.convert(utf8.encode(data)).toString();
  }

  String _randomNonce() {
    final rng = Random.secure();
    return List.generate(8, (_) => rng.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
  }

  Future<Map<String, dynamic>> _send(String ep, Map<String, dynamic> payload) async {
    final ts = DateTime.now().millisecondsSinceEpoch;
    final nonce = _randomNonce();
    payload['appKey'] = appKey;
    payload['timestamp'] = ts;
    payload['nonce'] = nonce;
    final body = jsonEncode(payload);
    payload['signature'] = _hmacSign('\$ts\$nonce\$body');
    final resp = await _client.post(
      Uri.parse('\$apiBase/api/client/\$ep'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    return jsonDecode(resp.body);
  }

  String _decrypt(String enc, String iv, String challenge) {
    final key = encrypt.Key(sha256.convert(utf8.encode(challenge)).bytes);
    final ivObj = encrypt.IV(base64Decode(iv));
    final decrypter = encrypt.Encrypter(encrypt.AES(key, mode: encrypt.AESMode.cbc));
    return decrypter.decrypt(encrypt.Encrypted.fromBase64(enc), iv: ivObj);
  }

  Future<String> getChallenge() async {
    final r = await _send('challenge', {});
    if (r['code'] != 0) throw Exception(r['message']);
    return r['data']['challenge'];
  }

  Future<Map<String, dynamic>> activate(String cardKey, String username, String hw) async {
    final ch = await getChallenge();
    final cr = '\$ch:\${_hmacSign('\$ch\$cardKey\$username')}';
    final r = await _send('activate', {
      'cardKey': cardKey, 'username': username,
      'hardwareInfo': hw, 'challengeResponse': cr,
    });
    if (r['code'] != 0) throw Exception(r['message']);
    final d = r['data'];
    userId = d['userId'];
    final dec = jsonDecode(_decrypt(d['encrypted'], d['iv'], ch));
    heartbeatToken = dec['heartbeatToken'];
    return {'userId': userId, 'heartbeatToken': heartbeatToken};
  }

  Future<Map<String, dynamic>> heartbeat() async {
    if (userId == null) throw Exception('请先激活');
    final r = await _send('heartbeat', {'userId': userId, 'heartbeatToken': heartbeatToken});
    if (r['code'] != 0) throw Exception(r['message']);
    final d = r['data'];
    final ch = d['challenge'];
    final dec = jsonDecode(_decrypt(d['encrypted'], d['iv'], ch));
    heartbeatToken = dec['heartbeatToken'];
    return {'heartbeatToken': heartbeatToken};
  }

  Future<void> logout() async {
    if (userId != null) {
      await _send('logout', {'userId': userId});
      userId = null; heartbeatToken = null;
    }
  }

  static String collectHardwareInfo() {
    final info = <String, dynamic>{};
    info['cpuCores'] = Platform.numberOfProcessors;
    info['osName'] = Platform.operatingSystem;
    info['osVersion'] = Platform.operatingSystemVersion;
    info['hostname'] = Platform.localHostname;
    // Network MACs
    try {
      final macs = NetworkInterface.list()
          .where((i) => !i.addresses.any((a) => a.isLoopback))
          .map((i) => i.addresses.where((a) => a.type == InternetAddressType.Ethernet).firstOrNull?.address ?? '')
          .where((m) => m.isNotEmpty)
          .toList();
      info['macAddresses'] = macs;
    } catch (_) {}
    return jsonEncode(info);
  }
}

// ========== 使用示例 ==========
void main() async {
  final client = CardVerifyClient();
  final hw = CardVerifyClient.collectHardwareInfo();
  try {
    final result = await client.activate('YOUR_CARD_KEY', 'player_123', hw);
    print('激活成功! \$result');
    Timer.periodic(Duration(seconds: 60), (t) async {
      try { print('心跳: \${await client.heartbeat()}'); }
      catch (e) { t.cancel(); }
    });
  } catch (e) {
    print('错误: \$e');
    await client.logout();
  }
}
`;

    case 'Lua':
      return `-- 卡密验证系统 Lua 客户端
-- 依赖: luasocket, luasec, luaossl (或 luacrypto), dkjson
-- luarocks install luasocket luasec luaossl dkjson

local json = require("dkjson")
local socket = require("socket")
local http = require("socket.http")
local ssl = require("ssl")
local openssl = require("openssl")

local CardVerifyClient = {}
CardVerifyClient.__index = CardVerifyClient

local API_BASE = "${base}"
local APP_KEY = "${appKey}"
local APP_SECRET = "${appSecret}"

function CardVerifyClient:new()
    local obj = {
        user_id = nil,
        heartbeat_token = nil,
    }
    setmetatable(obj, self)
    return obj
end

function CardVerifyClient:hmac_sign(data)
    local hmac = openssl.hmac.digest(openssl.digest.get("sha256"), self.APP_SECRET or APP_SECRET, data)
    return hmac:lower()
end

function CardVerifyClient:random_nonce()
    local bytes = openssl.rand_bytes(8)
    local hex = bytes:gsub(".", function(c) return string.format("%02x", string.byte(c)) end)
    return hex
end

function CardVerifyClient:send_request(ep, payload)
    payload = payload or {}
    local ts = math.floor(socket.gettime() * 1000)
    local nonce = self:random_nonce()
    payload.appKey = self.APP_KEY or APP_KEY
    payload.timestamp = ts
    payload.nonce = nonce
    local body = json.encode(payload)
    payload.signature = self:hmac_sign(tostring(ts) .. nonce .. body)
    local reqBody = json.encode(payload)
    local resp, status = http.request {
        url = (self.API_BASE or API_BASE) .. "/api/client/" .. ep,
        method = "POST",
        headers = { ["Content-Type"] = "application/json", ["Content-Length"] = #reqBody },
        source = ltn12.source.string(reqBody),
        sink = ltn12.sink.table(response_body),
        protocol = "tlsv1_2",
    }
    return json.decode(table.concat(response_body))
end

function CardVerifyClient:decrypt(enc, iv, challenge)
    local sha = openssl.digest.get("sha256")
    local key = openssl.digest.digest(sha, challenge)
    local iv_bin = openssl.base64(iv)
    local enc_bin = openssl.base64(enc)
    local cipher = openssl.cipher.get("aes-256-cbc")
    local dec = cipher:decrypt(key, iv_bin):update(enc_bin)
    return dec
end

function CardVerifyClient:get_challenge()
    local r = self:send_request("challenge")
    if r.code ~= 0 then error(r.message) end
    return r.data.challenge
end

function CardVerifyClient:activate(card_key, username, hw)
    local ch = self:get_challenge()
    local cr = ch .. ":" .. self:hmac_sign(ch .. card_key .. username)
    local r = self:send_request("activate", {
        cardKey = card_key, username = username,
        hardwareInfo = hw, challengeResponse = cr,
    })
    if r.code ~= 0 then error(r.message) end
    self.user_id = r.data.userId
    local dec = json.decode(self:decrypt(r.data.encrypted, r.data.iv, ch))
    self.heartbeat_token = dec.heartbeatToken
    return { userId = self.user_id, heartbeatToken = self.heartbeat_token }
end

function CardVerifyClient:heartbeat()
    if not self.user_id then error("请先激活") end
    local r = self:send_request("heartbeat", { userId = self.user_id, heartbeatToken = self.heartbeat_token })
    if r.code ~= 0 then error(r.message) end
    local ch = r.data.challenge
    local dec = json.decode(self:decrypt(r.data.encrypted, r.data.iv, ch))
    self.heartbeat_token = dec.heartbeatToken
    return { heartbeatToken = self.heartbeat_token }
end

function CardVerifyClient:logout()
    if self.user_id then
        self:send_request("logout", { userId = self.user_id })
        self.user_id = nil; self.heartbeat_token = nil
    end
end

function CardVerifyClient.collect_hardware_info()
    local info = {}
    -- CPU
    info.cpuCores = tonumber(io.popen("nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1"):read("*a")) or 1
    -- OS
    local f = io.popen("uname -s 2>/dev/null || echo unknown")
    info.osName = (f:read("*a")):gsub("\\n", ""); f:close()
    local f2 = io.popen("uname -r 2>/dev/null || echo unknown")
    info.osVersion = (f2:read("*a")):gsub("\\n", ""); f2:close()
    local f3 = io.popen("hostname 2>/dev/null || echo unknown")
    info.hostname = (f3:read("*a")):gsub("\\n", ""); f3:close()
    -- CPU Serial (Linux)
    local f4 = io.popen("cat /proc/cpuinfo 2>/dev/null | grep Serial | awk '{print $3}'")
    if f4 then info.cpuSerial = (f4:read("*a")):gsub("\\n", ""); f4:close() end
    -- Disk Serial (Linux)
    local f5 = io.popen("lsblk -o SERIAL -nd 2>/dev/null | head -1")
    if f5 then info.diskSerial = (f5:read("*a")):gsub("\\n", ""); f5:close() end
    return json.encode(info)
end

-- ========== 使用示例 ==========
local client = CardVerifyClient:new()
local hw = CardVerifyClient.collect_hardware_info()
local ok, result = pcall(client.activate, client, "YOUR_CARD_KEY", "player_123", hw)
if ok then
    print("激活成功! " .. json.encode(result))
    -- 心跳循环
    while true do
        socket.sleep(60)
        local ok2, hb = pcall(client.heartbeat, client)
        if ok2 then print("心跳: " .. json.encode(hb))
        else break end
    end
else
    print("错误: " .. tostring(result))
    client:logout()
end
`;

    case 'Shell (curl)':
      return `#!/bin/bash
# 卡密验证系统 Shell/Curl 客户端
# 依赖: curl, openssl, jq

API_BASE="${base}"
APP_KEY="${appKey}"
APP_SECRET="${appSecret}"

# ========== 工具函数 ==========
hmac_sign() {
    echo -n "$1" | openssl dgst -sha256 -hmac "$APP_SECRET" -hex | awk '{print $NF}'
}

random_nonce() {
    openssl rand -hex 8
}

send_request() {
    local ep="$1"
    local payload="$2"
    local ts=$(date +%s%3N)
    local nonce=$(random_nonce)
    local body=$(echo "$payload" | jq -c --arg ak "$APP_KEY" --argjson ts "$ts" --arg nonce "$nonce" \\
        '. + {appKey: $ak, timestamp: $ts, nonce: $nonce}')
    local sig=$(hmac_sign "$ts$nonce$body")
    local final=$(echo "$body" | jq -c --arg sig "$sig" '. + {signature: $sig}')
    curl -s -X POST "$API_BASE/api/client/$ep" \\
        -H "Content-Type: application/json" \\
        -d "$final"
}

# ========== API 方法 ==========
get_challenge() {
    local r=$(send_request "challenge" '{}')
    local code=$(echo "$r" | jq -r '.code')
    if [ "$code" != "0" ]; then
        echo "获取挑战失败: $(echo "$r" | jq -r '.message')" >&2
        return 1
    fi
    echo "$r" | jq -r '.data.challenge'
}

activate() {
    local card_key="$1" username="$2" hw="$3"
    local ch=$(get_challenge) || return 1
    local cr_data="$ch$card_key$username"
    local cr_hash=$(hmac_sign "$cr_data")
    local cr="$ch:$cr_hash"
    local r=$(send_request "activate" "$(jq -n --arg ck "$card_key" --arg un "$username" --arg hw "$hw" --arg cr "$cr" \\
        '{cardKey: $ck, username: $un, hardwareInfo: $hw, challengeResponse: $cr}')")
    echo "$r"
}

heartbeat() {
    local uid="$1" token="$2"
    local r=$(send_request "heartbeat" "$(jq -n --arg uid "$uid" --arg token "$token" \\
        '{userId: $uid, heartbeatToken: $token}')")
    echo "$r"
}

logout() {
    local uid="$1"
    send_request "logout" "$(jq -n --arg uid "$uid" '{userId: $uid}')" > /dev/null
}

# ========== 硬件采集 ==========
collect_hardware_info() {
    local info="{}"
    # CPU
    if [ "$(uname)" = "Linux" ]; then
        info=$(echo "$info" | jq --arg sn "$(cat /proc/cpuinfo | grep Serial | awk '{print $3}' 2>/dev/null)" \\
            --arg cores "$(nproc)" '. + {cpuSerial: $sn, cpuCores: $cores}')
    elif [ "$(uname)" = "Darwin" ]; then
        info=$(echo "$info" | jq --arg cores "$(sysctl -n hw.ncpu)" '. + {cpuCores: $cores}')
    fi
    # Motherboard
    if [ "$(uname)" = "Linux" ]; then
        info=$(echo "$info" | jq --arg mb "$(cat /sys/class/dmi/id/board_serial 2>/dev/null)" \\
            --arg mf "$(cat /sys/class/dmi/id/board_vendor 2>/dev/null)" \\
            '. + {mbSerial: $mb, mbManufacturer: $mf}')
    fi
    # BIOS
    if [ "$(uname)" = "Linux" ]; then
        info=$(echo "$info" | jq --arg uuid "$(cat /sys/class/dmi/id/product_uuid 2>/dev/null)" \\
            --arg bv "$(cat /sys/class/dmi/id/bios_version 2>/dev/null)" \\
            '. + {biosUuid: $uuid, biosVersion: $bv}')
    fi
    # Disk
    if [ "$(uname)" = "Linux" ]; then
        info=$(echo "$info" | jq --arg ds "$(lsblk -o SERIAL -nd 2>/dev/null | head -1)" \\
            --arg dm "$(lsblk -o MODEL -nd 2>/dev/null | head -1)" \\
            '. + {diskSerial: $ds, diskModel: $dm}')
    fi
    # Network MACs
    local macs="[]"
    for iface in /sys/class/net/*; do
        local mac=$(cat "$iface/address" 2>/dev/null)
        if [ -n "$mac" ] && [ "$mac" != "00:00:00:00:00:00" ]; then
            macs=$(echo "$macs" | jq --arg m "$mac" '. + [$m]')
        fi
    done
    info=$(echo "$info" | jq --argjson macs "$macs" '. + {macAddresses: $macs}')
    # OS
    info=$(echo "$info" | jq --arg os "$(uname -s)" --arg ver "$(uname -r)" --arg host "$(hostname)" \\
        '. + {osName: $os, osVersion: $ver, hostname: $host}')
    echo "$info"
}

# ========== 使用示例 ==========
echo ">>> 采集硬件信息..."
HW=$(collect_hardware_info)
echo "硬件信息: $HW"

echo ">>> 激活卡密..."
ACTIVATE_RESULT=$(activate "YOUR_CARD_KEY" "player_123" "$HW")
echo "激活结果: $ACTIVATE_RESULT"

CODE=$(echo "$ACTIVATE_RESULT" | jq -r '.code')
if [ "$CODE" = "0" ]; then
    UID=$(echo "$ACTIVATE_RESULT" | jq -r '.data.userId')
    echo "激活成功! userId=$UID"

    # 心跳循环
    echo ">>> 开始心跳..."
    while true; do
        sleep 60
        HB=$(heartbeat "$UID" "$TOKEN")
        echo "心跳: $HB"
        TOKEN=$(echo "$HB" | jq -r '.data.heartbeatToken // empty')
    done
else
    echo "激活失败: $(echo "$ACTIVATE_RESULT" | jq -r '.message')"
fi
`;

    default:
      return '';
  }
}

export default function IntegrationPage() {
  const params = useParams();
  const id = params.id as string;
  const [program, setProgram] = useState<{ name: string; appKey: string; appSecret: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLang, setActiveLang] = useState<Lang>('Python');
  const [copied, setCopied] = useState(false);
  const [connStatus, setConnStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [connLatency, setConnLatency] = useState<number | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [scriptCode, setScriptCode] = useState('');
  const [scriptSaving, setScriptSaving] = useState(false);
  const [scriptEnabled, setScriptEnabled] = useState(false);
  const [scriptPreview, setScriptPreview] = useState('');
  const [scriptSize, setScriptSize] = useState(0);
  const [uiConfig, setUiConfig] = useState<any>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    programApi.getIntegration(id).then(res => {
      if (res.code === 0) {
        setProgram(res.data);
        setScriptEnabled(res.data.scriptEnabled || false);
        setScriptPreview(res.data.scriptPreview || '');
        setScriptSize(res.data.scriptSize || 0);
      } else {
        toast.error(res.message);
      }
    }).finally(() => setLoading(false));
    // 加载UI配置
    programApi.getUIConfig(id).then(res => {
      if (res.code === 0 && res.data) setUiConfig(res.data);
    }).catch(() => {});
  }, [id]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // 连通状态检测（轮询方式）
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      if (cancelled) return;
      setConnStatus('checking');
      const start = performance.now();
      try {
        const resp = await fetch(`${apiBase}/health`, { method: 'GET', cache: 'no-store' });
        const latency = Math.round(performance.now() - start);
        if (!cancelled) {
          if (resp.ok) {
            setConnStatus('connected');
            setConnLatency(latency);
            setConnError(null);
          } else {
            setConnStatus('disconnected');
            setConnError(`HTTP ${resp.status}`);
            setConnLatency(null);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setConnStatus('disconnected');
          setConnError(err.message || '网络错误');
          setConnLatency(null);
        }
      }
      if (!cancelled) {
        timer = setTimeout(check, 5000);
      }
    };

    check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [apiBase]);

  const code = program ? generateCode(activeLang, program.appKey, program.appSecret, apiBase + '/api') : '';

  const handleSaveScript = async () => {
    if (!scriptCode.trim()) { toast.error('请输入脚本代码'); return; }
    setScriptSaving(true);
    try {
      // 自动混淆后保存
      const obRes = await programApi.obfuscate(scriptCode);
      const finalCode = obRes.code === 0 ? obRes.data!.obfuscated : scriptCode;
      const res = await programApi.saveScript(id, finalCode);
      if (res.code === 0) {
        toast.success('脚本已自动混淆并保存');
        setScriptEnabled(true);
        setScriptSize(res.data?.scriptSize || finalCode.length);
        setScriptPreview(res.data?.scriptPreview || '');
      } else {
        toast.error(res.message);
      }
    } catch { toast.error('保存失败'); }
    finally { setScriptSaving(false); }
  };

  const handleObfuscateOnly = async () => {
    if (!scriptCode.trim()) { toast.error('请先输入脚本代码'); return; }
    setScriptSaving(true);
    try {
      const res = await programApi.obfuscate(scriptCode);
      if (res.code === 0) {
        setScriptCode(res.data!.obfuscated);
        toast.success(`已混淆 (${res.data!.originalSize.toLocaleString()} → ${res.data!.obfuscatedSize.toLocaleString()} 字符)`);
      } else {
        toast.error(res.message);
      }
    } catch { toast.error('混淆失败'); }
    finally { setScriptSaving(false); }
  };

  const handleReObfuscateSaved = async () => {
    if (!scriptEnabled) { toast.error('尚未保存脚本代码'); return; }
    setScriptSaving(true);
    try {
      const res = await programApi.reobfuscate(id);
      if (res.code === 0) {
        toast.success(res.message);
        setScriptSize(res.data!.scriptSize);
        setScriptPreview(res.data!.scriptPreview || '');
      } else {
        toast.error(res.message);
      }
    } catch { toast.error('重新混淆失败'); }
    finally { setScriptSaving(false); }
  };

  const handleDisableScript = async () => {
    try {
      const res = await programApi.disableScript(id);
      if (res.code === 0) {
        toast.success('脚本下发已禁用');
        setScriptEnabled(false);
      } else {
        toast.error(res.message);
      }
    } catch { toast.error('操作失败'); }
  };

  const handleDownloadClient = async () => {
    if (!program) return;
    const clientSrc = getClientScriptTemplate(program.appKey, program.appSecret, apiBase + '/api', uiConfig);
    const blob = new Blob([clientSrc], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cdk-client.user.js';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已下载客户端脚本 (${clientSrc.length.toLocaleString()} 字节)`);
  };

  const updateUIConfig = (key: string, value: string | number) => {
    setUiConfig((prev: any) => ({ ...(prev || {}), [key]: value }));
  };

  const handleSaveUIConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await programApi.updateUIConfig(id, uiConfig || {});
      if (res.code === 0) {
        toast.success('UI 配置已保存');
      } else {
        toast.error(res.message);
      }
    } catch { toast.error('保存失败'); }
    finally { setSavingConfig(false); }
  };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      toast.success('代码已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass px-8 py-4 text-sm text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass px-8 py-4 text-sm text-red-500">程序不存在或无权访问</div>
      </div>
    );
  }

  return (
    <div className="glass-enter">
      {/* Header */}
      <div className="mb-6">
        <h1 className="glass-title mb-2">{program.name} - 对接指南</h1>
        <p className="text-sm text-gray-500">
          选择语言查看完整的卡密验证集成代码示例，包含签名、硬件采集、激活、心跳和登出。
        </p>
      </div>

      {/* 连通状态检测 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">API 连通状态</span>
            <div className="flex items-center gap-2">
              {connStatus === 'checking' && (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500" />
                  </span>
                  <span className="text-xs text-yellow-600">检测中...</span>
                </>
              )}
              {connStatus === 'connected' && (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                  <span className="text-xs text-green-600 font-medium">已连接</span>
                </>
              )}
              {connStatus === 'disconnected' && (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="text-xs text-red-600 font-medium">未连接</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            {connLatency !== null && (
              <span>延迟 <span className="font-mono text-gray-600">{connLatency}ms</span></span>
            )}
            {connError && (
              <span className="text-red-400 max-w-[200px] truncate" title={connError}>{connError}</span>
            )}
            <span className="text-gray-300">每 5 秒刷新</span>
          </div>
        </div>
      </div>

      {/* Script Editor */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-800">远程脚本下发</h3>
            {scriptEnabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                已启用
              </span>
            )}
            {!scriptEnabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                未启用
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {scriptEnabled && (
              <>
                <button
                  onClick={handleReObfuscateSaved}
                  disabled={scriptSaving}
                  className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  重新混淆
                </button>
                <button
                  onClick={handleDisableScript}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  禁用下发
                </button>
              </>
            )}
            <button
              onClick={handleObfuscateOnly}
              disabled={scriptSaving || !scriptCode.trim()}
              className="px-4 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors disabled:opacity-50"
            >
              仅混淆
            </button>
            <button
              onClick={handleSaveScript}
              disabled={scriptSaving}
              className="px-4 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {scriptSaving ? '保存中...' : '混淆并保存'}
            </button>
          </div>
        </div>

        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <strong>安全机制：</strong>脚本在服务器 AES-256-GCM 加密存储 → 客户端激活后才能请求 → 传输层使用 challenge 派生密钥再次加密 → 客户端解密后执行。不验证卡密<strong>无法获取</strong>脚本内容。
        </div>

        <textarea
          className="w-full h-64 px-4 py-3 text-sm font-mono border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none resize-y bg-gray-50 text-gray-800 placeholder-gray-400"
          placeholder={`// 在此粘贴你的 JavaScript 功能代码
// 客户端激活卡密后会自动获取并执行此脚本
// 示例：
(function() {
  'use strict';
  console.log('功能代码已加载');
  // 你的业务逻辑...
})();`}
          value={scriptCode}
          onChange={e => setScriptCode(e.target.value)}
          spellCheck={false}
        />

        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>脚本将在客户端验证通过后自动下发并执行</span>
          <span>{scriptCode.length.toLocaleString()} 字符{scriptSize > 0 ? `｜上次保存 ${scriptSize.toLocaleString()} 字符` : ''}</span>
        </div>

        {scriptPreview && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="text-xs font-medium text-gray-500 mb-2">上次保存预览</div>
            <pre className="text-xs text-gray-600 max-h-24 overflow-hidden whitespace-pre-wrap font-mono">{scriptPreview}</pre>
          </div>
        )}
      </div>

      {/* UI 定制面板 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">界面定制</h3>
            <p className="text-xs text-gray-400 mt-0.5">自定义验证弹窗外观，修改后下载客户端即可生效</p>
          </div>
          <div className="flex items-center gap-2">
             <button
               onClick={handleSaveUIConfig}
               disabled={savingConfig}
               className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg shadow-sm transition-all disabled:opacity-50"
             >
               {savingConfig ? '保存中...' : '保存样式'}
             </button>
             <button
               onClick={handleDownloadClient}
               disabled={!program}
               className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
             >
               下载客户端
             </button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ===== 左：登录弹窗 ===== */}
          <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4">
            <h4 className="text-xs font-bold text-blue-700 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              登录弹窗
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-blue-800">标题文字</label>
                <input className="w-full mt-1 px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 text-gray-700 placeholder-gray-300" placeholder="卡密验证" value={uiConfig?.title || ''} onChange={e => updateUIConfig('title', e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-blue-800">副标题</label>
                <input className="w-full mt-1 px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 text-gray-700 placeholder-gray-300" placeholder="请输入卡密以激活" value={uiConfig?.subtitle || ''} onChange={e => updateUIConfig('subtitle', e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-blue-800">按钮文字</label>
                <input className="w-full mt-1 px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 text-gray-700 placeholder-gray-300" placeholder="验证并激活" value={uiConfig?.btnText || ''} onChange={e => updateUIConfig('btnText', e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-blue-800">头部渐变色</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer p-0 bg-transparent" value={uiConfig?.bg || '#3b82f6'} onChange={e => updateUIConfig('bg', e.target.value)} />
                  <span className="text-[11px] text-gray-400">→</span>
                  <input type="color" className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer p-0 bg-transparent" value={uiConfig?.bg2 || '#6366f1'} onChange={e => updateUIConfig('bg2', e.target.value)} />
                  <code className="ml-auto text-[11px] text-blue-600 bg-white/80 px-2 py-0.5 rounded border border-blue-100">{uiConfig?.bg || '#3b82f6'} → {uiConfig?.bg2 || '#6366f1'}</code>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-blue-800">弹窗圆角 <span className="font-mono text-blue-500">{uiConfig?.radius || 18}px</span></label>
                <input type="range" min="0" max="30" value={uiConfig?.radius || 18} onChange={e => updateUIConfig('radius', parseInt(e.target.value))} className="w-full mt-1 accent-blue-500 h-1.5" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-blue-800">输入框圆角 <span className="font-mono text-blue-500">{uiConfig?.inputRadius || 10}px</span></label>
                <input type="range" min="0" max="20" value={uiConfig?.inputRadius || 10} onChange={e => updateUIConfig('inputRadius', parseInt(e.target.value))} className="w-full mt-1 accent-blue-500 h-1.5" />
              </div>
            </div>
          </div>

          {/* ===== 中：成功弹窗 ===== */}
          <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4">
            <h4 className="text-xs font-bold text-emerald-700 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              成功弹窗
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-emerald-800">标题文字</label>
                <input className="w-full mt-1 px-3 py-2 text-sm border border-emerald-200 rounded-lg bg-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 text-gray-700 placeholder-gray-300" placeholder="验证成功" value={uiConfig?.okTitle || ''} onChange={e => updateUIConfig('okTitle', e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-emerald-800">副标题</label>
                <input className="w-full mt-1 px-3 py-2 text-sm border border-emerald-200 rounded-lg bg-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 text-gray-700 placeholder-gray-300" placeholder="功能已激活" value={uiConfig?.okSub || ''} onChange={e => updateUIConfig('okSub', e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-emerald-800">头部渐变色</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer p-0 bg-transparent" value={uiConfig?.okBg || '#10b981'} onChange={e => updateUIConfig('okBg', e.target.value)} />
                  <span className="text-[11px] text-gray-400">→</span>
                  <input type="color" className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer p-0 bg-transparent" value={uiConfig?.okBg2 || '#059669'} onChange={e => updateUIConfig('okBg2', e.target.value)} />
                  <code className="ml-auto text-[11px] text-emerald-600 bg-white/80 px-2 py-0.5 rounded border border-emerald-100">{uiConfig?.okBg || '#10b981'} → {uiConfig?.okBg2 || '#059669'}</code>
                </div>
              </div>
            </div>
          </div>

          {/* ===== 右：实时预览 ===== */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[11px] font-semibold text-gray-600">实时预览</span>
            </div>
            <div className="p-4 bg-gray-50">
              <div className="max-w-[260px] mx-auto rounded-xl overflow-hidden shadow-lg" style={{ borderRadius: `${uiConfig?.radius || 18}px` }}>
                {/* 登录头部 */}
                <div style={{ padding: '14px 12px', background: `linear-gradient(135deg, ${uiConfig?.bg || '#3b82f6'}, ${uiConfig?.bg2 || '#6366f1'})`, color: '#fff', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>{uiConfig?.title || '卡密验证'}</div>
                  <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px' }}>{uiConfig?.subtitle || '请输入卡密以激活'}</div>
                </div>
                {/* 登录表单 */}
                <div style={{ padding: '12px', background: '#fff' }}>
                  <div style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: `${uiConfig?.inputRadius || 10}px`, fontSize: '10px', textAlign: 'center', color: '#9ca3af', marginBottom: '8px' }}>
                    请输入卡密
                  </div>
                  <div style={{ padding: '6px 10px', borderRadius: `${uiConfig?.inputRadius || 10}px`, fontSize: '10px', fontWeight: 'bold', textAlign: 'center', color: '#fff', background: `linear-gradient(135deg, ${uiConfig?.btnH || '#3b82f6'}, ${uiConfig?.btnH2 || '#6366f1'})` }}>
                    {uiConfig?.btnText || '验证并激活'}
                  </div>
                </div>
                {/* 成功头部 */}
                <div style={{ padding: '10px 12px', background: `linear-gradient(135deg, ${uiConfig?.okBg || '#10b981'}, ${uiConfig?.okBg2 || '#059669'})`, color: '#fff', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700 }}>{uiConfig?.okTitle || '验证成功'}</div>
                  <div style={{ fontSize: '9px', opacity: 0.85, marginTop: '1px' }}>{uiConfig?.okSub || '功能已激活'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Language Tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {LANGUAGES.map(lang => (
          <button
            key={lang}
            onClick={() => setActiveLang(lang)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
              activeLang === lang
                ? 'bg-blue-600 text-white shadow-md'
                : 'glass-btn text-gray-600 hover:text-gray-800'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Code Block */}
      <div className="glass-code relative">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
          <span className="text-xs text-gray-400">{activeLang} 完整示例</span>
          <button
            onClick={handleCopy}
            className="glass-btn text-xs py-1 px-3 text-gray-300 hover:text-white"
          >
            {copied ? '已复制' : '复制代码'}
          </button>
        </div>
        <pre className="overflow-auto max-h-[70vh] text-xs leading-relaxed">{code}</pre>
      </div>
    </div>
  );
}