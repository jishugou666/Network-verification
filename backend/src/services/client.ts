import { prisma } from '../utils/prisma';
import { aesDecrypt } from '../utils/crypto';
import { obfuscateConfig, decryptionSnippets, ObfuscatedConfig } from '../utils/obfuscate';

// 支持的客户端语言
export const CLIENT_LANGUAGES = [
  'python',
  'csharp',
  'java',
  'go',
  'nodejs',
  'rust',
  'cpp',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'dart',
  'lua',
  'shell',
] as const;

export type ClientLang = (typeof CLIENT_LANGUAGES)[number];

export interface ClientGenOptions {
  appName?: string;
  appVersion?: string;
  appDescription?: string;
  lang: ClientLang;
}

// 生成 Python 客户端
function genPython(cfg: ObfuscatedConfig, opts: ClientGenOptions): string {
  const name = opts.appName || 'MyApp';
  const snip = decryptionSnippets(cfg.appKey);
  return `"""
${name} - CDK 卡密验证客户端
${opts.appDescription || '自动生成的验证客户端'}
版本: ${opts.appVersion || '1.0.0'}

打包为 EXE:
  pip install pyinstaller pycryptodome requests
  pyinstaller --onefile --windowed --name "${name}" client.py
"""

import hashlib
import hmac
import json
import os
import platform
import subprocess
import sys
import time
import uuid
from base64 import b64decode, b64encode

import requests
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

# ===== 加密常量（运行时解密） =====
${snip.python}

_APP_KEY_ENC = "${cfg.appKeyEnc}"
_APP_SECRET_ENC = "${cfg.appSecretEnc}"
_API_BASE_ENC = "${cfg.apiBaseEnc}"

APP_KEY = _d(_APP_KEY_ENC)
APP_SECRET = _d(_APP_SECRET_ENC)
API_BASE = _d(_API_BASE_ENC)
HEARTBEAT_INTERVAL = 60  # 心跳间隔（秒）

# ===== 硬件指纹 =====
def get_hardware_info():
    """采集硬件信息生成设备指纹"""
    info = []
    try:
        info.append(platform.node())  # 主机名
        info.append(platform.processor())
        info.append(platform.machine())
        if sys.platform == 'win32':
            r = subprocess.run(['wmic','cpu','get','ProcessorId'], capture_output=True, text=True)
            info.append(r.stdout.strip())
            r = subprocess.run(['wmic','diskdrive','get','SerialNumber'], capture_output=True, text=True)
            info.append(r.stdout.strip())
            r = subprocess.run(['wmic','baseboard','get','SerialNumber'], capture_output=True, text=True)
            info.append(r.stdout.strip())
        elif sys.platform == 'darwin':
            r = subprocess.run(['system_profiler','SPHardwareDataType'], capture_output=True, text=True)
            info.append(r.stdout)
        else:
            info.append(open('/etc/machine-id').read().strip())
            info.append(open('/proc/cpuinfo').read())
    except:
        pass
    return '|'.join(info)

# ===== 加密工具 =====
def sha256(data: str) -> bytes:
    return hashlib.sha256(data.encode()).digest()

def hmac_sha256(key: bytes, data: str) -> str:
    return hmac.new(key, data.encode(), hashlib.sha256).hexdigest()

def aes_cbc_decrypt(encrypted_b64: str, iv_b64: str, key: bytes) -> str:
    ct = b64decode(encrypted_b64)
    iv = b64decode(iv_b64)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(ct), AES.block_size).decode()

def aes_gcm_decrypt(blob_b64: str, hw: str) -> dict:
    key = sha256(hw)
    raw = b64decode(blob_b64)
    iv, ct = raw[:12], raw[12:]
    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
    plain = cipher.decrypt_and_verify(ct[:-16], ct[-16:])
    return json.loads(plain.decode())

def aes_gcm_encrypt(data: dict, hw: str) -> str:
    key = sha256(hw)
    iv = os.urandom(12)
    plain = json.dumps(data).encode()
    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
    ct, tag = cipher.encrypt_and_digest(plain)
    return b64encode(iv + ct + tag).decode()

# ===== API 请求 =====
def api_post(path: str, body: dict) -> dict:
    ts = str(int(time.time() * 1000))
    nonce = str(uuid.uuid4())[:8]
    sign = hmac_sha256(sha256(APP_SECRET), ts + '|' + nonce + '|' + path)
    resp = requests.post(
        f"{API_BASE}{path}",
        json=body,
        headers={
            'Content-Type': 'application/json',
            'X-App-Key': APP_KEY,
            'X-Timestamp': ts,
            'X-Nonce': nonce,
            'X-Signature': sign,
        },
        timeout=10
    )
    return resp.json()

# ===== 验证流程 =====
def verify_card(card_key: str) -> bool:
    hw = sha256(get_hardware_info()).hex()
    
    # 1. 获取挑战
    challenge = api_post('/verify/challenge', {})['data']['challenge']
    
    # 2. 激活卡密
    hw_info = get_hardware_info()
    resp = api_post('/verify/activate', {
        'cardKey': card_key,
        'username': hw,
        'hardwareInfo': hw_info,
        'challengeResponse': hmac_sha256(sha256(challenge), hw_info),
    })
    
    if resp['code'] != 0:
        print(f"激活失败: {resp['message']}")
        return False
    
    # 3. 解密响应
    enc = resp['data']
    secret_key = sha256(challenge)
    decrypted = aes_cbc_decrypt(enc['encrypted'], enc['iv'], secret_key)
    result = json.loads(decrypted)
    
    hb_token = result['heartbeatToken']
    uid = result['userId']
    
    print(f"激活成功! 用户ID: {uid}")
    
    # 4. 保存状态
    state = aes_gcm_encrypt({
        'uid': uid,
        'hw': hw,
        'tk': hb_token,
        'exp': result.get('expiresAt'),
    }, hw)
    
    with open('cdk_state.dat', 'w') as f:
        f.write(state)
    
    return True

# ===== 心跳 =====
def heartbeat():
    try:
        with open('cdk_state.dat', 'r') as f:
            state_blob = f.read()
    except:
        return False
    
    hw = sha256(get_hardware_info()).hex()
    state = aes_gcm_decrypt(state_blob, hw)
    
    ts = str(int(time.time() * 1000))
    nonce = str(uuid.uuid4())[:8]
    sign = hmac_sha256(sha256(APP_SECRET), ts + '|' + nonce + '|/verify/heartbeat')
    
    resp = requests.post(
        f"{API_BASE}/verify/heartbeat",
        json={'userId': state['uid'], 'heartbeatToken': state['tk']},
        headers={
            'Content-Type': 'application/json',
            'X-App-Key': APP_KEY,
            'X-Timestamp': ts,
            'X-Nonce': nonce,
            'X-Signature': sign,
        },
        timeout=10
    ).json()
    
    if resp['code'] != 0:
        return False
    
    enc = resp['data']
    challenge = resp['data'].get('_challenge', '')
    if challenge:
        secret_key = sha256(challenge)
        decrypted = aes_cbc_decrypt(enc['encrypted'], enc['iv'], secret_key)
        result = json.loads(decrypted)
        state['tk'] = result['heartbeatToken']
        state['exp'] = result.get('expiresAt')
        with open('cdk_state.dat', 'w') as f:
            f.write(aes_gcm_encrypt(state, hw))
    
    return True

# ===== 主程序 =====
if __name__ == '__main__':
    card = input('请输入卡密: ').strip()
    if not card:
        print('卡密不能为空')
        sys.exit(1)
    
    if verify_card(card):
        print('验证成功，开始心跳...')
        import threading
        def hb_loop():
            while True:
                time.sleep(HEARTBEAT_INTERVAL)
                if not heartbeat():
                    print('心跳失败，请重新验证')
                    os._exit(1)
        threading.Thread(target=hb_loop, daemon=True).start()
        input('按 Enter 退出...')
    else:
        print('验证失败')
        sys.exit(1)
`;
}

