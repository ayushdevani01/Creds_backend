import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';
import { send_error } from '../utils/response';

// General API rate limit
export const api_limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).user?.id || req.ip,
  store: new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
    prefix: 'rl:api:',
  }),
  handler: (req, res) => {
    send_error(res, 'Too many requests. Please try again later.', 429);
  },
});

// Strict limit for auth endpoints (prevent brute force)
export const auth_limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => (req as any).user?.id || req.ip,
  store: new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
    prefix: 'rl:auth:',
  }),
  handler: (req, res) => {
    send_error(res, 'Too many auth attempts. Please try again later.', 429);
  },
});

// Content generation limit (AI calls are expensive)
export const generate_limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  keyGenerator: (req) => (req as any).user?.id || req.ip,
  store: new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
    prefix: 'rl:gen:',
  }),
  handler: (req, res) => {
    send_error(res, 'Content generation rate limit exceeded. Try again later.', 429);
  },
});
