import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const rootUsername = process.env.ROOT_USERNAME || 'admin';
  const rootPassword = process.env.ROOT_PASSWORD || 'admin123';
  const rootEmail = process.env.ROOT_EMAIL || 'admin@example.com';

  // 检查是否已存在超级管理员
  const existingRoot = await prisma.user.findFirst({ where: { role: 'root' } });
  if (existingRoot) {
    console.log('[Seed] 超级管理员已存在，跳过初始化');
    return;
  }

  const passwordHash = await bcrypt.hash(rootPassword, 12);

  await prisma.user.create({
    data: {
      username: rootUsername,
      passwordHash,
      email: rootEmail,
      role: 'root',
    },
  });

  console.log(`[Seed] 超级管理员已创建: ${rootUsername}`);
}

main()
  .catch((e) => {
    console.error('[Seed] 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });