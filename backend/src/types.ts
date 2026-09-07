import type { Context } from 'hono';
import type { WorkerEnv } from './lib/context';

export interface AuthUser {
  userId: string;
  email: string;
  orgId: string;
  role: string;
}

/**
 * Hono context shape used across the app.
 *
 * `user` is set by the authenticate middleware, so any handler mounted behind
 * it can read `c.get('user')` without a null check.
 */
export interface AppBindings {
  Bindings: WorkerEnv;
  Variables: {
    user: AuthUser;
  };
}

export type AppContext = Context<AppBindings>;