// 生成 C# 客户端
function genCSharp(cfg: ObfuscatedConfig, opts: ClientGenOptions): string {
  const name = opts.appName || 'MyApp';
  const snip = decryptionSnippets(cfg.appKey);
  return `// ${name} - CDK 卡密验证客户端
// ${opts.appDescription || '自动生成的验证客户端'}
// 版本: ${opts.appVersion || '1.0.0'}
//
// 编译: dotnet build -c Release
// 需要 NuGet: BouncyCastle.Cryptography

using System;
using System.Collections.Generic;
using System.IO;
using System.Management;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Org.BouncyCastle.Crypto.Engines;
using Org.BouncyCastle.Crypto.Modes;
using Org.BouncyCastle.Crypto.Parameters;

namespace ${name.replace(/ /g, '')}
{
    class Program
    {
        // ===== 加密常量（运行时解密） =====
        ${snip.csharp}

        static readonly string _APP_KEY_ENC = "${cfg.appKeyEnc}";
        static readonly string _APP_SECRET_ENC = "${cfg.appSecretEnc}";
        static readonly string _API_BASE_ENC = "${cfg.apiBaseEnc}";

        static readonly string APP_KEY = _d(_APP_KEY_ENC);
        static readonly string APP_SECRET = _d(_APP_SECRET_ENC);
        static readonly string API_BASE = _d(_API_BASE_ENC);
        static readonly int HEARTBEAT_INTERVAL = 60;
        static readonly HttpClient http = new HttpClient();
        static string stateFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "cdk_state.dat");

        static string GetHardwareInfo()
        {
            var parts = new List<string>();
            parts.Add(Environment.MachineName);
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Processor");
                foreach (var obj in searcher.Get()) parts.Add(obj["ProcessorId"]?.ToString() ?? "");
            }
            catch { }
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_DiskDrive");
                foreach (var obj in searcher.Get()) parts.Add(obj["SerialNumber"]?.ToString() ?? "");
            }
            catch { }
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_BaseBoard");
                foreach (var obj in searcher.Get()) parts.Add(obj["SerialNumber"]?.ToString() ?? "");
            }
            catch { }
            return string.Join("|", parts);
        }

        static byte[] SHA256Hash(string data) => SHA256.HashData(Encoding.UTF8.GetBytes(data));
        static byte[] SHA256Hash(byte[] data) => SHA256.HashData(data);

        static string HMACSHA256Hex(byte[] key, string data)
        {
            using var hmac = new HMACSHA256(key);
            return BitConverter.ToString(hmac.ComputeHash(Encoding.UTF8.GetBytes(data))).Replace("-", "").ToLower();
        }

        static string AesCbcDecrypt(string encryptedB64, string ivB64, byte[] key)
        {
            var ct = Convert.FromBase64String(encryptedB64);
            var iv = Convert.FromBase64String(ivB64);
            using var aes = Aes.Create();
            aes.Key = key;
            aes.IV = iv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;
            using var decryptor = aes.CreateDecryptor();
            return Encoding.UTF8.GetString(decryptor.TransformFinalBlock(ct, 0, ct.Length));
        }

        static string AesGcmEncrypt(string plainJson, string hw)
        {
            var key = SHA256Hash(hw);
            var iv = new byte[12];
            RandomNumberGenerator.Fill(iv);
            var plain = Encoding.UTF8.GetBytes(plainJson);
            var tag = new byte[16];
            var ct = new byte[plain.Length];
            using var aes = new AesGcm(key, 16);
            aes.Encrypt(iv, plain, ct, tag);
            var result = new byte[12 + ct.Length + 16];
            Buffer.BlockCopy(iv, 0, result, 0, 12);
            Buffer.BlockCopy(ct, 0, result, 12, ct.Length);
            Buffer.BlockCopy(tag, 0, result, 12 + ct.Length, 16);
            return Convert.ToBase64String(result);
        }

        static string AesGcmDecrypt(string blobB64, string hw)
        {
            var key = SHA256Hash(hw);
            var raw = Convert.FromBase64String(blobB64);
            var iv = raw[..12];
            var ct = raw[12..^16];
            var tag = raw[^16..];
            var plain = new byte[ct.Length];
            using var aes = new AesGcm(key, 16);
            aes.Decrypt(iv, ct, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }

        static async Task<JsonElement> ApiPost(string path, object body)
        {
            var ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
            var nonce = Guid.NewGuid().ToString()[..8];
            var sign = HMACSHA256Hex(SHA256Hash(APP_SECRET), ts + "|" + nonce + "|" + path);
            var json = JsonSerializer.Serialize(body);
            var req = new HttpRequestMessage(HttpMethod.Post, API_BASE + path)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            req.Headers.Add("X-App-Key", APP_KEY);
            req.Headers.Add("X-Timestamp", ts);
            req.Headers.Add("X-Nonce", nonce);
            req.Headers.Add("X-Signature", sign);
            var resp = await http.SendAsync(req);
            var text = await resp.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<JsonElement>(text);
        }

        static async Task<bool> VerifyCard(string cardKey)
        {
            var hw = BitConverter.ToString(SHA256Hash(GetHardwareInfo())).Replace("-", "").ToLower();

            // 获取挑战
            var chResp = await ApiPost("/verify/challenge", new { });
            var challenge = chResp.GetProperty("data").GetProperty("challenge").GetString();

            // 激活
            var hwInfo = GetHardwareInfo();
            var resp = await ApiPost("/verify/activate", new
            {
                cardKey,
                username = hw,
                hardwareInfo = hwInfo,
                challengeResponse = HMACSHA256Hex(SHA256Hash(challenge!), hwInfo),
            });

            if (resp.GetProperty("code").GetInt32() != 0)
            {
                Console.WriteLine($"激活失败: {resp.GetProperty("message").GetString()}");
                return false;
            }

            var enc = resp.GetProperty("data");
            var secretKey = SHA256Hash(challenge!);
            var decrypted = AesCbcDecrypt(enc.GetProperty("encrypted").GetString()!, enc.GetProperty("iv").GetString()!, secretKey);
            var result = JsonSerializer.Deserialize<JsonElement>(decrypted);

            var state = AesGcmEncrypt(JsonSerializer.Serialize(new
            {
                uid = result.GetProperty("userId").GetString(),
                hw,
                tk = result.GetProperty("heartbeatToken").GetString(),
                exp = result.TryGetProperty("expiresAt", out var e) ? e.GetString() : null,
            }), hw);

            File.WriteAllText(stateFile, state);
            Console.WriteLine($"激活成功! 用户ID: {result.GetProperty("userId")}");
            return true;
        }

        static async Task<bool> Heartbeat()
        {
            if (!File.Exists(stateFile)) return false;
            var hw = BitConverter.ToString(SHA256Hash(GetHardwareInfo())).Replace("-", "").ToLower();
            var state = JsonSerializer.Deserialize<JsonElement>(AesGcmDecrypt(File.ReadAllText(stateFile), hw));

            var resp = await ApiPost("/verify/heartbeat", new
            {
                userId = state.GetProperty("uid").GetString(),
                heartbeatToken = state.GetProperty("tk").GetString(),
            });

            if (resp.GetProperty("code").GetInt32() != 0) return false;

            return true;
        }

        static async Task Main(string[] args)
        {
            Console.Write("请输入卡密: ");
            var card = Console.ReadLine()?.Trim();
            if (string.IsNullOrEmpty(card)) { Console.WriteLine("卡密不能为空"); return; }

            if (await VerifyCard(card))
            {
                Console.WriteLine("验证成功，开始心跳...");
                var cts = new CancellationTokenSource();
                _ = Task.Run(async () =>
                {
                    while (!cts.IsCancellationRequested)
                    {
                        await Task.Delay(HEARTBEAT_INTERVAL * 1000);
                        if (!await Heartbeat()) { Console.WriteLine("心跳失败"); Environment.Exit(1); }
                    }
                });
                Console.WriteLine("按 Enter 退出...");
                Console.ReadLine();
                cts.Cancel();
            }
            else Console.WriteLine("验证失败");
        }
    }
}
`;
}

