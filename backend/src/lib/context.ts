import { AsyncLocalStorage } from 'node:async_hooks';
import type { PrismaClient } from '@prisma/client';

/**
 * Per-request ambient context.
 *
 * Workers have no process-wide globals to hang config off — `env` is handed to
 * the fetch handler and nothing else. Rather than thread a client and a config
 * bag through every controller signature, the entry point opens a store for the
 * duration of the request and everything below reads from it.
 *
 * Reads outside a request (module top level) throw, which is the point: it
 * turns "captured a stale client across isolates" into a loud error instead of
 * a leak.
 */
export interface RequestContext {
  db: PrismaClient;
  env: WorkerEnv;
  /** Defer work past the response — used for fire-and-forget writes. */
  waitUntil: (promise: Promise<unknown>) => void;
}

/** Every binding and secret the app reads. Mirrors wrangler.jsonc + secrets. */
export interface WorkerEnv {
  // Bindings
  ATTACHMENTS: R2Bucket;
  API_RATE_LIMIT: RateLimit;
  AI_RATE_LIMIT: RateLimit;
  AUTH_RATE_LIMIT: RateLimit;

  // Required secrets
  DATABASE_URL: string;
  JWT_SECRET: string;
  /** Supabase project URL, e.g. https://xxxx.supabase.co — its public JWKS
   *  verifies the tokens Supabase Auth issues. Not a secret. */
  SUPABASE_URL: string;

  // Vars
  FRONTEND_URL: string;
  PUBLIC_API_URL: string;

  // Optional secrets — features degrade gracefully when unset.
  ANTHROPIC_API_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_FROM_NAME?: string;
  INBOUND_WEBHOOK_SECRET?: string;
  MAX_UPLOAD_BYTES?: string;
  CAMPAIGN_DAY_MS?: string;
  CAMPAIGN_BATCH_SIZE?: string;
  CAMPAIGN_SCHEDULER?: string;
  /** Local dev only: when 'true', exposes POST /api/auth/dev-login. */
  DEV_AUTH_BYPASS?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Run `fn` with the given context available to everything it awaits. */
export const runWithContext = <T>(ctx: RequestContext, fn: () => T): T =>
  storage.run(ctx, fn);

export const getContext = (): RequestContext => {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      'No request context. Prisma and env are only available inside a request or scheduled run.'
    );
  }
  return ctx;
};

export const getEnv = (): WorkerEnv => getContext().env;

/**
 * The database client for the current request.
 *
 * Exported as a Proxy so existing `import { prisma } from '../lib/prisma'`
 * call sites keep working unchanged — the lookup happens per property access,
 * at which point a request context exists.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getContext().db, prop, receiver);
  }
});
