import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const env_schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),

  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY_DAYS: z.coerce.number().default(7),

  ENCRYPTION_KEY: z.string().length(64), // 32 bytes as hex

  TELEGRAM_BOT_TOKEN: z.string(),
  TELEGRAM_WEBHOOK_SECRET: z.string().default(''),
  TELEGRAM_WEBHOOK_URL: z.string().default(''),

  OPENAI_API_KEY: z.string().default(''),
  ANTHROPIC_API_KEY: z.string().default(''),

  TWITTER_CLIENT_ID: z.string().default(''),
  TWITTER_CLIENT_SECRET: z.string().default(''),
  TWITTER_CALLBACK_URL: z.string().default(''),
});

export const env = env_schema.parse(process.env);

// Production safety check: webhook secret must be set
if (env.NODE_ENV === 'production' && !env.TELEGRAM_WEBHOOK_SECRET) {
  throw new Error('TELEGRAM_WEBHOOK_SECRET is required in production to prevent spoofed webhook requests');
}