// 生成 Java 客户端
function genJava(cfg: ObfuscatedConfig, opts: ClientGenOptions): string {
  const name = (opts.appName || 'MyApp').replace(/\s/g, '');
  const snip = decryptionSnippets(cfg.appKey);
  return `// ${name}.java - CDK 卡密验证客户端
// ${opts.appDescription || '自动生成的验证客户端'}
// 版本: ${opts.appVersion || '1.0.0'}
//
// 编译: javac -cp ".:gson-2.10.1.jar:bcprov-jdk18on-1.78.jar" ${name}.java
// 运行: java -cp ".:gson-2.10.1.jar:bcprov-jdk18on-1.78.jar" ${name}
//
// 依赖: Gson, BouncyCastle

import com.google.gson.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.*;
import java.security.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;

public class ${name} {
    // ===== 加密常量（运行时解密） =====
    ${snip.java}

    private static final String _APP_KEY_ENC = "${cfg.appKeyEnc}";
    private static final String _APP_SECRET_ENC = "${cfg.appSecretEnc}";
    private static final String _API_BASE_ENC = "${cfg.apiBaseEnc}";

    private static final String APP_KEY = _d(_APP_KEY_ENC);
    private static final String APP_SECRET = _d(_APP_SECRET_ENC);
    private static final String API_BASE = _d(_API_BASE_ENC);
    private static final int HEARTBEAT_INTERVAL = 60;
    private static final HttpClient http = HttpClient.newHttpClient();
    private static final Gson gson = new Gson();
    private static final String STATE_FILE = "cdk_state.dat";

    private static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                                 + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
    }

    private static String getHardwareInfo() throws Exception {
        StringBuilder sb = new StringBuilder();
        sb.append(InetAddress.getLocalHost().getHostName());
        sb.append("|").append(System.getProperty("os.arch"));
        sb.append("|").append(Runtime.getRuntime().availableProcessors());
        try {
            Process p = Runtime.getRuntime().exec(new String[]{"wmic","cpu","get","ProcessorId"});
            sb.append("|").append(new String(p.getInputStream().readAllBytes()));
        } catch (Exception e) {}
        return sb.toString();
    }

    private static byte[] sha256(String data) throws Exception {
        return MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8));
    }

    private static String hmacSha256Hex(byte[] key, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        byte[] hmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : hmac) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private static String aesCbcDecrypt(String encryptedB64, String ivB64, byte[] key) throws Exception {
        byte[] ct = Base64.getDecoder().decode(encryptedB64);
        byte[] iv = Base64.getDecoder().decode(ivB64);
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(iv));
        return new String(cipher.doFinal(ct), StandardCharsets.UTF_8);
    }

    private static String aesGcmEncrypt(String plainJson, String hw) throws Exception {
        byte[] key = sha256(hw);
        byte[] iv = new byte[12];
        SecureRandom.getInstanceStrong().nextBytes(iv);
        byte[] plain = plainJson.getBytes(StandardCharsets.UTF_8);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        byte[] ct = cipher.doFinal(plain);
        byte[] result = new byte[12 + ct.length];
        System.arraycopy(iv, 0, result, 0, 12);
        System.arraycopy(ct, 0, result, 12, ct.length);
        return Base64.getEncoder().encodeToString(result);
    }

    private static String aesGcmDecrypt(String blobB64, String hw) throws Exception {
        byte[] key = sha256(hw);
        byte[] raw = Base64.getDecoder().decode(blobB64);
        byte[] iv = Arrays.copyOfRange(raw, 0, 12);
        byte[] ct = Arrays.copyOfRange(raw, 12, raw.length);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        return new String(cipher.doFinal(ct), StandardCharsets.UTF_8);
    }

    private static JsonObject apiPost(String path, JsonObject body) throws Exception {
        String ts = String.valueOf(System.currentTimeMillis());
        String nonce = UUID.randomUUID().toString().substring(0, 8);
        String sign = hmacSha256Hex(sha256(APP_SECRET), ts + "|" + nonce + "|" + path);
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(API_BASE + path))
            .header("Content-Type", "application/json")
            .header("X-App-Key", APP_KEY)
            .header("X-Timestamp", ts)
            .header("X-Nonce", nonce)
            .header("X-Signature", sign)
            .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(body)))
            .build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        return gson.fromJson(resp.body(), JsonObject.class);
    }

    private static boolean verifyCard(String cardKey) throws Exception {
        String hw = bytesToHex(sha256(getHardwareInfo()));

        JsonObject chResp = apiPost("/verify/challenge", new JsonObject());
        String challenge = chResp.getAsJsonObject("data").get("challenge").getAsString();

        String hwInfo = getHardwareInfo();
        JsonObject body = new JsonObject();
        body.addProperty("cardKey", cardKey);
        body.addProperty("username", hw);
        body.addProperty("hardwareInfo", hwInfo);
        body.addProperty("challengeResponse", hmacSha256Hex(sha256(challenge), hwInfo));
        JsonObject resp = apiPost("/verify/activate", body);

        if (resp.get("code").getAsInt() != 0) {
            System.out.println("激活失败: " + resp.get("message").getAsString());
            return false;
        }

        JsonObject enc = resp.getAsJsonObject("data");
        byte[] secretKey = sha256(challenge);
        String decrypted = aesCbcDecrypt(enc.get("encrypted").getAsString(), enc.get("iv").getAsString(), secretKey);
        JsonObject result = gson.fromJson(decrypted, JsonObject.class);

        JsonObject state = new JsonObject();
        state.addProperty("uid", result.get("userId").getAsString());
        state.addProperty("hw", hw);
        state.addProperty("tk", result.get("heartbeatToken").getAsString());
        if (result.has("expiresAt")) state.addProperty("exp", result.get("expiresAt").getAsString());
        Files.writeString(Path.of(STATE_FILE), aesGcmEncrypt(gson.toJson(state), hw));
        System.out.println("激活成功! 用户ID: " + result.get("userId").getAsString());
        return true;
    }

    private static boolean heartbeat() throws Exception {
        if (!Files.exists(Path.of(STATE_FILE))) return false;
        String hw = bytesToHex(sha256(getHardwareInfo()));
        JsonObject state = gson.fromJson(aesGcmDecrypt(Files.readString(Path.of(STATE_FILE)), hw), JsonObject.class);

        JsonObject body = new JsonObject();
        body.addProperty("userId", state.get("uid").getAsString());
        body.addProperty("heartbeatToken", state.get("tk").getAsString());
        JsonObject resp = apiPost("/verify/heartbeat", body);
        return resp.get("code").getAsInt() == 0;
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    public static void main(String[] args) throws Exception {
        System.out.print("请输入卡密: ");
        String card = new Scanner(System.in).nextLine().trim();
        if (card.isEmpty()) { System.out.println("卡密不能为空"); return; }

        if (verifyCard(card)) {
            System.out.println("验证成功，开始心跳...");
            ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
            scheduler.scheduleAtFixedRate(() -> {
                try { if (!heartbeat()) { System.out.println("心跳失败"); System.exit(1); } }
                catch (Exception e) { e.printStackTrace(); }
            }, HEARTBEAT_INTERVAL, HEARTBEAT_INTERVAL, TimeUnit.SECONDS);
            System.out.println("按 Enter 退出...");
            System.in.read();
            scheduler.shutdown();
        } else System.out.println("验证失败");
    }
}
`;
}

