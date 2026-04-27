import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as content_service from '../services/content.service';
import { send_success } from '../utils/response';
import { AuthRequest } from '../types';

const generate_schema = z.object({
  idea: z.string().min(5).max(500),
  post_type: z.enum(['announcement', 'thread', 'story', 'promotional', 'educational', 'opinion']),
  platforms: z.array(z.enum(['twitter', 'linkedin', 'instagram', 'threads'])).min(1),
  tone: z.enum(['professional', 'casual', 'witty', 'authoritative', 'friendly']),
  language: z.string().min(2).max(5).default('en'),
  model: z.enum(['openai', 'anthropic', 'gemini']),
});

export async function generate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = generate_schema.parse(req.body);
    const result = await content_service.generate(req.user!.id, data);
    return send_success(res, result);
  } catch (err) { next(err); }
}
