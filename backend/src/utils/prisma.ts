import { PrismaClient } from '@prisma/client';

// 全局单例 Prisma Client，避免 Serverless 冷启动时创建过多连接
// Prisma 连接池适配 Serverless 场景

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}