import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as user_service from '../services/user.service';
import * as social_service from '../services/social.service';
import { send_success } from '../utils/response';
import { AuthRequest } from '../types';

const update_profile_schema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  default_tone: z.enum(['professional', 'casual', 'witty', 'authoritative', 'friendly']).optional(),
  default_language: z.string().min(2).max(5).optional(),
});

const add_account_schema = z.object({
  platform: z.enum(['twitter', 'linkedin', 'instagram', 'threads']),
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  handle: z.string().optional(),
});

const ai_keys_schema = z.object({
  openai_key: z.string().optional(),
  anthropic_key: z.string().optional(),
});

export async function get_profile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await user_service.get_profile(req.user!.id);
    return send_success(res, profile);
  } catch (err) { next(err); }
}

export async function update_profile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = update_profile_schema.parse(req.body);
    const profile = await user_service.update_profile(req.user!.id, data);
    return send_success(res, profile);
  } catch (err) { next(err); }
}

export async function add_social_account(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = add_account_schema.parse(req.body);
    const account = await social_service.add_account(req.user!.id, data);
    return send_success(res, account, undefined, 201);
  } catch (err) { next(err); }
}

export async function list_social_accounts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const accounts = await social_service.list_accounts(req.user!.id);
    return send_success(res, accounts);
  } catch (err) { next(err); }
}

export async function delete_social_account(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await social_service.delete_account(req.user!.id, req.params.id);
    return send_success(res, result);
  } catch (err) { next(err); }
}

export async function upsert_ai_keys(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = ai_keys_schema.parse(req.body);
    const result = await social_service.upsert_ai_keys(req.user!.id, data);
    return send_success(res, result);
  } catch (err) { next(err); }
}
