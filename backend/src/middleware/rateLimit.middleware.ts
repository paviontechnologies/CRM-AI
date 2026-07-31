import rateLimit from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';

// Applied to every /api route. Generous — it only exists to blunt abuse/runaway clients.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProd ? 200 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

// Strict limiter for credential endpoints — the real brute-force surface.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 10 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Only failed attempts count, so a legitimate user isn't locked out by their own success.
  skipSuccessfulRequests: true,
  message: { error: 'Too many attempts. Try again in a few minutes.' }
});

// AI endpoints are expensive (tokens + latency); cap per-minute bursts per client.
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProd ? 20 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'AI request limit reached, please wait a moment.' }
});
