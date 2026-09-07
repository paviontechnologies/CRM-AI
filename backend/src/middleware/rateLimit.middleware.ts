import { createMiddleware } from 'hono/factory';
import type { AppBindings, AuthUser } from '../types';

/**
 * Rate limiting via Cloudflare's native binding.
 *
 * `express-rate-limit` keeps counters in process memory, which does not exist
 * on Workers. The platform binding keeps them per-colo instead: eventually
 * consistent and deliberately approximate, which is the right trade for abuse
 * blunting. Limits and windows are declared in wrangler.jsonc — the binding
 * only accepts 10s or 60s periods, so the auth limiter's window is 60s with a
 * correspondingly low limit rather than the old 15 minutes.
 */

type LimiterName = 'API_RATE_LIMIT' | 'AI_RATE_LIMIT' | 'AUTH_RATE_LIMIT';

const limiter = (binding: LimiterName, message: string) =>
  createMiddleware<AppBindings>(async (c, next) => {
    const rl = c.env[binding];
    // Missing binding must not take the API down — log and let it through.
    if (!rl) {
      console.warn(`Rate limit binding ${binding} is not configured`);
      return next();
    }

    // Prefer the authenticated user, else the client IP — so one tenant's burst
    // cannot exhaust another's budget on a shared NAT. On public routes
    // (login, register) no user is set yet, hence the IP fallback.
    // Undefined on public routes (login/register), where this middleware runs
    // ahead of authenticate.
    const user = c.get('user') as AuthUser | undefined;
    const key = user?.userId
      ? `user:${user.userId}`
      : `ip:${c.req.header('cf-connecting-ip') || 'unknown'}`;

    const { success } = await rl.limit({ key: `${binding}:${key}` });
    if (!success) return c.json({ error: message }, 429);
    await next();
  });

export const apiLimiter = limiter('API_RATE_LIMIT', 'Too many requests, please slow down.');

export const authLimiter = limiter(
  'AUTH_RATE_LIMIT',
  'Too many attempts. Try again in a few minutes.'
);

export const aiLimiter = limiter('AI_RATE_LIMIT', 'AI request limit reached, please wait a moment.');