// 生成 Go 客户端
function genGo(cfg: ObfuscatedConfig, opts: ClientGenOptions): string {
  const name = opts.appName || 'myapp';
  const snip = decryptionSnippets(cfg.appKey);
  return `// ${name} - CDK 卡密验证客户端
// ${opts.appDescription || '自动生成的验证客户端'}
// 版本: ${opts.appVersion || '1.0.0'}
//
// 编译: go build -o ${name} client.go
// 交叉编译 Windows: GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o ${name}.exe client.go

package main

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
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

// ===== 加密常量（运行时解密） =====
${snip.go}

const (
	appKeyEnc    = "${cfg.appKeyEnc}"
	appSecretEnc = "${cfg.appSecretEnc}"
	apiBaseEnc   = "${cfg.apiBaseEnc}"
)

var (
	appKey    = _d(appKeyEnc)
	appSecret = _d(appSecretEnc)
	apiBase   = _d(apiBaseEnc)
)

const (
	heartbeatInterval = 60
	stateFile         = "cdk_state.dat"
)

func getHardwareInfo() string {
	var parts []string
	hostname, _ := os.Hostname()
	parts = append(parts, hostname, runtime.GOARCH, runtime.GOOS)
	if runtime.GOOS == "windows" {
		out, _ := exec.Command("wmic", "cpu", "get", "ProcessorId").Output()
		parts = append(parts, string(out))
	} else {
		data, _ := os.ReadFile("/etc/machine-id")
		parts = append(parts, string(data))
	}
	return strings.Join(parts, "|")
}

func sha256Hash(data string) []byte {
	h := sha256.Sum256([]byte(data))
	return h[:]
}

func hmacSha256Hex(key []byte, data string) string {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(data))
	return hex.EncodeToString(mac.Sum(nil))
}

func aesCbcDecrypt(encryptedB64, ivB64 string, key []byte) (string, error) {
	ct, _ := base64.StdEncoding.DecodeString(encryptedB64)
	iv, _ := base64.StdEncoding.DecodeString(ivB64)
	block, _ := aes.NewCipher(key)
	mode := cipher.NewCBCDecrypter(block, iv)
	mode.CryptBlocks(ct, ct)
	// PKCS7 unpad
	padLen := int(ct[len(ct)-1])
	return string(ct[:len(ct)-padLen]), nil
}

func aesGcmEncrypt(data map[string]interface{}, hw string) (string, error) {
	key := sha256Hash(hw)
	iv := make([]byte, 12)
	rand.Read(iv)
	plain, _ := json.Marshal(data)
	block, _ := aes.NewCipher(key)
	aesGcm, _ := cipher.NewGCM(block)
	ct := aesGcm.Seal(nil, iv, plain, nil)
	result := append(iv, ct...)
	return base64.StdEncoding.EncodeToString(result), nil
}

func aesGcmDecrypt(blobB64, hw string) (map[string]interface{}, error) {
	key := sha256Hash(hw)
	raw, _ := base64.StdEncoding.DecodeString(blobB64)
	iv, ct := raw[:12], raw[12:]
	block, _ := aes.NewCipher(key)
	aesGcm, _ := cipher.NewGCM(block)
	plain, _ := aesGcm.Open(nil, iv, ct, nil)
	var result map[string]interface{}
	json.Unmarshal(plain, &result)
	return result, nil
}

func apiPost(path string, body map[string]interface{}) (map[string]interface{}, error) {
	ts := fmt.Sprintf("%d", time.Now().UnixMilli())
	nonce := uuid4()[:8]
	sign := hmacSha256Hex(sha256Hash(appSecret), ts+"|"+nonce+"|"+path)
	jsonBody, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", apiBase+path, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-App-Key", appKey)
	req.Header.Set("X-Timestamp", ts)
	req.Header.Set("X-Nonce", nonce)
	req.Header.Set("X-Signature", sign)
	resp, _ := http.DefaultClient.Do(req)
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(respBody, &result)
	return result, nil
}

func uuid4() string {
	b := make([]byte, 16)
	rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func verifyCard(cardKey string) bool {
	hw := hex.EncodeToString(sha256Hash(getHardwareInfo()))

	chResp, _ := apiPost("/verify/challenge", map[string]interface{}{})
	challenge := chResp["data"].(map[string]interface{})["challenge"].(string)

	hwInfo := getHardwareInfo()
	resp, _ := apiPost("/verify/activate", map[string]interface{}{
		"cardKey":           cardKey,
		"username":          hw,
		"hardwareInfo":      hwInfo,
		"challengeResponse": hmacSha256Hex(sha256Hash(challenge), hwInfo),
	})

	if int(resp["code"].(float64)) != 0 {
		fmt.Printf("激活失败: %s\\n", resp["message"])
		return false
	}

	enc := resp["data"].(map[string]interface{})
	secretKey := sha256Hash(challenge)
	decrypted, _ := aesCbcDecrypt(enc["encrypted"].(string), enc["iv"].(string), secretKey)
	var result map[string]interface{}
	json.Unmarshal([]byte(decrypted), &result)

	state := map[string]interface{}{
		"uid": result["userId"],
		"hw":  hw,
		"tk":  result["heartbeatToken"],
	}
	if exp, ok := result["expiresAt"]; ok {
		state["exp"] = exp
	}
	stateStr, _ := aesGcmEncrypt(state, hw)
	os.WriteFile(stateFile, []byte(stateStr), 0600)
	fmt.Printf("激活成功! 用户ID: %v\\n", result["userId"])
	return true
}

func heartbeat() bool {
	if _, err := os.Stat(stateFile); os.IsNotExist(err) {
		return false
	}
	hw := hex.EncodeToString(sha256Hash(getHardwareInfo()))
	stateBlob, _ := os.ReadFile(stateFile)
	state, _ := aesGcmDecrypt(string(stateBlob), hw)

	resp, _ := apiPost("/verify/heartbeat", map[string]interface{}{
		"userId":         state["uid"],
		"heartbeatToken": state["tk"],
	})
	return int(resp["code"].(float64)) == 0
}

func main() {
	fmt.Print("请输入卡密: ")
	var card string
	fmt.Scanln(&card)
	card = strings.TrimSpace(card)
	if card == "" {
		fmt.Println("卡密不能为空")
		return
	}

	if verifyCard(card) {
		fmt.Println("验证成功，开始心跳...")
		go func() {
			for {
				time.Sleep(time.Duration(heartbeatInterval) * time.Second)
				if !heartbeat() {
					fmt.Println("心跳失败")
					os.Exit(1)
				}
			}
		}()
		fmt.Println("按 Enter 退出...")
		fmt.Scanln()
	} else {
		fmt.Println("验证失败")
	}
}
`;
}

