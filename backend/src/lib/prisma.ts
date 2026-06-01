import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ||
    `file:${path.join(__dirname, '../../../../packages/database/prisma/dev.db')}`;

  const adapter = new PrismaLibSql({ url: dbUrl });
  return new PrismaClient({ adapter, log: ['error'] });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
