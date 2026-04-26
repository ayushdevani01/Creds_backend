import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as publish_service from '../services/publish.service';
import * as dashboard_service from '../services/dashboard.service';
import { prisma } from '../config/database';
import { publish_queue } from '../config/queue';
import { send_success, send_error } from '../utils/response';
import { AuthRequest } from '../types';

const publish_schema = z.object({
  idea: z.string().min(5).max(500),
  post_type: z.enum(['announcement', 'thread', 'story', 'promotional', 'educational', 'opinion']),
  platforms: z.array(z.object({
    platform: z.enum(['twitter', 'linkedin', 'instagram', 'threads']),
    content: z.string().min(1),
    hashtags: z.array(z.string()).default([]),
  })).min(1),
  tone: z.string(),
  language: z.string().default('en'),
  model_used: z.string(),
  tokens_used: z.number().default(0),
});

const schedule_schema = publish_schema.extend({
  publish_at: z.string().datetime(),
});

export async function publish(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = publish_schema.parse(req.body);
    const result = await publish_service.create_and_queue({
      user_id: req.user!.id,
      ...data,
    });
    return send_success(res, result, undefined, 201);
  } catch (err) { next(err); }
}

export async function schedule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = schedule_schema.parse(req.body);
    const publish_at = new Date(data.publish_at);
    if (publish_at <= new Date()) {
      return send_error(res, 'publish_at must be in the future', 400);
    }
    const result = await publish_service.create_and_queue({
      user_id: req.user!.id,
      ...data,
      publish_at,
    });
    return send_success(res, result, undefined, 201);
  } catch (err) { next(err); }
}

export async function list_posts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const { posts, total } = await dashboard_service.list_posts({
      user_id: req.user!.id,
      status: req.query.status as string,
      platform: req.query.platform as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      page, limit,
    });
    return send_success(res, posts, { total, page, limit });
  } catch (err) { next(err); }
}

export async function get_post(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const post = await dashboard_service.get_post_detail(req.user!.id, req.params.id);
    if (!post) return send_error(res, 'Post not found', 404);
    return send_success(res, post);
  } catch (err) { next(err); }
}

export async function retry_post(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const post = await prisma.posts.findFirst({
      where: { id: req.params.id, user_id: req.user!.id, deleted_at: null },
      include: { platform_posts: { where: { status: 'failed' } } },
    });
    if (!post) return send_error(res, 'Post not found', 404);
    if (post.platform_posts.length === 0) return send_error(res, 'No failed jobs to retry', 400);

    // Re-queue failed platform posts
    for (const pp of post.platform_posts) {
      await prisma.platform_posts.update({
        where: { id: pp.id },
        data: { status: 'queued', error_message: null },
      });

      await publish_queue.add(pp.platform, {
        platform_post_id: pp.id,
        user_id: post.user_id,
        platform: pp.platform,
        content: pp.content,
        hashtags: pp.hashtags,
      }, {
        attempts: 4,
        backoff: { type: 'custom' },
      });
    }

    await prisma.posts.update({
      where: { id: post.id },
      data: { status: 'queued' },
    });

    return send_success(res, { message: 'Failed jobs re-queued', retried: post.platform_posts.length });
  } catch (err) { next(err); }
}

export async function delete_post(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const post = await prisma.posts.findFirst({
      where: { id: req.params.id, user_id: req.user!.id, deleted_at: null },
      include: { platform_posts: true },
    });
    if (!post) return send_error(res, 'Post not found', 404);

    // Check if any platform post is already published or processing
    const has_started = post.platform_posts.some(pp => 
      ['published', 'processing'].includes(pp.status)
    );

    if (has_started) {
      return send_error(res, 'Cannot delete post: publishing has already started or finished.', 400);
    }

    // Soft delete
    await prisma.posts.update({
      where: { id: post.id },
      data: { deleted_at: new Date(), status: 'cancelled' },
    });

    // Cancel queued platform posts
    await prisma.platform_posts.updateMany({
      where: { post_id: post.id, status: 'queued' },
      data: { status: 'cancelled' },
    });

    return send_success(res, { message: 'Post cancelled and deleted' });
  } catch (err) { next(err); }
}

export async function restore_post(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const post = await prisma.posts.findFirst({
      where: { id: req.params.id, user_id: req.user!.id, deleted_at: { not: null } },
    });
    if (!post) return send_error(res, 'Post not found or not deleted', 404);

    await prisma.posts.update({
      where: { id: post.id },
      data: { deleted_at: null, status: 'draft' },
    });

    return send_success(res, { message: 'Post restored' });
  } catch (err) { next(err); }
}