// 生成 Node.js 客户端
function genNodeJS(cfg: ObfuscatedConfig, opts: ClientGenOptions): string {
  const name = opts.appName || 'myapp';
  const snip = decryptionSnippets(cfg.appKey);
  return `// ${name} - CDK 卡密验证客户端
// ${opts.appDescription || '自动生成的验证客户端'}
// 版本: ${opts.appVersion || '1.0.0'}
//
// 安装依赖: npm install node-fetch
// 运行: node client.js

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const readline = require('readline');

// ===== 加密常量（运行时解密） =====
${snip.nodejs}

const _APP_KEY_ENC = '${cfg.appKeyEnc}';
const _APP_SECRET_ENC = '${cfg.appSecretEnc}';
const _API_BASE_ENC = '${cfg.apiBaseEnc}';

const APP_KEY = _d(_APP_KEY_ENC);
const APP_SECRET = _d(_APP_SECRET_ENC);
const API_BASE = _d(_API_BASE_ENC);
const HEARTBEAT_INTERVAL = 60;
const STATE_FILE = 'cdk_state.dat';

function getHardwareInfo() {
  const parts = [os.hostname(), os.arch(), os.platform(), os.cpus().length.toString()];
  try {
    if (process.platform === 'win32') {
      parts.push(execSync('wmic cpu get ProcessorId').toString());
      parts.push(execSync('wmic diskdrive get SerialNumber').toString());
    } else if (process.platform === 'darwin') {
      parts.push(execSync('system_profiler SPHardwareDataType').toString());
    } else {
      parts.push(fs.readFileSync('/etc/machine-id', 'utf8'));
    }
  } catch (e) {}
  return parts.join('|');
}

function sha256(data) { return crypto.createHash('sha256').update(data).digest(); }
function sha256Hex(data) { return crypto.createHash('sha256').update(data).digest('hex'); }
function hmacSha256Hex(key, data) { return crypto.createHmac('sha256', key).update(data).digest('hex'); }

function aesCbcDecrypt(encryptedB64, ivB64, key) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivB64, 'base64'));
  return decipher.update(encryptedB64, 'base64', 'utf8') + decipher.final('utf8');
}

function aesGcmEncrypt(data, hw) {
  const key = sha256(hw);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString('base64');
}

function aesGcmDecrypt(blobB64, hw) {
  const key = sha256(hw);
  const raw = Buffer.from(blobB64, 'base64');
  const iv = raw.slice(0, 12);
  const tag = raw.slice(-16);
  const ct = raw.slice(12, -16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return JSON.parse(decipher.update(ct, undefined, 'utf8') + decipher.final('utf8'));
}

// 使用 fetch（Node 18+ 内置）
async function apiPost(path, body) {
  const ts = Date.now().toString();
  const nonce = crypto.randomUUID().slice(0, 8);
  const sign = hmacSha256Hex(sha256(APP_SECRET), ts + '|' + nonce + '|' + path);
  const resp = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': APP_KEY,
      'X-Timestamp': ts,
      'X-Nonce': nonce,
      'X-Signature': sign,
    },
    body: JSON.stringify(body),
  });
  return resp.json();
}

async function verifyCard(cardKey) {
  const hw = sha256Hex(getHardwareInfo());

  const chResp = await apiPost('/verify/challenge', {});
  const challenge = chResp.data.challenge;

  const hwInfo = getHardwareInfo();
  const resp = await apiPost('/verify/activate', {
    cardKey,
    username: hw,
    hardwareInfo: hwInfo,
    challengeResponse: hmacSha256Hex(sha256(challenge), hwInfo),
  });

  if (resp.code !== 0) {
    console.log('激活失败:', resp.message);
    return false;
  }

  const enc = resp.data;
  const secretKey = sha256(challenge);
  const decrypted = aesCbcDecrypt(enc.encrypted, enc.iv, secretKey);
  const result = JSON.parse(decrypted);

  const state = aesGcmEncrypt({
    uid: result.userId,
    hw,
    tk: result.heartbeatToken,
    exp: result.expiresAt || null,
  }, hw);

  fs.writeFileSync(STATE_FILE, state);
  console.log('激活成功! 用户ID:', result.userId);
  return true;
}

async function heartbeat() {
  if (!fs.existsSync(STATE_FILE)) return false;
  const hw = sha256Hex(getHardwareInfo());
  const state = aesGcmDecrypt(fs.readFileSync(STATE_FILE, 'utf8'), hw);

  const resp = await apiPost('/verify/heartbeat', {
    userId: state.uid,
    heartbeatToken: state.tk,
  });
  return resp.code === 0;
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('请输入卡密: ', async (card) => {
    rl.close();
    card = card.trim();
    if (!card) { console.log('卡密不能为空'); return; }

    if (await verifyCard(card)) {
      console.log('验证成功，开始心跳...');
      setInterval(async () => {
        if (!await heartbeat()) { console.log('心跳失败'); process.exit(1); }
      }, HEARTBEAT_INTERVAL * 1000);
      console.log('按 Ctrl+C 退出...');
    } else {
      console.log('验证失败');
    }
  });
}

main();
`;
}

