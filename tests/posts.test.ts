import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/config/database';
import { redis } from '../src/config/redis';

describe('Post Status', () => {
  let token: string;
  let post_id: string;

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  beforeAll(async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: `status-test-${Date.now()}@test.com`, password: 'testpass123', name: 'Status Test' });

    token = reg.body.data.access_token;

    const pub = await request(app)
      .post('/api/posts/publish')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idea: 'Status test post', post_type: 'story', tone: 'casual',
        model_used: 'openai', tokens_used: 50,
        platforms: [{ platform: 'twitter', content: 'Status test', hashtags: [] }],
      });

    post_id = pub.body.data.post.id;
  });

  it('should return post with platform statuses', async () => {
    const res = await request(app)
      .get(`/api/posts/${post_id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(post_id);
    expect(res.body.data.platform_posts).toBeDefined();
    expect(res.body.data.platform_posts[0].platform).toBe('twitter');
  });

  it('should return 404 for non-existent post', async () => {
    const res = await request(app)
      .get('/api/posts/non-existent-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
