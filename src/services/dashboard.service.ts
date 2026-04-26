import { prisma } from '../config/database';

interface PostFilters {
  user_id: string;
  status?: string;
  platform?: string;
  date_from?: string;
  date_to?: string;
  page: number;
  limit: number;
}

export async function list_posts(filters: PostFilters) {
  const where: any = {
    user_id: filters.user_id,
    deleted_at: null, // soft delete filter
  };

  if (filters.status) where.status = filters.status;
  if (filters.date_from || filters.date_to) {
    where.created_at = {};
    if (filters.date_from) where.created_at.gte = new Date(filters.date_from);
    if (filters.date_to) where.created_at.lte = new Date(filters.date_to);
  }

  // If filtering by platform, use a join condition
  let platform_filter: any = undefined;
  if (filters.platform) {
    platform_filter = { some: { platform: filters.platform } };
    where.platform_posts = platform_filter;
  }

  const [posts, total] = await Promise.all([
    prisma.posts.findMany({
      where,
      include: { platform_posts: { select: {
        id: true, platform: true, status: true, published_at: true,
        error_message: true, attempts: true, external_id: true,
      }}},
      orderBy: { created_at: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.posts.count({ where }),
  ]);

  return { posts, total };
}

export async function get_post_detail(user_id: string, post_id: string) {
  const post = await prisma.posts.findFirst({
    where: { id: post_id, user_id, deleted_at: null },
    include: { platform_posts: true },
  });
  return post;
}

export async function get_dashboard_stats(user_id: string) {
  const [total_posts, published, failed, by_platform] = await Promise.all([
    prisma.posts.count({ where: { user_id, deleted_at: null } }),
    prisma.platform_posts.count({
      where: { post: { user_id }, status: 'published' },
    }),
    prisma.platform_posts.count({
      where: { post: { user_id }, status: 'failed' },
    }),
    prisma.platform_posts.groupBy({
      by: ['platform'],
      where: { post: { user_id } },
      _count: { id: true },
    }),
  ]);

  const total_platform_posts = published + failed;
  const success_rate = total_platform_posts > 0
    ? Math.round((published / total_platform_posts) * 100)
    : 0;

  return {
    total_posts,
    published,
    failed,
    success_rate,
    per_platform: by_platform.map(p => ({
      platform: p.platform,
      count: p._count.id,
    })),
  };
}
