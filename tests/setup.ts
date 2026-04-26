import { prisma } from '../src/config/database';
import { redis } from '../src/config/redis';

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postly:postly@localhost:5432/postly';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-testing';
process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
process.env.TELEGRAM_BOT_TOKEN = 'test:fake-bot-token';
process.env.OPENAI_API_KEY = 'sk-test-fake-key';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-fake-key';
