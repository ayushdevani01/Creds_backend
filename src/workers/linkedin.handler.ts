import { prisma } from '../config/database';
import { PublishJobData } from '../types';
import { update_parent_post_status } from './utils';

export async function publish_to_linkedin(data: PublishJobData): Promise<void> {
  console.log(`[SCAFFOLDED] LinkedIn publish:`, data.content.slice(0, 100));

  // In a real implementation:
  // 1. Get LinkedIn OAuth tokens
  // 2. Call LinkedIn API to create a post
  // 3. Store the external post ID

  await prisma.platform_posts.update({
    where: { id: data.platform_post_id },
    data: {
      status: 'published',
      published_at: new Date(),
      external_id: `linkedin_scaffolded_${Date.now()}`,
    },
  });

  await update_parent_post_status(data.platform_post_id);
}
