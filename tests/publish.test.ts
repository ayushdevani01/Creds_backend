import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/config/database';
import { redis } from '../src/config/redis';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-at-least-32-characters-long';

describe('Publish Queue', () => {
  let token: string;

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  beforeAll(async () => {
    // Register a test user
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: `queue-test-${Date.now()}@test.com`, password: 'testpass123', name: 'Queue Test' });

    token = reg.body.data.access_token;
  });

  it('should create post and queue jobs', async () => {
    const res = await request(app)
      .post('/api/posts/publish')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idea: 'Test post for queue',
        post_type: 'announcement',
        tone: 'professional',
        model_used: 'openai',
        tokens_used: 100,
        platforms: [
          { platform: 'twitter', content: 'Test tweet content', hashtags: ['#test'] },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.post).toBeDefined();
    expect(res.body.data.platform_posts).toHaveLength(1);
    expect(res.body.data.platform_posts[0].status).toBe('queued');
  });
});