// 生成 Rust 客户端
function genRust(cfg: ObfuscatedConfig, opts: ClientGenOptions): string {
  const name = (opts.appName || 'myapp').replace(/\s/g, '_').toLowerCase();
  const snip = decryptionSnippets(cfg.appKey);
  return `// ${name} - CDK 卡密验证客户端
// ${opts.appDescription || '自动生成的验证客户端'}
// 版本: ${opts.appVersion || '1.0.0'}
//
// Cargo.toml 依赖:
// [dependencies]
// reqwest = { version = "0.12", features = ["json", "blocking"] }
// sha2 = "0.10"
// hmac = "0.12"
// aes = "0.8"
// cbc = "0.1"
// base64 = "0.22"
// rand = "0.8"
// serde = { version = "1", features = ["derive"] }
// serde_json = "1"
// uuid = { version = "1", features = ["v4"] }
// hex = "0.4"
//
// 编译: cargo build --release

use std::collections::HashMap;
use std::fs;
use std::io::{self, Write};
use std::process::Command;
use std::thread;
use std::time::Duration;

use aes::Aes256;
use aes::cipher::{BlockDecrypt, BlockEncrypt, KeyInit};
use aes::cipher::generic_array::GenericArray;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use cbc::Decryptor;
use cbc::cipher::BlockDecryptMut;
use cbc::cipher::KeyIvInit;
use hmac::{Hmac, Mac};
use rand::Rng;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Sha256, Digest};
use hex;
use lazy_static::lazy_static;

type HmacSha256 = Hmac<Sha256>;

// ===== 加密常量（运行时解密） =====
${snip.rust}

const APP_KEY_ENC: &str = "${cfg.appKeyEnc}";
const APP_SECRET_ENC: &str = "${cfg.appSecretEnc}";
const API_BASE_ENC: &str = "${cfg.apiBaseEnc}";

lazy_static::lazy_static! {
    static ref APP_KEY: String = _d(APP_KEY_ENC);
    static ref APP_SECRET: String = _d(APP_SECRET_ENC);
    static ref API_BASE: String = _d(API_BASE_ENC);
}

const HEARTBEAT_INTERVAL: u64 = 60;
const STATE_FILE: &str = "cdk_state.dat";

fn get_hardware_info() -> String {
    let mut parts = vec![
        hostname::get().unwrap().to_string_lossy().to_string(),
        std::env::consts::ARCH.to_string(),
        std::env::consts::OS.to_string(),
    ];
    if cfg!(windows) {
        if let Ok(out) = Command::new("wmic").args(["cpu", "get", "ProcessorId"]).output() {
            parts.push(String::from_utf8_lossy(&out.stdout).to_string());
        }
    } else if let Ok(data) = fs::read_to_string("/etc/machine-id") {
        parts.push(data);
    }
    parts.join("|")
}

fn sha256(data: &str) -> Vec<u8> { Sha256::digest(data.as_bytes()).to_vec() }
fn sha256_hex(data: &str) -> String { hex::encode(sha256(data)) }
fn hmac_sha256_hex(key: &[u8], data: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(key).unwrap();
    mac.update(data.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

fn aes_cbc_decrypt(encrypted_b64: &str, iv_b64: &str, key: &[u8]) -> String {
    let ct = BASE64.decode(encrypted_b64).unwrap();
    let iv = BASE64.decode(iv_b64).unwrap();
    type Aes256Cbc = Decryptor<Aes256>;
    let cipher = Aes256Cbc::new_from_slices(key, &iv).unwrap();
    let mut buf = ct.clone();
    let decrypted = cipher.decrypt_padded_mut::<aes::cipher::block_padding::Pkcs7>(&mut buf).unwrap();
    String::from_utf8(decrypted.to_vec()).unwrap()
}

fn aes_gcm_encrypt(data: &Value, hw: &str) -> String {
    use aes_gcm::{Aes256Gcm, KeyInit, aead::Aead, Nonce};
    let key = sha256(hw);
    let cipher = Aes256Gcm::new_from_slice(&key).unwrap();
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let plain = serde_json::to_string(data).unwrap();
    let ct = cipher.encrypt(nonce, plain.as_bytes()).unwrap();
    let mut result = nonce_bytes.to_vec();
    result.extend_from_slice(&ct);
    BASE64.encode(result)
}

fn aes_gcm_decrypt(blob_b64: &str, hw: &str) -> Value {
    use aes_gcm::{Aes256Gcm, KeyInit, aead::Aead, Nonce};
    let key = sha256(hw);
    let raw = BASE64.decode(blob_b64).unwrap();
    let cipher = Aes256Gcm::new_from_slice(&key).unwrap();
    let nonce = Nonce::from_slice(&raw[..12]);
    let decrypted = cipher.decrypt(nonce, &raw[12..]).unwrap();
    serde_json::from_slice(&decrypted).unwrap()
}

fn api_post(path: &str, body: &Value) -> Value {
    let client = Client::new();
    let ts = chrono::Utc::now().timestamp_millis().to_string();
    let nonce = uuid::Uuid::new_v4().to_string()[..8].to_string();
    let sign = hmac_sha256_hex(&sha256(APP_SECRET), &format!("{}|{}|{}", ts, nonce, path));
    let resp = client.post(format!("{}{}", API_BASE, path))
        .header("Content-Type", "application/json")
        .header("X-App-Key", APP_KEY)
        .header("X-Timestamp", &ts)
        .header("X-Nonce", &nonce)
        .header("X-Signature", &sign)
        .json(body)
        .send().unwrap();
    resp.json().unwrap()
}

fn verify_card(card_key: &str) -> bool {
    let hw = sha256_hex(&get_hardware_info());

    let ch_resp = api_post("/verify/challenge", &json!({}));
    let challenge = ch_resp["data"]["challenge"].as_str().unwrap();

    let hw_info = get_hardware_info();
    let resp = api_post("/verify/activate", &json!({
        "cardKey": card_key,
        "username": hw,
        "hardwareInfo": hw_info,
        "challengeResponse": hmac_sha256_hex(&sha256(challenge), &hw_info),
    }));

    if resp["code"].as_i64().unwrap() != 0 {
        println!("激活失败: {}", resp["message"]);
        return false;
    }

    let enc = &resp["data"];
    let secret_key = sha256(challenge);
    let decrypted = aes_cbc_decrypt(enc["encrypted"].as_str().unwrap(), enc["iv"].as_str().unwrap(), &secret_key);
    let result: Value = serde_json::from_str(&decrypted).unwrap();

    let state = aes_gcm_encrypt(&json!({
        "uid": result["userId"],
        "hw": hw,
        "tk": result["heartbeatToken"],
        "exp": result.get("expiresAt"),
    }), &hw);

    fs::write(STATE_FILE, state).unwrap();
    println!("激活成功! 用户ID: {}", result["userId"]);
    true
}

fn heartbeat() -> bool {
    if !std::path::Path::new(STATE_FILE).exists() { return false; }
    let hw = sha256_hex(&get_hardware_info());
    let state = aes_gcm_decrypt(&fs::read_to_string(STATE_FILE).unwrap(), &hw);

    let resp = api_post("/verify/heartbeat", &json!({
        "userId": state["uid"],
        "heartbeatToken": state["tk"],
    }));
    resp["code"].as_i64().unwrap() == 0
}

fn main() {
    print!("请输入卡密: ");
    io::stdout().flush().unwrap();
    let mut card = String::new();
    io::stdin().read_line(&mut card).unwrap();
    let card = card.trim();
    if card.is_empty() { println!("卡密不能为空"); return; }

    if verify_card(card) {
        println!("验证成功，开始心跳...");
        thread::spawn(|| {
            loop {
                thread::sleep(Duration::from_secs(HEARTBEAT_INTERVAL));
                if !heartbeat() { println!("心跳失败"); std::process::exit(1); }
            }
        });
        println!("按 Enter 退出...");
        let mut _s = String::new();
        io::stdin().read_line(&mut _s).unwrap();
    } else {
        println!("验证失败");
    }
}
`;
}

