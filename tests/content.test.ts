import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/config/database';
import { redis } from '../src/config/redis';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-at-least-32-characters-long';
const token = jwt.sign({ user_id: 'test-user', email: 'test@test.com' }, JWT_SECRET, { expiresIn: '15m' });

describe('Content Generation Validation', () => {
  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
  it('should reject missing idea', async () => {
    const res = await request(app)
      .post('/api/content/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ post_type: 'announcement', platforms: ['twitter'], tone: 'witty', model: 'openai' });

    expect(res.status).toBe(400);
  });

  it('should reject idea over 500 chars', async () => {
    const res = await request(app)
      .post('/api/content/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idea: 'x'.repeat(501),
        post_type: 'announcement',
        platforms: ['twitter'],
        tone: 'witty',
        model: 'openai'
      });

    expect(res.status).toBe(400);
  });

  it('should reject invalid platform', async () => {
    const res = await request(app)
      .post('/api/content/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idea: 'Test idea',
        post_type: 'announcement',
        platforms: ['fakebook'],
        tone: 'witty',
        model: 'openai'
      });

    expect(res.status).toBe(400);
  });

  it('should reject empty platforms array', async () => {
    const res = await request(app)
      .post('/api/content/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idea: 'Test idea',
        post_type: 'announcement',
        platforms: [],
        tone: 'witty',
        model: 'openai'
      });

    expect(res.status).toBe(400);
  });
});
