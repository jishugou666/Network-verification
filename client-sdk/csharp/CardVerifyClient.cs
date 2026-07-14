using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace CardVerify.Client
{
    /// <summary>
    /// 卡密验证系统 C# 客户端 SDK
    /// 使用流程：
    /// 1. 初始化 SDK，传入 AppKey 和 AppSecret
    /// 2. 调用 GetChallenge() 获取挑战字符串
    /// 3. 调用 Activate() 激活卡密
    /// 4. 定期调用 Heartbeat() 维持在线状态
    /// 5. 退出时调用 Logout()
    /// </summary>
    public class CardVerifyClient
    {
        private readonly string _apiBaseUrl;
        private readonly string _appKey;
        private readonly string _appSecret;
        private readonly HttpClient _httpClient;
        private string _userId;
        private string _heartbeatToken;

        public CardVerifyClient(string apiBaseUrl, string appKey, string appSecret)
        {
            _apiBaseUrl = apiBaseUrl.TrimEnd('/');
            _appKey = appKey;
            _appSecret = appSecret;
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("Content-Type", "application/json");
        }

        #region 签名生成

        /// <summary>
        /// 生成请求签名
        /// HMAC-SHA256(timestamp + nonce + bodyJson, appSecret)
        /// </summary>
        private string GenerateSignature(long timestamp, string nonce, string bodyJson)
        {
            var data = timestamp.ToString() + nonce + bodyJson;
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_appSecret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }

        /// <summary>
        /// 生成 16 位随机 nonce（hex 编码）
        /// </summary>
        private string GenerateNonce()
        {
            var bytes = new byte[8];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return BitConverter.ToString(bytes).Replace("-", "").ToLower();
        }

        /// <summary>
        /// 构建签名请求体
        /// </summary>
        private object BuildSignedRequest(Dictionary<string, object> payload)
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var nonce = GenerateNonce();

            // 注入签名参数
            payload["appKey"] = _appKey;
            payload["timestamp"] = timestamp;
            payload["nonce"] = nonce;

            var bodyJson = JsonSerializer.Serialize(payload);
            var signature = GenerateSignature(timestamp, nonce, bodyJson);

            payload["signature"] = signature;
            return payload;
        }

        #endregion

        #region API 调用

        /// <summary>
        /// 发送签名请求
        /// </summary>
        private async Task<JsonElement> SendRequest(string endpoint, Dictionary<string, object> payload)
        {
            var signedPayload = BuildSignedRequest(payload);
            var json = JsonSerializer.Serialize(signedPayload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_apiBaseUrl}/api/client/{endpoint}", content);
            var responseBody = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<JsonElement>(responseBody);
        }

        #endregion

        #region 公开接口

        /// <summary>
        /// 获取挑战字符串
        /// 返回 128 位（32 字符 hex）随机挑战字符串
        /// </summary>
        public async Task<string> GetChallenge()
        {
            var payload = new Dictionary<string, object>();
            var result = await SendRequest("challenge", payload);

            if (result.GetProperty("code").GetInt32() != 0)
            {
                throw new Exception($"获取挑战失败: {result.GetProperty("message").GetString()}");
            }

            return result.GetProperty("data").GetProperty("challenge").GetString();
        }

        /// <summary>
        /// 激活卡密
        /// </summary>
        /// <param name="cardKeyPlain">卡密明文</param>
        /// <param name="username">终端用户自定义用户名</param>
        /// <param name="hardwareInfo">硬件信息 JSON（CPU序列号 + 硬盘序列号 + MAC地址 + 系统版本）</param>
        /// <returns>激活结果，包含 userId、heartbeatToken、过期时间</returns>
        public async Task<ActivateResult> Activate(string cardKeyPlain, string username, string hardwareInfo)
        {
            // 1. 获取挑战
            var challenge = await GetChallenge();

            // 2. 计算挑战响应：HMAC-SHA256(challenge + cardKey + username, appSecret)
            var challengeData = challenge + cardKeyPlain + username;
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_appSecret));
            var challengeHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(challengeData));
            var challengeResponse = challenge + ":" + BitConverter.ToString(challengeHash).Replace("-", "").ToLower();

            // 3. 提交激活请求
            var payload = new Dictionary<string, object>
            {
                ["cardKey"] = cardKeyPlain,
                ["username"] = username,
                ["hardwareInfo"] = hardwareInfo,
                ["challengeResponse"] = challengeResponse
            };

            var result = await SendRequest("activate", payload);

            if (result.GetProperty("code").GetInt32() != 0)
            {
                throw new Exception($"激活失败: {result.GetProperty("message").GetString()}");
            }

            var data = result.GetProperty("data");
            _userId = data.GetProperty("userId").GetString();

            // 解密响应（AES-256-CBC，密钥由 challenge 派生）
            var encrypted = data.GetProperty("encrypted").GetString();
            var iv = data.GetProperty("iv").GetString();
            var decrypted = DecryptResponse(encrypted, iv, challenge);
            var responseData = JsonSerializer.Deserialize<JsonElement>(decrypted);
            _heartbeatToken = responseData.GetProperty("heartbeatToken").GetString();

            return new ActivateResult
            {
                UserId = _userId,
                HeartbeatToken = _heartbeatToken,
                ExpiresAt = responseData.TryGetProperty("expiresAt", out var exp) && exp.ValueKind != JsonValueKind.Null
                    ? exp.GetString() : null,
                MaxDevices = responseData.GetProperty("maxDevices").GetInt32(),
                DeviceCount = responseData.GetProperty("deviceCount").GetInt32(),
            };
        }

        /// <summary>
        /// 心跳验证（单次有效 Token）
        /// 每次调用后旧 Token 失效，返回新 Token
        /// </summary>
        public async Task<HeartbeatResult> Heartbeat()
        {
            if (string.IsNullOrEmpty(_userId) || string.IsNullOrEmpty(_heartbeatToken))
            {
                throw new Exception("请先激活卡密");
            }

            var payload = new Dictionary<string, object>
            {
                ["userId"] = _userId,
                ["heartbeatToken"] = _heartbeatToken
            };

            var result = await SendRequest("heartbeat", payload);

            if (result.GetProperty("code").GetInt32() != 0)
            {
                throw new Exception($"心跳验证失败: {result.GetProperty("message").GetString()}");
            }

            var data = result.GetProperty("data");
            var encrypted = data.GetProperty("encrypted").GetString();
            var iv = data.GetProperty("iv").GetString();

            // 使用新挑战解密（心跳响应包含新 challenge）
            var challenge = await GetChallenge();
            var decrypted = DecryptResponse(encrypted, iv, challenge);
            var responseData = JsonSerializer.Deserialize<JsonElement>(decrypted);
            _heartbeatToken = responseData.GetProperty("heartbeatToken").GetString();

            return new HeartbeatResult
            {
                HeartbeatToken = _heartbeatToken,
                ExpiresAt = responseData.TryGetProperty("expiresAt", out var exp) && exp.ValueKind != JsonValueKind.Null
                    ? exp.GetString() : null,
                ServerTime = responseData.GetProperty("serverTime").GetString(),
            };
        }

        /// <summary>
        /// 登出
        /// </summary>
        public async Task Logout()
        {
            if (string.IsNullOrEmpty(_userId)) return;

            var payload = new Dictionary<string, object>
            {
                ["userId"] = _userId
            };

            await SendRequest("logout", payload);
            _userId = null;
            _heartbeatToken = null;
        }

        #endregion

        #region 响应解密

        /// <summary>
        /// AES-256-CBC 解密响应数据
        /// 密钥 = SHA-256(challenge)
        /// </summary>
        private string DecryptResponse(string encryptedBase64, string ivBase64, string challenge)
        {
            var key = SHA256.HashData(Encoding.UTF8.GetBytes(challenge));
            var encrypted = Convert.FromBase64String(encryptedBase64);
            var iv = Convert.FromBase64String(ivBase64);

            using var aes = Aes.Create();
            aes.Key = key;
            aes.IV = iv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            using var decryptor = aes.CreateDecryptor();
            var decrypted = decryptor.TransformFinalBlock(encrypted, 0, encrypted.Length);
            return Encoding.UTF8.GetString(decrypted);
        }

        #endregion

        #region 硬件信息采集（辅助方法）

        /// <summary>
        /// 采集硬件信息，用于生成设备指纹
        /// 采集内容：CPU 序列号 + 硬盘序列号 + MAC 地址 + 系统版本
        /// 注意：原始信息提交服务端统一哈希，客户端不自行计算指纹
        /// </summary>
        public static string CollectHardwareInfo()
        {
            var info = new Dictionary<string, string>
            {
                ["cpuId"] = Environment.MachineName, // 简化示例，实际使用 WMI 获取
                ["osVersion"] = Environment.OSVersion.ToString(),
                ["machineName"] = Environment.MachineName,
                ["processorCount"] = Environment.ProcessorCount.ToString(),
            };

            return JsonSerializer.Serialize(info);
        }

        #endregion
    }

    #region 结果类

    public class ActivateResult
    {
        public string UserId { get; set; }
        public string HeartbeatToken { get; set; }
        public string ExpiresAt { get; set; }
        public int MaxDevices { get; set; }
        public int DeviceCount { get; set; }
    }

    public class HeartbeatResult
    {
        public string HeartbeatToken { get; set; }
        public string ExpiresAt { get; set; }
        public string ServerTime { get; set; }
    }

    #endregion

    #region 使用示例

    // 使用示例代码：
    //
    // var client = new CardVerifyClient(
    //     "https://your-backend.onrender.com",
    //     "your-app-key",      // 从后台获取
    //     "your-app-secret"    // 从后台获取
    // );
    //
    // // 激活
    // var hardwareInfo = CardVerifyClient.CollectHardwareInfo();
    // var result = await client.Activate("CARD-KEY-PLAINTEXT", "player_123", hardwareInfo);
    // Console.WriteLine($"激活成功! userId={result.UserId}, 过期={result.ExpiresAt}");
    //
    // // 心跳（建议每 60 秒调用一次）
    // while (true)
    // {
    //     await Task.Delay(60000);
    //     try
    //     {
    //         var hb = await client.Heartbeat();
    //         Console.WriteLine($"心跳成功: {hb.ServerTime}");
    //     }
    //     catch (Exception ex)
    //     {
    //         Console.WriteLine($"心跳失败: {ex.Message}");
    //         break;
    //     }
    // }
    //
    // // 登出
    // await client.Logout();

    #endregion
}