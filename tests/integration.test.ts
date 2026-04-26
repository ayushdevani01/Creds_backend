import { prisma } from '../src/config/database';
import bcrypt from 'bcrypt';

describe('Database Integration', () => {
  let user_id: string;

  afterAll(async () => {
    // Cleanup
    if (user_id) {
      await prisma.users.delete({ where: { id: user_id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('should create a user with hashed password', async () => {
    const password_hash = await bcrypt.hash('testpass123', 12);

    const user = await prisma.users.create({
      data: {
        email: `integration-${Date.now()}@test.com`,
        password_hash,
        name: 'Integration Test',
      },
    });

    user_id = user.id;
    expect(user.id).toBeDefined();
    expect(user.email).toContain('integration');
    expect(user.password_hash).not.toBe('testpass123'); // hashed
  });

  it('should create a post with platform_posts', async () => {
    const post = await prisma.posts.create({
      data: {
        user_id,
        idea: 'Integration test post',
        post_type: 'announcement',
        tone: 'professional',
        model_used: 'openai',
        status: 'queued',
        platform_posts: {
          create: [
            { platform: 'twitter', content: 'Test tweet', status: 'queued' },
            { platform: 'linkedin', content: 'Test linkedin post', status: 'queued' },
          ],
        },
      },
      include: { platform_posts: true },
    });

    expect(post.platform_posts).toHaveLength(2);
    expect(post.platform_posts[0].platform).toBeDefined();
  });

  it('should enforce unique email constraint', async () => {
    const password_hash = await bcrypt.hash('testpass', 12);

    await expect(
      prisma.users.create({
        data: { email: `integration-duplicate@test.com`, password_hash, name: 'Dup1' },
      })
    ).resolves.toBeDefined();

    await expect(
      prisma.users.create({
        data: { email: `integration-duplicate@test.com`, password_hash, name: 'Dup2' },
      })
    ).rejects.toThrow();

    // Cleanup
    await prisma.users.deleteMany({ where: { email: 'integration-duplicate@test.com' } });
  });

  it('should update post status to published', async () => {
    const post = await prisma.posts.findFirst({ where: { user_id } });
    if (post) {
      const updated = await prisma.posts.update({
        where: { id: post.id },
        data: { status: 'published' }
      });
      expect(updated.status).toBe('published');
    }
  });
});
