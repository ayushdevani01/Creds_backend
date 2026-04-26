import { prisma } from '../config/database';
import { publish_queue } from '../config/queue';
import { PublishJobData } from '../types';

interface CreatePostInput {
  user_id: string;
  idea: string;
  post_type: string;
  tone: string;
  language: string;
  model_used: string;
  tokens_used: number;
  platforms: { platform: string; content: string; hashtags: string[] }[];
  publish_at?: Date;
}

export async function create_and_queue(input: CreatePostInput) {
  const post = await prisma.posts.create({
    data: {
      user_id: input.user_id,
      idea: input.idea,
      post_type: input.post_type,
      tone: input.tone,
      language: input.language,
      model_used: input.model_used,
      tokens_used: input.tokens_used,
      status: 'queued',
      publish_at: input.publish_at || null,
    },
  });

  const platform_posts = [];
  for (const p of input.platforms) {
    const pp = await prisma.platform_posts.create({
      data: {
        post_id: post.id,
        platform: p.platform,
        content: p.content,
        hashtags: p.hashtags,
        status: 'queued',
      },
    });

    const job_data: PublishJobData = {
      platform_post_id: pp.id,
      user_id: input.user_id,
      platform: p.platform,
      content: p.content,
      hashtags: p.hashtags,
    };

    const delay = input.publish_at
      ? Math.max(0, input.publish_at.getTime() - Date.now())
      : 0;

    const job = await publish_queue.add(p.platform, job_data, {
      attempts: 4,
      backoff: { type: 'custom' },
      delay,
    });

    await prisma.platform_posts.update({
      where: { id: pp.id },
      data: { job_id: job.id },
    });

    platform_posts.push(pp);
  }

  return { post, platform_posts };
}
