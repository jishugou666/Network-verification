import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  aesEncryptionKey: (process.env.AES_ENCRYPTION_KEY || '').trim(),
  rootUsername: process.env.ROOT_USERNAME || 'admin',
  rootPassword: process.env.ROOT_PASSWORD || 'admin123',
  rootEmail: process.env.ROOT_EMAIL || 'admin@example.com',
  signatureTimestampTolerance: parseInt(process.env.SIGNATURE_TIMESTAMP_TOLERANCE || '30', 10),
  nonceTtlSeconds: parseInt(process.env.NONCE_TTL_SECONDS || '300', 10),
  rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60', 10),
  allowPublicAgentRegistration: process.env.ALLOW_PUBLIC_AGENT_REGISTRATION === 'true',
  // TiDB TLS 要求
  databaseUrl: process.env.DATABASE_URL || '',
  isProduction: process.env.NODE_ENV === 'production',
};

/** 生产环境禁止使用代码内的开发回退值，缺少关键配置时拒绝启动。 */
export function validateProductionConfig(): void {
  if (!config.isProduction) return;

  const required = ['DATABASE_URL', 'JWT_SECRET', 'AES_ENCRYPTION_KEY', 'ROOT_USERNAME', 'ROOT_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`生产环境缺少必要配置: ${missing.join(', ')}`);
  }
}
