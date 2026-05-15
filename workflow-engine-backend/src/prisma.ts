import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../generated/prisma/client.js';

export * from '../generated/prisma/client.js';

export function createPrismaClient(options: {
  databaseUrl: string;
  accelerateUrl?: string;
  nodeEnv: string;
}): PrismaClient {
  const log: Prisma.LogLevel[] =
    options.nodeEnv === 'development' ? ['query', 'warn', 'error'] : ['error'];

  if (options.accelerateUrl) {
    return new PrismaClient({
      accelerateUrl: options.accelerateUrl,
      log,
    });
  }

  const adapter = new PrismaPg(options.databaseUrl);
  return new PrismaClient({ adapter, log });
}
