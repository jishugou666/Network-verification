import { createHash } from 'crypto';

/**
 * 客户端代码字符串混淆工具
 * 使用 XOR + Base64 加密敏感字符串，密钥由 appKey 派生（每个程序唯一）
 */

// 从 appKey 派生 16 字节加密密钥
function deriveKey(appKey: string): Buffer {
  return createHash('sha256').update(appKey).digest().slice(0, 16);
}

// XOR 加密 + Base64 编码
export function encryptString(plaintext: string, appKey: string): string {
  const key = deriveKey(appKey);
  const plainBuf = Buffer.from(plaintext, 'utf-8');
  const encrypted = Buffer.alloc(plainBuf.length);
  for (let i = 0; i < plainBuf.length; i++) {
    encrypted[i] = plainBuf[i] ^ key[i % key.length];
  }
  return encrypted.toString('base64');
}

// 生成对应语言的解密函数代码
export function decryptionSnippets(appKey: string): Record<string, string> {
  const keyHex = deriveKey(appKey).toString('hex');
  const keyLen = 16;

  return {
    // Python 解密函数
    python: `
def _d(enc: str) -> str:
    """解密敏感字符串"""
    import base64
    k = bytes.fromhex('${keyHex}')
    data = base64.b64decode(enc)
    return ''.join(chr(b ^ k[i % ${keyLen}]) for i, b in enumerate(data))`,

    // Go 解密函数
    go: `
// _d 解密敏感字符串
func _d(enc string) string {
    k, _ := hex.DecodeString("${keyHex}")
    data, _ := base64.StdEncoding.DecodeString(enc)
    for i := range data {
        data[i] ^= k[i%${keyLen}]
    }
    return string(data)
}`,

    // C# 解密函数
    csharp: `
// _d 解密敏感字符串
static string _d(string enc) {
    byte[] k = Convert.FromHexString("${keyHex}");
    byte[] data = Convert.FromBase64String(enc);
    for (int i = 0; i < data.Length; i++) data[i] ^= k[i % ${keyLen}];
    return Encoding.UTF8.GetString(data);
}`,

    // Java 解密函数
    java: `
    private static String _d(String enc) {
        byte[] k = hexToBytes("${keyHex}");
        byte[] data = Base64.getDecoder().decode(enc);
        for (int i = 0; i < data.length; i++) data[i] ^= k[i % ${keyLen}];
        return new String(data, StandardCharsets.UTF_8);
    }`,

    // Rust 解密函数
    rust: `
fn _d(enc: &str) -> String {
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    let k = hex::decode("${keyHex}").unwrap();
    let mut data = STANDARD.decode(enc).unwrap();
    for (i, b) in data.iter_mut().enumerate() { *b ^= k[i % ${keyLen}]; }
    String::from_utf8(data).unwrap()
}`,

    // Node.js 解密函数
    nodejs: `
function _d(enc) {
    const k = Buffer.from('${keyHex}', 'hex');
    const data = Buffer.from(enc, 'base64');
    for (let i = 0; i < data.length; i++) data[i] ^= k[i % ${keyLen}];
    return data.toString('utf8');
}`,
  };
}

// 批量加密客户端敏感字符串
export interface ObfuscatedConfig {
  appKeyEnc: string;
  appSecretEnc: string;
  apiBaseEnc: string;
  appKey: string;    // 原始值（用于派生密钥）
  appSecret: string;
  apiBase: string;
}

export function obfuscateConfig(appKey: string, appSecret: string, apiBase: string): ObfuscatedConfig {
  return {
    appKeyEnc: encryptString(appKey, appKey),
    appSecretEnc: encryptString(appSecret, appKey),
    apiBaseEnc: encryptString(apiBase, appKey),
    appKey,
    appSecret,
    apiBase,
  };
}