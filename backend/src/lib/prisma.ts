import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { db } from './context';

/**
 * Build a Prisma client for one request.
 *
 * On Workers there is no long-lived process to hang a singleton off: `env`
 * only arrives per request, and a client captured across isolates leaks
 * connections. The entry point creates one per request and puts it in the
 * async context.
 */
export const createPrisma = (connectionString: string): PrismaClient => {
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter, log: ['error'] });
};

/**
 * The current request's client. Re-exported here so the ~15 controllers that
 * already `import { prisma } from '../lib/prisma'` need no change.
 */
export const prisma = db;
