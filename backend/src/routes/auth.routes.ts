import { Hono } from 'hono';
import {
  createSession,
  devLogin,
  getMe,
  updateProfile,
  updateOrg,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

// Signup, sign-in, password reset and OAuth all happen in Supabase. The only
// credential-adjacent route left here trades a verified Supabase token for an
// API token, so it keeps the auth rate limiter.
router.post('/session', authLimiter, createSession);

// Dev-only; 404s unless DEV_AUTH_BYPASS=true.
router.post('/dev-login', devLogin);

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);
router.patch('/org', authenticate, updateOrg);

export default router;
