import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/config/database';
import { redis } from '../src/config/redis';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-at-least-32-characters-long';

describe('Auth Middleware', () => {
  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
  const valid_token = jwt.sign(
    { user_id: 'test-user-id', email: 'test@test.com' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const expired_token = jwt.sign(
    { user_id: 'test-user-id', email: 'test@test.com' },
    JWT_SECRET,
    { expiresIn: '0s' }
  );

  it('should pass with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${valid_token}`);

    // May return 404 (user not in DB) but NOT 401
    expect(res.status).not.toBe(401);
  });

  it('should reject expired token', async () => {
    // Wait a moment for token to expire
    await new Promise(r => setTimeout(r, 1100));

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expired_token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('expired');
  });

  it('should reject missing token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Missing');
  });

  it('should reject invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-here');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid');
  });
});
