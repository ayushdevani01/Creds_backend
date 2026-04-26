import { Worker } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import { publish_to_twitter } from './twitter.handler';
import { update_parent_post_status } from './utils';

const worker = new Worker('publish', async (job) => {
  console.log(`Processing job ${job.id}: ${job.name} (attempt ${job.attemptsMade + 1})`);

  const pp = await prisma.platform_posts.findUnique({
    where: { id: job.data.platform_post_id },
    select: { status: true }
  });
  if (pp?.status === 'cancelled') {
    console.log(`Skipping cancelled job ${job.id}`);
    return;
  }

  await prisma.platform_posts.update({
    where: { id: job.data.platform_post_id },
    data: { status: 'processing', attempts: job.attemptsMade + 1 },
  });

  switch (job.name) {
    case 'twitter':
      return publish_to_twitter(job.data);
    case 'linkedin':
    case 'instagram':
    case 'threads':
      return scaffolded_publish(job.data, job.name);
    default:
      throw new Error(`Unknown platform: ${job.name}`);
  }
}, {
  connection: redis,
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      return Math.pow(5, attemptsMade - 1) * 1000;
    },
  },
});

async function scaffolded_publish(data: any, platform: string) {
  console.log(`[SCAFFOLDED] Would publish to ${platform}:`, data.content?.slice(0, 50));

  await prisma.platform_posts.update({
    where: { id: data.platform_post_id },
    data: {
      status: 'published',
      published_at: new Date(),
      external_id: `scaffolded_${Date.now()}`,
    },
  });

  await update_parent_post_status(data.platform_post_id);
}

worker.on('completed', (job) => {
  console.log(`Job ${job.id} (${job.name}) completed`);
});

worker.on('failed', async (job, err) => {
  console.error(`Job ${job?.id} (${job?.name}) failed attempt ${job?.attemptsMade}:`, err.message);

  if (job) {
    const max_attempts = job.opts.attempts || 1;
    const is_final_failure = job.attemptsMade >= max_attempts;

    if (is_final_failure) {
      await prisma.platform_posts.update({
        where: { id: job.data.platform_post_id },
        data: {
          status: 'failed',
          error_message: err.message,
          attempts: job.attemptsMade,
        },
      });

      await update_parent_post_status(job.data.platform_post_id);
    }
  }
});

console.log('Worker started, listening for publish jobs...');
