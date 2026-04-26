import { prisma } from '../config/database';
import { PublishJobData } from '../types';
import { update_parent_post_status } from './utils';

export async function publish_to_threads(data: PublishJobData): Promise<void> {
  console.log(`[SCAFFOLDED] Threads publish:`, data.content.slice(0, 100));

  await prisma.platform_posts.update({
    where: { id: data.platform_post_id },
    data: {
      status: 'published',
      published_at: new Date(),
      external_id: `threads_scaffolded_${Date.now()}`,
    },
  });

  await update_parent_post_status(data.platform_post_id);
}
