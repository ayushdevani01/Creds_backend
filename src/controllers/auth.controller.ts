import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TwitterApi } from 'twitter-api-v2';
import * as auth_service from '../services/auth.service';
import * as social_service from '../services/social.service';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { send_success } from '../utils/response';
import { AuthRequest } from '../types';

// Validation schemas
const register_schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

const login_schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refresh_schema = z.object({
  refresh_token: z.string().uuid(),
});

const logout_schema = z.object({
  refresh_token: z.string().uuid(),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = register_schema.parse(req.body);
    const result = await auth_service.register(email, password, name);
    return send_success(res, result, undefined, 201);
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = login_schema.parse(req.body);
    const result = await auth_service.login(email, password);
    return send_success(res, result);
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refresh_token } = refresh_schema.parse(req.body);
    const result = await auth_service.refresh(refresh_token);
    return send_success(res, result);
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refresh_token } = logout_schema.parse(req.body);
    await auth_service.logout(refresh_token);
    return send_success(res, { message: 'Logged out successfully' });
  } catch (err) { next(err); }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await auth_service.get_me(req.user!.id);
    return send_success(res, user);
  } catch (err) { next(err); }
}

// Twitter OAuth 2.0
export async function twitter_oauth_start(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const client = new TwitterApi({
      clientId: env.TWITTER_CLIENT_ID,
      clientSecret: env.TWITTER_CLIENT_SECRET,
    });

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      env.TWITTER_CALLBACK_URL,
      { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
    );

    // Store verifier + state + userId in Redis (10 min TTL)
    await redis.set(`twitter_oauth:${state}`, JSON.stringify({
      code_verifier: codeVerifier,
      user_id: req.user!.id
    }), 'EX', 600);

    return send_success(res, { url });
  } catch (err) { next(err); }
}

export async function twitter_oauth_callback(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, state } = req.query;
    if (!code || !state) throw new Error('Missing code or state');

    const stored_json = await redis.get(`twitter_oauth:${state as string}`);
    if (!stored_json) throw new Error('Invalid or expired state');

    const stored = JSON.parse(stored_json);

    const client = new TwitterApi({
      clientId: env.TWITTER_CLIENT_ID,
      clientSecret: env.TWITTER_CLIENT_SECRET,
    });

    const { accessToken, refreshToken } = await client.loginWithOAuth2({
      code: code as string,
      codeVerifier: stored.code_verifier,
      redirectUri: env.TWITTER_CALLBACK_URL,
    });

    // Get Twitter handle
    const twitter_client = new TwitterApi(accessToken);
    const me = await twitter_client.v2.me();

    // Store in social_accounts
    await social_service.add_account(stored.user_id, {
      platform: 'twitter',
      access_token: accessToken,
      refresh_token: refreshToken,
      handle: me.data.username,
    });

    // Clean up redis
    await redis.del(`twitter_oauth:${state as string}`);

    res.send('<h1>Twitter connected successfully! You can close this window.</h1>');
  } catch (err) { next(err); }
}
