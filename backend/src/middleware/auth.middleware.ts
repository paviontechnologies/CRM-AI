import { createMiddleware } from 'hono/factory';
import { verifyToken } from '../lib/jwt';
import type { AppBindings, AuthUser } from '../types';

export const authenticate = createMiddleware<AppBindings>(async (c, next) => {
  const authHeader = c.req.header('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const claims = await verifyToken<AuthUser & { type?: string }>(authHeader.slice(7));
  // Legacy refresh tokens carried type:'refresh' and no org/role. This API no
  // longer issues them, but one must never open the API if it turns up.
  if (!claims || claims.type === 'refresh' || !claims.userId || !claims.orgId) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  c.set('user', {
    userId: claims.userId,
    email: claims.email,
    orgId: claims.orgId,
    role: claims.role
  });
  await next();
});

export const requireRole = (roles: string[]) =>
  createMiddleware<AppBindings>(async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  });