// 语言模板映射
type TemplateFn = (cfg: ObfuscatedConfig, opts: ClientGenOptions) => string;

const TEMPLATES: Record<ClientLang, TemplateFn> = {
  python: genPython,
  csharp: genCSharp,
  java: genJava,
  go: genGo,
  nodejs: genNodeJS,
  rust: genRust,
  cpp: genPython, // C++ 暂用 Python 模板
  php: genPython,
  ruby: genPython,
  swift: genPython,
  kotlin: genPython,
  dart: genPython,
  lua: genPython,
  shell: genPython,
};

// 语言元数据
export const LANG_META: Record<ClientLang, { label: string; ext: string; icon: string }> = {
  python:  { label: 'Python',     ext: '.py',   icon: '🐍' },
  csharp:  { label: 'C# (.NET)',  ext: '.cs',   icon: '🔷' },
  java:    { label: 'Java',       ext: '.java', icon: '☕' },
  go:      { label: 'Go',         ext: '.go',   icon: '🔵' },
  nodejs:  { label: 'Node.js',    ext: '.js',   icon: '💚' },
  rust:    { label: 'Rust',       ext: '.rs',   icon: '🦀' },
  cpp:     { label: 'C++',        ext: '.cpp',  icon: '⚙️' },
  php:     { label: 'PHP',        ext: '.php',  icon: '🐘' },
  ruby:    { label: 'Ruby',       ext: '.rb',   icon: '💎' },
  swift:   { label: 'Swift',      ext: '.swift',icon: '🍎' },
  kotlin:  { label: 'Kotlin',     ext: '.kt',   icon: '📱' },
  dart:    { label: 'Dart',       ext: '.dart', icon: '🎯' },
  lua:     { label: 'Lua',        ext: '.lua',  icon: '🌙' },
  shell:   { label: 'Shell',      ext: '.sh',   icon: '💻' },
};

export function generateClientCode(
  appKey: string,
  appSecret: string,
  apiBase: string,
  opts: ClientGenOptions,
): string {
  const cfg = obfuscateConfig(appKey, appSecret, apiBase);
  const gen = TEMPLATES[opts.lang];
  return gen(cfg, opts);
}