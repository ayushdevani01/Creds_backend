import { prisma } from '../config/database';

export async function update_parent_post_status(platform_post_id: string) {
  const pp = await prisma.platform_posts.findUnique({
    where: { id: platform_post_id },
    select: { post_id: true },
  });
  if (!pp) return;

  const post = await prisma.posts.findUnique({
    where: { id: pp.post_id },
    select: { deleted_at: true },
  });
  if (post?.deleted_at) return;

  const all_pp = await prisma.platform_posts.findMany({
    where: { post_id: pp.post_id },
    select: { status: true },
  });

  const statuses = all_pp.map(p => p.status);

  let new_status: string;
  if (statuses.every(s => s === 'published')) {
    new_status = 'published';
  } else if (statuses.some(s => s === 'failed') && statuses.some(s => s === 'published') && statuses.every(s => s === 'failed' || s === 'published')) {
    new_status = 'partially_failed';
  } else if (statuses.some(s => s === 'processing' || s === 'queued')) {
    new_status = 'processing';
  } else {
    new_status = 'failed';
  }

  await prisma.posts.update({
    where: { id: pp.post_id },
    data: { status: new_status },
  });
}
