import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { ZodError } from 'zod';

import { createPrisma } from './lib/prisma';
import { runWithContext, type WorkerEnv } from './lib/context';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { runCampaignTick } from './services/campaign.scheduler';
import type { AppBindings } from './types';

import authRoutes from './routes/auth.routes';
import leadsRoutes from './routes/leads.routes';
import campaignsRoutes from './routes/campaigns.routes';
import pipelineRoutes from './routes/pipeline.routes';
import analyticsRoutes from './routes/analytics.routes';
import billingRoutes from './routes/billing.routes';
import teamRoutes from './routes/team.routes';
import adminRoutes from './routes/admin.routes';
import dealsRoutes from './routes/deals.routes';
import tasksRoutes from './routes/tasks.routes';
import notesRoutes from './routes/notes.routes';
import attachmentsRoutes from './routes/attachments.routes';
import notificationsRoutes from './routes/notifications.routes';
import assistantRoutes from './routes/assistant.routes';
import webhooksRoutes from './routes/webhooks.routes';

const app = new Hono<AppBindings>();

app.use('*', logger());
app.use('*', secureHeaders());

// CORS origin comes from env, so the middleware is built per request.
app.use('*', (c, next) =>
  cors({
    origin: c.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  })(c, next)
);

app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'ai-leadgen-api', version: '3.0.0' })
);

// Rate-limit everything under /api (health stays unthrottled for probes).
app.use('/api/*', apiLimiter);

app.route('/api/auth', authRoutes);
app.route('/api/leads', leadsRoutes);
app.route('/api/campaigns', campaignsRoutes);
app.route('/api/pipeline', pipelineRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/billing', billingRoutes);
app.route('/api/team', teamRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/deals', dealsRoutes);
app.route('/api/tasks', tasksRoutes);
app.route('/api/notes', notesRoutes);
app.route('/api/attachments', attachmentsRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/assistant', assistantRoutes);
app.route('/api/webhooks', webhooksRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({ error: err.errors }, 400);
  }
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

/**
 * Open a request-scoped context (Prisma client + env + waitUntil) and run the
 * handler inside it. Everything downstream reads the client through
 * `lib/context`, so no controller has to take env as a parameter.
 */
const withContext = async <T>(
  env: WorkerEnv,
  ctx: ExecutionContext,
  fn: () => T | Promise<T>
): Promise<T> => {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — run `wrangler secret put DATABASE_URL`');
  }
  const db = createPrisma(env.DATABASE_URL);
  return runWithContext(
    { db, env, waitUntil: (p) => ctx.waitUntil(p) },
    fn
  );
};

export default {
  fetch: (request: Request, env: WorkerEnv, ctx: ExecutionContext) =>
    withContext(env, ctx, () => app.fetch(request, env, ctx)),

  /**
   * Cron entry point. Replaces the setInterval the Express build used: Workers
   * have no process to keep a timer alive, so the platform calls this on the
   * schedule declared in wrangler.jsonc.
   */
  scheduled: (event: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) =>
    ctx.waitUntil(withContext(env, ctx, () => runCampaignTick()))
};
