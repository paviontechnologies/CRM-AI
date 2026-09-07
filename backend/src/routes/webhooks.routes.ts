import { Hono } from 'hono';
import { inboundEmail } from '../controllers/replies.controller';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

// Public: called by the email provider, authenticated with a shared secret.
router.post('/inbound-email', inboundEmail);

export default router;
