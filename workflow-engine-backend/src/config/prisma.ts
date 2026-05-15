import { createPrismaClient } from '../prisma.js';
import { env } from './env.js';

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient({
    databaseUrl: env.DATABASE_URL,
    accelerateUrl: env.PRISMA_ACCELERATE_URL,
    nodeEnv: env.NODE_ENV,
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
