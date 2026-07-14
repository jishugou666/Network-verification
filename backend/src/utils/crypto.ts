import crypto from 'crypto';
import { config } from '../config';

// ==================== AES-256-GCM 加密/解密（AppSecret 存储） ====================
// 加密密钥从环境变量读取，32 字节 hex 字符串
// 加密流程：随机生成 12 字节 IV → AES-256-GCM 加密 → 输出 IV:ciphertext:authTag (hex)

function getAesKey(): Buffer {
  const keyHex = config.aesEncryptionKey;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(`AES_ENCRYPTION_KEY 必须是 64 字符 hex 字符串（32 字节），当前长度: ${keyHex.length}`);
  }
  return Buffer.from(keyHex, 'hex');
}

/** AES-256-GCM 加密，返回 hex 编码的 IV:密文:认证标签 */
export function aesEncrypt(plaintext: string): string {
  const key = getAesKey();
  const iv = crypto.randomBytes(12); // GCM 推荐 12 字节 IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // 格式：iv(24 hex) + ciphertext(hex) + authTag(32 hex)
  return iv.toString('hex') + ':' + encrypted.toString('hex') + ':' + authTag.toString('hex');
}

/** AES-256-GCM 解密 */
export function aesDecrypt(encryptedData: string): string {
  const key = getAesKey();
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('加密数据格式错误');
  const iv = Buffer.from(parts[0], 'hex');
  const ciphertext = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

// ==================== AES-256-CBC 加密（客户端响应加密） ====================
// 密钥由 challenge 字符串 SHA-256 派生，每次验证使用不同密钥

/** 从 challenge 字符串派生 AES-256-CBC 密钥 */
export function deriveChallengeKey(challenge: string): Buffer {
  return crypto.createHash('sha256').update(challenge).digest(); // 32 字节
}

/** AES-256-CBC 加密响应数据 */
export function encryptResponse(plaintext: string, challenge: string): { encrypted: string; iv: string } {
  const key = deriveChallengeKey(challenge);
  const iv = crypto.randomBytes(16); // CBC 固定 16 字节 IV
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
  };
}

// ==================== HMAC-SHA256 签名 ====================
// 签名算法：HMAC-SHA256(timestamp + nonce + body, appSecret)
// 所有客户端 API 请求必须携带此签名

export function hmacSign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export function hmacVerify(data: string, signature: string, secret: string): boolean {
  const expected = hmacSign(data, secret);
  // 使用 timingSafeEqual 防止时序攻击
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

// ==================== 随机字符串生成 ====================

/** 生成高强度随机卡密（32 字符，含大小写字母+数字） */
export function generateCardKey(prefix: string = ''): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // 排除易混淆字符 I/l/O/0/1
  let result = '';
  const bytes = crypto.randomBytes(32);
  for (let i = 0; i < 32; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return prefix + result;
}

/** 生成 AppKey（32 字符 hex） */
export function generateAppKey(): string {
  return crypto.randomBytes(16).toString('hex');
}

/** 生成 AppSecret（64 字符 hex） */
export function generateAppSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** 生成 128 位挑战字符串（32 字符 hex） */
export function generateChallenge(): string {
  return crypto.randomBytes(16).toString('hex');
}

/** 生成 Nonce（16 位随机字符串） */
export function generateNonce(): string {
  return crypto.randomBytes(8).toString('hex');
}

// ==================== 设备指纹哈希 ====================
// 服务端统一哈希，客户端仅采集原始硬件信息

/** 根据硬件信息生成设备指纹 SHA-256 */
export function hashDeviceFingerprint(hardwareInfo: string): string {
  // 先对硬件信息规范化：去空格、转小写、排序
  try {
    const info = JSON.parse(hardwareInfo);
    const normalized = JSON.stringify(info, Object.keys(info).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  } catch {
    // 如果无法解析 JSON，直接哈希原始字符串
    return crypto.createHash('sha256').update(hardwareInfo.trim().toLowerCase()).digest('hex');
  }
}

// ==================== AppSecret 脱敏展示 ====================
export function maskSecret(secret: string): string {
  if (secret.length <= 4) return '****';
  return '****' + secret.slice(-4);
}